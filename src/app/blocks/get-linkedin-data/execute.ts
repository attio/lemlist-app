import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {ErrorCode, errorMessage} from "../../../error-codes"
import {hasEnrichContactInput} from "../../../lemlist-api/enrich"
import {isRetryable, lemlistErrorMessage} from "../../../lemlist-api/transport/error"
import {executeEnrichment} from "../../../services/enrichment/execute-enrichment"
import {createLogger} from "../../../common/logger"
import block from "./block"

const logger = createLogger("GetLinkedinData step - execute")

export default Workflows.defineWorkflowBlockExecute(block, async ({config, metadata}) => {
    const enrichInput = {
        email: config.email?.normalized,
        phone: config.phoneNumber?.normalized,
        firstName: config.firstName,
        lastName: config.lastName,
        companyName: config.companyName,
    }

    if (!hasEnrichContactInput(enrichInput)) {
        logger.error("No input provided for enrichment")
        return {type: "error", errorMessage: errorMessage(ErrorCode.EnrichLinkedinInputRequired)}
    }

    const enrichmentId = await executeEnrichment({
        enrichInput,
        enrichOptions: {linkedinEnrichment: true},
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
