import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {getLeadByEmail, pauseLead} from "../../lemlist-api/leads"
import {createLogger} from "../../utils/logger"
import block from "./block"

const logger = createLogger("PauseLead step - execute")

export default Workflows.defineWorkflowBlockExecute(block, async ({config}) => {
    const email = config.email?.original ?? null
    const leadId = config.leadId ?? null
    const campaignId = config.campaignId ?? null

    if (!email && !leadId) {
        return {type: "error", errorMessage: "Either email or lead ID must be provided"}
    }

    const pausedCampaigns: Array<{campaign_id: string; lead_id: string}> = []

    if (leadId) {
        const result = await pauseLead(leadId, campaignId ?? undefined)

        if (isErrored(result)) {
            logger.error("Failed to pause lead", {leadId, error: result.error})
            return {type: "error", errorMessage: result.error.errorMessage}
        }

        for (const paused of result.value) {
            pausedCampaigns.push({campaign_id: paused.campaignId, lead_id: paused._id})
        }
    } else if (email) {
        const leadsResult = await getLeadByEmail(email)

        if (isErrored(leadsResult)) {
            logger.error("Failed to fetch leads by email", {error: leadsResult.error})
            return {type: "error", errorMessage: leadsResult.error.errorMessage}
        }

        const leads = leadsResult.value

        if (leads.length === 0) {
            return {type: "outcome", id: "not_found", data: null}
        }

        const leadsToProcess = campaignId
            ? leads.filter((lead) => lead.campaign.id === campaignId)
            : leads

        if (leadsToProcess.length === 0) {
            return {type: "outcome", id: "not_found", data: null}
        }

        for (const lead of leadsToProcess) {
            const result = await pauseLead(lead._id, campaignId ?? undefined)

            if (isErrored(result)) {
                logger.error("Failed to pause lead", {
                    leadId: lead._id,
                    campaignId: lead.campaign.id,
                    error: result.error,
                })
                return {type: "error", errorMessage: result.error.errorMessage}
            }

            for (const paused of result.value) {
                pausedCampaigns.push({campaign_id: paused.campaignId, lead_id: paused._id})
            }
        }
    }

    return {
        type: "outcome",
        id: "paused",
        data: {paused_campaigns: pausedCampaigns},
    }
})
