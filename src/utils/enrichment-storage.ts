import {isErrored} from "@attio/fetchable"
import {kv} from "attio/server"
import type {Logger} from "../common/logger"
import {deleteStoredWebhook} from "../app/blocks/lemlist-activity/webhook-lifecycle"

function enrichmentStorageKey(uniqueExecutionId: string): string {
    return `enrichment:${uniqueExecutionId}`
}

/**
 * Read-only look-up of the enrichment id stored by the old per-run execute path.
 * Those KV entries had no TTL, so in-flight runs at deploy still have them.
 */
export async function getStoredEnrichmentId(uniqueExecutionId: string): Promise<string | null> {
    const stored = await kv.get(enrichmentStorageKey(uniqueExecutionId))
    const value = stored?.value

    return typeof value === "string" ? value : null
}

async function clearStoredEnrichmentId(uniqueExecutionId: string): Promise<void> {
    const enrichmentId = await getStoredEnrichmentId(uniqueExecutionId)

    if (!enrichmentId) {
        return
    }

    await kv.delete(enrichmentStorageKey(uniqueExecutionId))
}

export async function clearStoredExecution({
    uniqueExecutionId,
    logger,
}: {
    uniqueExecutionId: string
    logger?: Logger
}): Promise<void> {
    const deleteWebhookResult = await deleteStoredWebhook({uniqueExecutionId, logger})

    if (isErrored(deleteWebhookResult)) {
        logger?.error("Failed to clear stored enrichment webhooks", {
            uniqueExecutionId,
            error: deleteWebhookResult.error,
        })
    }

    await clearStoredEnrichmentId(uniqueExecutionId)
}
