import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {ErrorCode, errorMessage} from "../../error-codes"
import {executeEnrichment} from "../../utils/enrichment-execution"
import {createLogger} from "../../utils/logger"
import block from "./block"

const logger = createLogger("VerifyEmail step - execute")

export default Workflows.defineWorkflowBlockExecute(block, async ({config, metadata}) => {
    const email = config.email?.normalized

    if (!email) {
        logger.error("No email provided for verification")
        return {type: "error", errorMessage: errorMessage(ErrorCode.EnrichVerifyEmailInputRequired)}
    }

    const enrichmentId = await executeEnrichment({
        enrichInput: {email},
        enrichOptions: {verifyEmail: true},
        metadata,
        logger,
    })

    if (isErrored(enrichmentId)) {
        return {type: "error", errorMessage: enrichmentId.error.errorMessage}
    }

    return {type: "defer"}
})
