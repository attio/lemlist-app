import {Workflows} from "attio/server"
import {LemlistActivityPayloadSchema} from "../../../lemlist-api/schemas"
import {createLogger} from "../../../utils/logger"
import {InvalidSchemaError} from "../../../utils/schema-error"
import block from "./block"
import {toOutcomeData} from "./to-outcome"

const logger = createLogger("lemlistActivity trigger - trigger")

export default Workflows.defineWorkflowBlockTrigger(block, async (req, {config, metadata}) => {
    const {uniqueActivationId} = metadata
    let payload: unknown

    try {
        payload = await req.json()
    } catch {
        logger.error("Failed to parse webhook payload", {uniqueActivationId})
        return {type: "no-op"}
    }

    const parsed = LemlistActivityPayloadSchema.safeParse(payload)

    if (!parsed.success) {
        logger.error(new InvalidSchemaError(parsed.error), {uniqueActivationId})
        return {type: "no-op"}
    }

    const data = parsed.data

    if (data.type !== config.eventType) {
        logger.log("Ignoring webhook for different event type", {
            uniqueActivationId,
            receivedType: data.type,
            configuredType: config.eventType,
        })
        return {type: "no-op"}
    }

    if (config.campaignId && data.campaignId !== config.campaignId) {
        logger.log("Ignoring webhook for different campaign", {
            uniqueActivationId,
            receivedCampaignId: data.campaignId,
            configuredCampaignId: config.campaignId,
        })
        return {type: "no-op"}
    }

    logger.log("Received matching webhook", {uniqueActivationId, eventType: data.type})

    return {
        type: "outcome",
        id: "triggered",
        data: toOutcomeData(data),
    }
})
