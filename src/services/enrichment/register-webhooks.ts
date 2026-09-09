import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {
    type Connection,
    createWebhookHandler,
    deleteWebhookHandler,
    kv,
    updateWebhookHandler,
} from "attio/server"
import {z} from "zod"
import type {LemlistWebhook} from "../../lemlist-api/schemas"
import type {LemlistApiError} from "../../lemlist-api/transport/error"
import {createWebhook, listWebhooks} from "../../lemlist-api/webhooks"
import {createLogger} from "../../common/logger"
import {deleteOrphanedEnrichmentWebhooksFrom, CLEANUP_TIME_BUDGET_MS} from "./orphaned-webhooks"

const logger = createLogger("enrichment webhooks")

export const ENRICHMENT_WEBHOOK_HANDLER_FILE_NAME = "enrichment"

const ENRICHMENT_EVENT_TYPES = ["enrichmentDone", "enrichmentError"] as const

type EnrichmentEventType = (typeof ENRICHMENT_EVENT_TYPES)[number]

const REGISTERED_WEBHOOKS_KEY = "enrichment-webhooks"
const VERIFIED_AT_KEY = "enrichment-webhooks-verified-at"

/**
 * A bulk record action starts hundreds of runs at once. Listing hooks on every one would
 * trip Attio's 30 req/s egress limit, so a list is reused for a minute.
 */
const VERIFY_TTL_MS = 60_000

const RegisteredWebhookSchema = z.object({
    eventType: z.enum(ENRICHMENT_EVENT_TYPES),
    handlerId: z.string(),
    lemlistWebhookId: z.string(),
})

const RegisteredWebhooksSchema = z.array(RegisteredWebhookSchema)

type RegisteredWebhook = z.infer<typeof RegisteredWebhookSchema>

async function readRegisteredWebhooks(): Promise<RegisteredWebhook[]> {
    const stored = await kv.get(REGISTERED_WEBHOOKS_KEY)

    if (stored === null) {
        return []
    }

    const parsed = RegisteredWebhooksSchema.safeParse(stored.value)

    if (!parsed.success) {
        // Treating this as "nothing registered" re-registers both webhooks. The old pair
        // becomes untracked litter, so this failure needs to be visible.
        logger.error("Could not read registered enrichment webhooks, registering again")
        return []
    }

    return parsed.data
}

async function writeRegisteredWebhooks(webhooks: RegisteredWebhook[]): Promise<void> {
    await kv.set(REGISTERED_WEBHOOKS_KEY, webhooks)
    await kv.set(VERIFIED_AT_KEY, Date.now())
}

function eventTypesMissingFrom(webhooks: readonly RegisteredWebhook[]): EnrichmentEventType[] {
    return ENRICHMENT_EVENT_TYPES.filter(
        (eventType) => !webhooks.some((webhook) => webhook.eventType === eventType)
    )
}

function isRecentTimestamp(value: unknown): boolean {
    return typeof value === "number" && Date.now() - value < VERIFY_TTL_MS
}

function trackedIdsOf(webhooks: readonly RegisteredWebhook[]): ReadonlySet<string> {
    return new Set(webhooks.map((webhook) => webhook.lemlistWebhookId))
}

export function retainLiveEnrichmentWebhooks<T extends {lemlistWebhookId: string}>(
    registered: readonly T[],
    listed: readonly LemlistWebhook[]
): T[] {
    const liveIds = new Set(
        listed.filter((webhook) => webhook.disabled !== true).map((webhook) => webhook._id)
    )

    return registered.filter((webhook) => liveIds.has(webhook.lemlistWebhookId))
}

async function listAndSweepOrphans(
    registered: readonly RegisteredWebhook[],
    connection?: Connection
): Promise<LemlistWebhook[] | null> {
    const listed = await listWebhooks(connection)

    if (isErrored(listed)) {
        logger.error("Could not check enrichment webhooks against lemlist")
        return null
    }

    await kv.set(VERIFIED_AT_KEY, Date.now())

    await deleteOrphanedEnrichmentWebhooksFrom({
        webhooks: listed.value,
        trackedIds: trackedIdsOf(registered),
        connection,
    })

    return listed.value
}

/** Lists at most once a minute and drops stored ids lemlist is no longer delivering to. */
async function dropDeadRegistrations({
    registered,
    connection,
}: {
    registered: RegisteredWebhook[]
    connection?: Connection
}): Promise<RegisteredWebhook[]> {
    const verifiedAt = await kv.get(VERIFIED_AT_KEY)
    if (isRecentTimestamp(verifiedAt?.value)) {
        return registered
    }

    const listed = await listAndSweepOrphans(registered, connection)
    if (!listed) {
        return registered
    }

    const live = retainLiveEnrichmentWebhooks(registered, listed)

    if (live.length !== registered.length) {
        logger.log("A stored enrichment webhook is missing or disabled, will register again")
        await writeRegisteredWebhooks(live)
    }

    return live
}

