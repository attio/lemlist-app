import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {ErrorCode, errorMessage} from "../../../error-codes"
import {hasEnrichContactInput} from "../../../lemlist-api/enrich"
import {executeEnrichment} from "../../../utils/enrichment-execution"
import {createLogger} from "../../../utils/logger"
import block from "./block"

const logger = createLogger("FindPhoneNumber step - execute")

export default Workflows.defineWorkflowBlockExecute(block, async ({config, metadata}) => {
    const enrichInput = {
        email: config.email?.normalized,
        linkedinUrl: config.linkedinUrl?.trim(),
        firstName: config.firstName?.trim(),
        lastName: config.lastName?.trim(),
        companyName: config.companyName?.trim(),
    }

    if (!hasEnrichContactInput(enrichInput)) {
        logger.error("No input provided for enrichment")
        return {type: "error", errorMessage: errorMessage(ErrorCode.EnrichPhoneInputRequired)}
    }

    const enrichmentId = await executeEnrichment({
        enrichInput,
        enrichOptions: {findPhone: true},
        metadata,
        logger,
    })

    if (isErrored(enrichmentId)) {
        return {type: "error", errorMessage: enrichmentId.error.errorMessage}
    }

    return {type: "defer"}
})
