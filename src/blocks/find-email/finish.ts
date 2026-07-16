import {Workflows} from "attio/server"
import {handleEnrichmentWebhook} from "../../utils/enrichment-execution"
import {clearStoredExecution} from "../../utils/enrichment-storage"
import {createLogger} from "../../utils/logger"
import block from "./block"

const logger = createLogger("FindEmail step - finish")

export default Workflows.defineWorkflowBlockFinish(block, async (req, {metadata}) => {
    const {uniqueExecutionId} = metadata
    const result = await handleEnrichmentWebhook({req, uniqueExecutionId, logger})

    if (result.type === "no-op") return result

    await clearStoredExecution({uniqueExecutionId, logger})
    if (result.type === "error") return result

    if (result.value.status !== "completed") {
        return {type: "error", errorMessage: "lemlist enrichment API Failed"}
    }

    const rawEmail = result.value.data.data?.email?.email
    const email = rawEmail ? Workflows.OutcomeValue.emailAddress(rawEmail) : null

    if (email) {
        return {
            type: "outcome",
            id: "found",
            data: {email},
        }
    }

    return {type: "outcome", id: "not_found", data: null}
})
