import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {LemlistWebhookEventTypeSchema} from "../../../lemlist-api/schemas"
import {createLogger} from "../../../utils/logger"
import {createStoredWebhook} from "../../../utils/webhook-lifecycle"
import block from "./block"

const logger = createLogger("lemlistActivity trigger - activate")

export default Workflows.defineWorkflowBlockActivate(block, async ({config, metadata}) => {
    const {uniqueActivationId, triggerCallbackUrl} = metadata

    const eventTypeResult = LemlistWebhookEventTypeSchema.safeParse(config.eventType)

    if (!eventTypeResult.success) {
        logger.error("Invalid event type in config", {
            uniqueActivationId,
            eventType: config.eventType,
        })
        return {
            type: "error",
            errorMessage: "Invalid event type configured",
        }
    }

    const eventType = eventTypeResult.data

    logger.log("Activating activity trigger", {uniqueActivationId, eventType})

    const result = await createStoredWebhook({
        targetUrl: triggerCallbackUrl,
        uniqueExecutionId: uniqueActivationId,
        type: eventType,
        logger,
    })

    if (isErrored(result)) {
        return {
            type: "error",
            errorMessage: result.error.errorMessage,
        }
    }

    return {type: "complete"}
})
