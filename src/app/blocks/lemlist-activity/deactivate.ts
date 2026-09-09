import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {createLogger} from "../../../common/logger"
import {deleteStoredWebhook} from "./webhook-lifecycle"
import block from "./block"
import {lemlistErrorMessage} from "../../../lemlist-api/transport/error"

const logger = createLogger("lemlistActivity trigger - deactivate")

export default Workflows.defineWorkflowBlockDeactivate(block, async ({metadata}) => {
    const {uniqueActivationId} = metadata

    logger.log("Deactivating activity trigger", {uniqueActivationId})

    const result = await deleteStoredWebhook({uniqueExecutionId: uniqueActivationId, logger})

    if (isErrored(result)) {
        return {
            type: "error",
            errorMessage: lemlistErrorMessage(result.error),
        }
    }

    return {type: "complete"}
})
