import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {getLeadByEmail} from "../../../lemlist-api/leads"
import {createLogger} from "../../../utils/logger"
import block from "./block"

const logger = createLogger("GetLeadByEmail step - execute")

export default Workflows.defineWorkflowBlockExecute(block, async ({config, metadata}) => {
    const email = config.email.normalized

    logger.log("Fetching leads by email", {uniqueExecutionId: metadata.uniqueExecutionId})

    const result = await getLeadByEmail(email)

    if (isErrored(result)) {
        logger.error("Failed to fetch leads by email", {error: result.error})
        return {type: "error", errorMessage: result.error.errorMessage}
    }

    const leads = result.value

    if (leads.length === 0) {
        return {type: "outcome", id: "not_found", data: null}
    }

    return {
        type: "outcome",
        id: "found",
        data: {
            leads: leads.map((lead) => ({
                lead_id: lead._id,
                email: email,
                first_name: lead.variables?.firstName ?? "",
                last_name: lead.variables?.lastName ?? "",
                campaign_id: lead.campaign?.id ?? "",
                campaign_name: lead.campaign?.name ?? "",
                lead_state: lead.state ?? "",
                is_paused: lead.isPaused ?? false,
            })),
        },
    }
})
