import {isErrored} from "@attio/fetchable"
import {z} from "zod"
import {ErrorCode, errorMessage} from "../../error-codes"
import {getEnrichmentResult} from "../../lemlist-api/enrich"
import {lemlistErrorMessage} from "../../lemlist-api/transport/error"
import {
    type EnrichmentGetResult,
    EnrichmentGetResultSchema,
    LemlistEnrichmentWebhookSchema,
} from "../../lemlist-api/schemas"
import {getStoredEnrichmentId} from "../../utils/enrichment-storage"
import type {Logger} from "../../common/logger"

export type EnrichmentFinishResult =
    | {type: "no-op"}
    | {type: "error"; errorMessage: string}
    | {type: "ready"; value: EnrichmentGetResult}

const EnrichmentFinishPayloadSchema = z.discriminatedUnion("status", [
    z.object({status: z.literal("ready"), result: EnrichmentGetResultSchema}),
    z.object({status: z.literal("error"), errorMessage: z.string()}),
])

/**
 * New runs receive the payload the shared webhook posts. Runs that deferred before
 * this deploy still get lemlist's raw `{type, data:[{id}]}` event on their own callback
 * URL, matched via the old `enrichment:${uniqueExecutionId}` KV key.
 */
export async function parseEnrichmentFinishPayload(
    req: Request,
    uniqueExecutionId: string,
    logger: Logger
): Promise<EnrichmentFinishResult> {
    let payload: unknown

    try {
        payload = await req.json()
    } catch {
        logger.error("Failed to parse enrichment finish payload")
        return {type: "error", errorMessage: errorMessage(ErrorCode.EnrichmentWebhookParseFailed)}
    }

    const shared = EnrichmentFinishPayloadSchema.safeParse(payload)

    if (shared.success) {
        if (shared.data.status === "error") {
            return {type: "error", errorMessage: shared.data.errorMessage}
        }
        return {type: "ready", value: shared.data.result}
    }

    const raw = LemlistEnrichmentWebhookSchema.safeParse(payload)

    if (!raw.success) {
        logger.error("Unexpected enrichment finish payload")
        return {type: "error", errorMessage: errorMessage(ErrorCode.EnrichmentWebhookUnexpected)}
    }

    const storedEnrichmentId = await getStoredEnrichmentId(uniqueExecutionId)

    if (!storedEnrichmentId || !raw.data.data.some((item) => item.id === storedEnrichmentId)) {
        return {type: "no-op"}
    }

    const enrichmentResult = await getEnrichmentResult(storedEnrichmentId)

    if (isErrored(enrichmentResult)) {
        logger.error("Failed to fetch enrichment result", {uniqueExecutionId})
        return {type: "error", errorMessage: lemlistErrorMessage(enrichmentResult.error)}
    }

    return {type: "ready", value: enrichmentResult.value}
}
