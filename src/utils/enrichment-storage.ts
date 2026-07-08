import {isErrored} from "@attio/fetchable"
import {kv} from "attio/server"
import type {Logger} from "./logger"
import {deleteStoredWebhook} from "./webhook-lifecycle"

function enrichmentStorageKey(uniqueExecutionId: string): string {
    return `enrichment:${uniqueExecutionId}`
}

/**
 * Stores the lemlist enrichment id for a deferred workflow execution.
 */
export async function storeEnrichmentId({
    uniqueExecutionId,
    enrichmentId,
}: {
    uniqueExecutionId: string
    enrichmentId: string
}): Promise<void> {
    await kv.set(enrichmentStorageKey(uniqueExecutionId), enrichmentId)
}

/**
 * Returns the lemlist enrichment id stored for a workflow execution.
 */
export async function getStoredEnrichmentId(uniqueExecutionId: string): Promise<string | null> {
    const stored = await kv.get(enrichmentStorageKey(uniqueExecutionId))
    const value = stored?.value

    return typeof value === "string" ? value : null
}

/**
 * Clears the stored enrichment id for a workflow execution.
 */
async function clearStoredEnrichmentId(uniqueExecutionId: string): Promise<void> {
    const enrichmentId = await getStoredEnrichmentId(uniqueExecutionId)

    if (!enrichmentId) {
        return
    }

    await kv.delete(enrichmentStorageKey(uniqueExecutionId))
}

/**
 * Clears webhook and enrichment KV for a workflow execution.
 */
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
