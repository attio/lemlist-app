import {Workflows} from "attio/server"
import {handleEnrichmentWebhook} from "../../utils/enrichment-execution"
import {clearStoredExecution} from "../../utils/enrichment-storage"
import {createLogger} from "../../utils/logger"
import block from "./block"

const logger = createLogger("GetLinkedinData step - finish")

export default Workflows.defineWorkflowBlockFinish(block, async (req, {metadata}) => {
    const {uniqueExecutionId} = metadata
    const result = await handleEnrichmentWebhook({req, uniqueExecutionId, logger})

    if (result.type === "no-op") return result

    await clearStoredExecution({uniqueExecutionId, logger})
    if (result.type === "error") return result

    if (result.value.status !== "completed") {
        return {type: "error", errorMessage: "lemlist enrichment API Failed"}
    }

    const li = result.value.data.data?.linkedin
    if (!li?.linkedinUrl?.trim()) return {type: "outcome", id: "not_found", data: null}

    return {
        type: "outcome",
        id: "found",
        data: {
            linkedin_url: li.linkedinUrl,
            first_name: li.firstName ?? "",
            last_name: li.lastName ?? "",
            location_name: li.locationName ?? "",
            industry: li.industry ?? "",
            company_name: li.companyName ?? "",
            company_domain: li.companyDomain ?? "",
            occupation: li.occupation ?? "",
            tagline: li.tagline ?? "",
        },
    }
})
