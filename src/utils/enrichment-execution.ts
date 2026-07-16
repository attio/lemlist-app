import {type AsyncResult, complete, isErrored} from "@attio/fetchable"
import {ErrorCode, errorMessage} from "../error-codes"
import type {
    EnrichContactInput,
    EnrichContactOptions,
    EnrichmentGetResult,
} from "../lemlist-api/enrich"
import {enrichContact, getEnrichmentResult} from "../lemlist-api/enrich"
import type {LemlistApiError} from "../lemlist-api/error"
import {LemlistEnrichmentDoneWebhookMinimalSchema} from "../lemlist-api/schemas"
import {clearStoredExecution, getStoredEnrichmentId, storeEnrichmentId} from "./enrichment-storage"
import type {Logger} from "./logger"
import {createStoredWebhook} from "./webhook-lifecycle"

export type EnrichmentWebhookResult =
    | {type: "no-op"}
    | {type: "error"; errorMessage: string}
    | {type: "ready"; value: EnrichmentGetResult}

/**
 * Handles an incoming enrichment webhook, validating and resolving the result
 * for the execution that initiated the enrichment.
 */
export async function handleEnrichmentWebhook({
    req,
    uniqueExecutionId,
    logger,
}: {
    req: Request
    uniqueExecutionId: string
    logger?: Logger
}): Promise<EnrichmentWebhookResult> {
    let payload: unknown
    try {
        payload = await req.json()
    } catch {
        logger?.error("Failed to parse enrichment webhook payload", {uniqueExecutionId})
        return {type: "error", errorMessage: errorMessage(ErrorCode.EnrichmentWebhookParseFailed)}
    }

    const parsed = LemlistEnrichmentDoneWebhookMinimalSchema.safeParse(payload)

    if (!parsed.success) {
        logger?.error("Unexpected enrichment webhook payload", {uniqueExecutionId})
        return {type: "error", errorMessage: errorMessage(ErrorCode.EnrichmentWebhookUnexpected)}
    }

    const storedEnrichmentId = await getStoredEnrichmentId(uniqueExecutionId)

    // Webhook is for a different execution or we have no record of it
    if (!storedEnrichmentId || !parsed.data.data.some((item) => item.id === storedEnrichmentId)) {
        return {type: "no-op"}
    }

    const enrichmentResult = await getEnrichmentResult(storedEnrichmentId)

    if (isErrored(enrichmentResult)) {
        logger?.error("Failed to fetch enrichment result", {uniqueExecutionId})
        return {type: "error", errorMessage: enrichmentResult.error.errorMessage}
    }

    // Enrichment completed successfully — return the result to the caller
    return {type: "ready", value: enrichmentResult.value}
}

/**
 * Kicks off a lemlist enrichment and registers a webhook to be notified when it completes.
 */
export async function executeEnrichment({
    enrichInput,
    enrichOptions,
    metadata,
    logger,
}: {
    enrichInput: EnrichContactInput
    enrichOptions: EnrichContactOptions
    metadata: {uniqueExecutionId: string; finishCallbackUrl: string}
    logger?: Logger
}): AsyncResult<string, LemlistApiError> {
    const {uniqueExecutionId, finishCallbackUrl} = metadata

    const webhookResult = await createStoredWebhook({
        targetUrl: finishCallbackUrl,
        uniqueExecutionId,
        type: "enrichmentDone",
        logger,
    })

    if (isErrored(webhookResult)) {
        await clearStoredExecution({uniqueExecutionId, logger})
        return webhookResult
    }

    const enrichment = await enrichContact(enrichInput, enrichOptions)

    if (isErrored(enrichment)) {
        return enrichment
    }

    const enrichmentId = enrichment.value

    logger?.log(`Start enrichment process. (id: ${enrichmentId})`)
    await storeEnrichmentId({uniqueExecutionId, enrichmentId})

    return complete(enrichmentId)
}
