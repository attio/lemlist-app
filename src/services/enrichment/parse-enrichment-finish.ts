import {ErrorCode, errorMessage} from "../../error-codes"
import {type EnrichmentGetResult, EnrichmentGetResultSchema} from "../../lemlist-api/schemas"
import {z} from "zod"
import type {Logger} from "../../common/logger"

export type EnrichmentFinishResult =
    {type: "error"; errorMessage: string} | {type: "ready"; value: EnrichmentGetResult}

const EnrichmentFinishPayloadSchema = z.discriminatedUnion("status", [
    z.object({status: z.literal("ready"), result: EnrichmentGetResultSchema}),
    z.object({status: z.literal("error"), errorMessage: z.string()}),
])

/**
 * Reads the payload sent to an enrichment step's finish handler. The webhook handler has
 * already worked out which run the result belongs to, so anything arriving here is ours.
 */
export async function parseEnrichmentFinishPayload(
    req: Request,
    logger: Logger
): Promise<EnrichmentFinishResult> {
    let payload: unknown

    try {
        payload = await req.json()
    } catch {
        logger.error("Failed to parse enrichment finish payload")
        return {type: "error", errorMessage: errorMessage(ErrorCode.EnrichmentWebhookParseFailed)}
    }

    const parsed = EnrichmentFinishPayloadSchema.safeParse(payload)

    if (!parsed.success) {
        logger.error("Unexpected enrichment finish payload")
        return {type: "error", errorMessage: errorMessage(ErrorCode.EnrichmentWebhookUnexpected)}
    }

    if (parsed.data.status === "error") {
        return {type: "error", errorMessage: parsed.data.errorMessage}
    }

    return {type: "ready", value: parsed.data.result}
}
