import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {createLogger} from "../../utils/logger"
import {deleteStoredWebhook} from "../../utils/webhook-lifecycle"
import block from "./block"

const logger = createLogger("lemlistActivity trigger - deactivate")

export default Workflows.defineWorkflowBlockDeactivate(block, async ({metadata}) => {
    const {uniqueActivationId} = metadata

    logger.log("Deactivating activity trigger", {uniqueActivationId})

    const result = await deleteStoredWebhook({uniqueExecutionId: uniqueActivationId, logger})

    if (isErrored(result)) {
        return {
            type: "error",
            errorMessage: result.error.errorMessage,
        }
    }

    return {type: "complete"}
})