async function createHandlerAndWebhook({
    connection,
    eventType,
}: {
    connection?: Connection
    eventType: EnrichmentEventType
}): AsyncResult<RegisteredWebhook, LemlistApiError> {
    const handler = await createWebhookHandler({fileName: ENRICHMENT_WEBHOOK_HANDLER_FILE_NAME})

    const webhookResult = await createWebhook({targetUrl: handler.url, type: eventType}, connection)

    if (isErrored(webhookResult)) {
        await deleteWebhookHandler(handler.id)
        return webhookResult
    }

    await updateWebhookHandler(handler.id, {externalWebhookId: webhookResult.value._id})

    return complete({
        eventType,
        handlerId: handler.id,
        lemlistWebhookId: webhookResult.value._id,
    })
}

async function registerWebhookForEvent({
    connection,
    eventType,
    trackedIds,
}: {
    connection?: Connection
    eventType: EnrichmentEventType
    trackedIds: ReadonlySet<string>
}): AsyncResult<RegisteredWebhook, LemlistApiError> {
    const firstAttempt = await createHandlerAndWebhook({connection, eventType})

    // A conflict is either the 200-webhook limit or a target URL already in use.
    // Clearing orphans fixes the first and does no harm in the second.
    if (!isErrored(firstAttempt) || firstAttempt.error.code !== "CONFLICT") {
        return firstAttempt
    }

    logger.log(`lemlist rejected the ${eventType} webhook, freeing up room before retrying`)

    const listed = await listWebhooks(connection)

    if (isErrored(listed)) {
        logger.error("Could not check enrichment webhooks before retrying")
    } else {
        await deleteOrphanedEnrichmentWebhooksFrom({webhooks: listed.value, trackedIds, connection})
    }

    return createHandlerAndWebhook({connection, eventType})
}

async function createMissingWebhooks({
    existing,
    connection,
}: {
    existing: RegisteredWebhook[]
    connection?: Connection
}): AsyncResult<void, LemlistApiError> {
    const missingEventTypes = eventTypesMissingFrom(existing)

    if (missingEventTypes.length === 0) {
        return complete(undefined)
    }

    const webhooks = [...existing]

    for (const eventType of missingEventTypes) {
        const result = await registerWebhookForEvent({
            connection,
            eventType,
            trackedIds: trackedIdsOf(webhooks),
        })

        if (isErrored(result)) {
            // Save what did work so the next call only retries what is missing.
            await writeRegisteredWebhooks(webhooks)
            logger.error(`Failed to register the ${eventType} webhook`)
            return result
        }

        webhooks.push(result.value)
        logger.log(`Registered the ${eventType} webhook`)
    }

    await writeRegisteredWebhooks(webhooks)

    return complete(undefined)
}

async function waitForOtherRunToRegister(): AsyncResult<void, LemlistApiError> {
    logger.log("Enrichment webhooks are already being registered, waiting")
    // The other run may spend the full sweep budget before it writes KV.
    await new Promise((resolve) => setTimeout(resolve, CLEANUP_TIME_BUDGET_MS))

    const registered = await readRegisteredWebhooks()
    if (eventTypesMissingFrom(registered).length === 0) {
        return complete(undefined)
    }

    return errored({
        code: "RETRY",
        detail: "enrichment webhooks are being registered",
    })
}

async function registerAppWebhooks({
    registered,
    connection,
}: {
    registered: RegisteredWebhook[]
    connection?: Connection
}): AsyncResult<void, LemlistApiError> {
    const verifiedAt = await kv.get(VERIFIED_AT_KEY)
    if (isRecentTimestamp(verifiedAt?.value)) {
        return waitForOtherRunToRegister()
    }

    await kv.set(VERIFIED_AT_KEY, Date.now())

    const listed = await listAndSweepOrphans(registered, connection)
    const live = listed ? retainLiveEnrichmentWebhooks(registered, listed) : registered

    return createMissingWebhooks({existing: live, connection})
}

export async function ensureEnrichmentWebhooks(
    connection?: Connection
): AsyncResult<void, LemlistApiError> {
    const registered = await readRegisteredWebhooks()

    if (eventTypesMissingFrom(registered).length > 0) {
        return registerAppWebhooks({registered, connection})
    }

    const live = await dropDeadRegistrations({registered, connection})

    return createMissingWebhooks({existing: live, connection})
}
