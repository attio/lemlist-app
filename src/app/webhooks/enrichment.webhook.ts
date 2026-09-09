import {LemlistEnrichmentWebhookSchema} from "../../lemlist-api/schemas"
import {deliverEnrichmentResult} from "../../services/enrichment/deliver"
import {createLogger} from "../../common/logger"

const logger = createLogger("enrichment webhook")

export default async function enrichmentWebhook(req: Request): Promise<Response> {
    let payload: unknown

    try {
        payload = await req.json()
    } catch {
        logger.error("Failed to parse enrichment webhook payload")
        return new Response(null, {status: 400})
    }

    const parsed = LemlistEnrichmentWebhookSchema.safeParse(payload)

    if (!parsed.success) {
        logger.error("Unrecognised enrichment webhook payload", {
            fields: parsed.error.issues.map((issue) => issue.path.join(".")),
        })
        return new Response(null, {status: 200})
    }

    const enrichmentFailed = parsed.data.type === "enrichmentError"

    const deliveries = await Promise.all(
        parsed.data.data.map((enrichment) =>
            deliverEnrichmentResult({enrichmentId: enrichment.id, enrichmentFailed})
        )
    )

    // A non-2xx tells lemlist to send the whole batch again.
    return new Response(null, {status: deliveries.every(Boolean) ? 200 : 500})
}
