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

function isAttioCallbackUrl(targetUrl: string): boolean {
    try {
        return new URL(targetUrl).hostname === ATTIO_CALLBACK_HOSTNAME
    } catch {
        return false
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
 * Deletes disabled enrichment webhooks from an already-fetched listing, reusing one
 * `GET /hooks`.
 *
 * This deliberately does not try to detect and delete "duplicate" enabled enrichment
 * webhooks left behind by a race between two runs registering at once. An enabled webhook
 * matching our type, host, and workspace is not proof it came from our own registration
 * code — someone could point their own webhook at the same shape of URL — so an enabled
 * webhook is only ever removed by whoever owns it disabling it first.
 */
export async function deleteOrphanedEnrichmentWebhooksFrom({
    webhooks,
    connection,
}: {
    webhooks: readonly LemlistWebhook[]
    connection?: Connection
}): Promise<void> {
    const orphans = webhooks.filter(isOrphanedEnrichmentWebhook)

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
