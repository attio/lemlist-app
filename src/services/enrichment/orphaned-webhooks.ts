import {isErrored} from "@attio/fetchable"
import type {Connection} from "attio/server"
import type {LemlistWebhook} from "../../lemlist-api/schemas"
import {deleteWebhook} from "../../lemlist-api/webhooks"
import {createLogger} from "../../common/logger"

const logger = createLogger("enrichment webhooks")

/** Every Attio callback URL is served from this host. */
const ATTIO_CALLBACK_HOSTNAME = "hooks.attio.com"

/**
 * Each delete is one request and a littered account can hold ~200 webhooks, which would
 * run past the 30s server timeout. Stop early and let the next call carry on.
 */
export const CLEANUP_TIME_BUDGET_MS = 10_000

/**
 * lemlist allows 20 requests per 2s per API key, shared with every other call this
 * install makes. Spacing deletes at that rate keeps a big sweep from tripping it, rather
 * than leaning on the transport layer's retry-with-backoff for every single one.
 */
const DELETE_REQUEST_SPACING_MS = 110

/**
 * A run that just created this webhook may not have written it to KV yet. A retry of the
 * same block does not extend this: it only waits and rereads KV, it never creates on the
 * original run's behalf, so a webhook can only ever be written by the single run that
 * created it. That bounds the wait to one 30s server timeout, not the retry sequence.
 */
const DUPLICATE_GRACE_MS = 30_000

function isAttioCallbackUrl(targetUrl: string): boolean {
    try {
        return new URL(targetUrl).hostname === ATTIO_CALLBACK_HOSTNAME
    } catch {
        return false
    }
}

/** The `{workspaceId}` segment of an Attio app-webhook-handler URL (`/a/{workspaceId}/...`). */
function workspaceIdFromTargetUrl(targetUrl: string): string | null {
    try {
        const [, prefix, workspaceId] = new URL(targetUrl).pathname.split("/")
        return prefix === "a" ? (workspaceId ?? null) : null
    } catch {
        return null
    }
}

function isEnrichmentWebhook(webhook: LemlistWebhook): boolean {
    return (
        (webhook.type === "enrichmentDone" || webhook.type === "enrichmentError") &&
        isAttioCallbackUrl(webhook.targetUrl)
    )
}

/** Disabled enrichment webhook on an Attio host. Enabled ones may still belong to a live run. */
export function isOrphanedEnrichmentWebhook(webhook: LemlistWebhook): boolean {
    return isEnrichmentWebhook(webhook) && webhook.disabled === true
}

/**
 * There is only ever meant to be one enabled `enrichmentDone` and one enabled
 * `enrichmentError` webhook per workspace. Anything else enabled, on our own workspace
 * (never another one that happens to share this lemlist account), not in `trackedIds`,
 * and older than the grace window is a duplicate — almost always from two runs racing to
 * register at once.
 *
 * The workspace check needs one of our own webhooks to still be in `listed` to read a
 * workspace id from. If none are, this returns nothing rather than guessing.
 */
export function findDuplicateEnrichmentWebhooks(
    listed: readonly LemlistWebhook[],
    trackedIds: ReadonlySet<string>
): LemlistWebhook[] {
    const ownWorkspaceId = listed
        .filter((webhook) => trackedIds.has(webhook._id))
        .map((webhook) => workspaceIdFromTargetUrl(webhook.targetUrl))
        .find((workspaceId): workspaceId is string => workspaceId !== null)

    if (!ownWorkspaceId) {
        return []
    }

    const cutoff = Date.now() - DUPLICATE_GRACE_MS

    return listed.filter(
        (webhook) =>
            isEnrichmentWebhook(webhook) &&
            webhook.disabled !== true &&
            !trackedIds.has(webhook._id) &&
            workspaceIdFromTargetUrl(webhook.targetUrl) === ownWorkspaceId &&
            new Date(webhook.createdAt).getTime() < cutoff
    )
}

/** Deletes orphans and duplicates from an already-fetched listing, reusing one `GET /hooks`. */
export async function deleteOrphanedEnrichmentWebhooksFrom({
    webhooks,
    trackedIds,
    connection,
}: {
    webhooks: readonly LemlistWebhook[]
    trackedIds: ReadonlySet<string>
    connection?: Connection
}): Promise<void> {
    const orphans = [
        ...webhooks.filter(isOrphanedEnrichmentWebhook),
        ...findDuplicateEnrichmentWebhooks(webhooks, trackedIds),
    ]

    const startedAt = Date.now()
    let deletedCount = 0

    for (const [index, orphan] of orphans.entries()) {
        if (Date.now() - startedAt > CLEANUP_TIME_BUDGET_MS) {
            logger.log(
                `Ran out of time deleting orphaned webhooks, ${orphans.length - index} left for the next run`
            )

            return
        }

        if (index > 0) {
            await new Promise((resolve) => setTimeout(resolve, DELETE_REQUEST_SPACING_MS))
        }

        const deleteResult = await deleteWebhook(orphan._id, connection)

        if (isErrored(deleteResult) && deleteResult.error.code !== "NOT_FOUND") {
            logger.error(`Failed to delete orphaned webhook ${orphan._id}`)
            continue
        }

        deletedCount++
    }

    if (deletedCount > 0) {
        logger.log(`Deleted ${deletedCount} orphaned enrichment webhook(s)`)
    }
}
