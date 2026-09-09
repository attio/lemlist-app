import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {ErrorCode, errorMessage} from "../../../error-codes"
import {isRetryable, lemlistErrorMessage} from "../../../lemlist-api/transport/error"
import {executeEnrichment} from "../../../services/enrichment/execute-enrichment"
import {createLogger} from "../../../common/logger"
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
        finishCallbackUrl: metadata.finishCallbackUrl,
        logger,
    })

    if (isErrored(enrichmentId)) {
        return {
            type: "error",
            errorMessage: lemlistErrorMessage(enrichmentId.error),
            retryable: isRetryable(enrichmentId.error),
        }
    }

    return {type: "defer"}
})
