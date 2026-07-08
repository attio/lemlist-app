import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {kv} from "attio/server"
import type {LemlistApiError} from "../lemlist-api/client"
import type {LemlistWebhookEventType} from "../lemlist-api/schemas"
import {createWebhook, deleteWebhook} from "../lemlist-api/webhooks"
import type {Logger} from "./logger"

function webhookStorageKey(uniqueExecutionId: string): string {
    return `webhook:${uniqueExecutionId}`
}

async function getStoredWebhookId(uniqueExecutionId: string): Promise<string | null> {
    const stored = await kv.get(webhookStorageKey(uniqueExecutionId))
    const value = stored?.value

    return typeof value === "string" && value.trim() ? value.trim() : null
}

/**
 * Creates a lemlist webhook and stores its id in KV for the given execution.
 */
export async function createStoredWebhook({
    targetUrl,
    uniqueExecutionId,
    type,
    logger,
}: {
    targetUrl: string
    uniqueExecutionId: string
    type: LemlistWebhookEventType
    logger?: Logger
}): AsyncResult<string, LemlistApiError> {
    const result = await createWebhook({targetUrl, type})

    if (isErrored(result)) {
        return result
    }

    const webhookId = result.value._id

    try {
        await kv.set(webhookStorageKey(uniqueExecutionId), webhookId)
    } catch (error) {
        logger?.error("Failed to store webhook id, rolling back webhook", {
            uniqueExecutionId,
            webhookId,
            error,
        })
        await deleteWebhook(webhookId)
        return errored({statusCode: 0, errorMessage: "Failed to store webhook id"})
    }

    logger?.log("Webhook registered", {uniqueExecutionId, webhookId, type})

    return complete(webhookId)
}

/**
 * Deletes the stored lemlist webhook and clears its id from KV for the given execution.
 */
export async function deleteStoredWebhook({
    uniqueExecutionId,
    logger,
}: {
    uniqueExecutionId: string
    logger?: Logger
}): AsyncResult<void, LemlistApiError> {
    const webhookId = await getStoredWebhookId(uniqueExecutionId)

    if (webhookId === null) {
        return complete(undefined)
    }

    const result = await deleteWebhook(webhookId)

    // 404 means webhook was already deleted (e.g. expired or removed externally) — still clean up KV
    if (isErrored(result) && result.error.statusCode !== 404) {
        logger?.error("Failed to delete enrichment webhook", {uniqueExecutionId, webhookId})
        return result
    }

    await kv.delete(webhookStorageKey(uniqueExecutionId))

    logger?.log("Webhook deleted", {uniqueExecutionId, webhookId})

    return complete(undefined)
}
