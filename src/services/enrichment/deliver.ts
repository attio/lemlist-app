import {isErrored} from "@attio/fetchable"
import {getEnrichmentResult} from "../../lemlist-api/enrich"
import type {EnrichmentGetResult} from "../../lemlist-api/schemas"
import {isRetryable, lemlistErrorMessage} from "../../lemlist-api/transport/error"
import {isAttioEgressException} from "../../common/attio-egress"
import {createLogger} from "../../common/logger"
import {clearStoredEnrichmentCallback, getStoredEnrichmentCallback} from "./callback-store"

const logger = createLogger("enrichment webhook")

type FinishPayload =
    {status: "ready"; result: EnrichmentGetResult} | {status: "error"; errorMessage: string}

async function buildFinishPayload({
    enrichmentId,
    enrichmentFailed,
}: {
    enrichmentId: string
    enrichmentFailed: boolean
}): Promise<FinishPayload | null> {
    if (enrichmentFailed) {
        return {status: "error", errorMessage: "lemlist could not complete the enrichment"}
    }

    const result = await getEnrichmentResult(enrichmentId)

    if (isErrored(result)) {
        if (isRetryable(result.error)) {
            return null
        }

        return {status: "error", errorMessage: lemlistErrorMessage(result.error)}
    }

    if (result.value.status !== "completed") {
        return null
    }

    return {status: "ready", result: result.value}
}

async function postFinish({
    enrichmentId,
    finishCallbackUrl,
    payload,
}: {
    enrichmentId: string
    finishCallbackUrl: string
    payload: FinishPayload
}): Promise<boolean> {
    try {
        const response = await fetch(finishCallbackUrl, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload),
        })

        if (!response.ok) {
            if (response.status >= 500) {
                logger.error(`Workflow rejected enrichment ${enrichmentId} (${response.status})`)
                return false
            }

            if (response.status === 404) {
                logger.error(`Workflow is gone for enrichment ${enrichmentId}`)
            } else {
                // Not a status we expect from this endpoint. Treated the same as a 404
                // rather than retried forever, since a bug in our own payload would
                // otherwise fail identically on every redelivery until lemlist disables
                // the shared webhook.
                logger.error(`Unexpected status delivering enrichment ${enrichmentId}`, {
                    status: response.status,
                })
            }

            await clearStoredEnrichmentCallback(enrichmentId)
            return true
        }
    } catch (error) {
        logger.error(`Could not reach the workflow for enrichment ${enrichmentId}`, error)
        return false
    }

    await clearStoredEnrichmentCallback(enrichmentId)

    return true
}

/**
 * True tells the caller to acknowledge lemlist; false asks it to redeliver by answering
 * 500. A 4xx from the workflow also resolves true — the run is gone, and asking for
 * redelivery would just make lemlist retry until it disables the shared webhook,
 * taking every other enrichment down with it.
 */
export async function deliverEnrichmentResult({
    enrichmentId,
    enrichmentFailed,
}: {
    enrichmentId: string
    enrichmentFailed: boolean
}): Promise<boolean> {
    try {
        const finishCallbackUrl = await getStoredEnrichmentCallback(enrichmentId)

        if (!finishCallbackUrl) {
            return true
        }

        const payload = await buildFinishPayload({enrichmentId, enrichmentFailed})

        if (payload === null) {
            return false
        }

        return await postFinish({enrichmentId, finishCallbackUrl, payload})
    } catch (error) {
        // getStoredEnrichmentCallback is a plain kv call outside the lemlist client, so an
        // egress-limit throw there surfaces as a raw exception rather than a result.
        if (!isAttioEgressException(error)) {
            throw error
        }

        logger.error(`Attio's egress rate limit was hit delivering enrichment ${enrichmentId}`)

        return false
    }
}
