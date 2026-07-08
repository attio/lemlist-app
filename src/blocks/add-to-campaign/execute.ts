import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {
    createLeadInCampaign,
    getAddLeadQueryParams,
    mergeAddLeadQueryParams,
} from "../../lemlist-api/campaigns"
import {createLogger} from "../../utils/logger"
import type {LemlistPerson} from "../../utils/person-for-campaign"
import block from "./block"

const logger = createLogger("AddToCampaign step - execute")

export default Workflows.defineWorkflowBlockExecute(block, async ({config, metadata}) => {
    const uniqueExecutionId = metadata.uniqueExecutionId
    const email = config.email.normalized
    const campaignId = config.campaignId

    logger.log("Adding person to campaign", {
        uniqueExecutionId,
        campaignId,
        hasEmail: Boolean(email),
    })

    const person: LemlistPerson = {
        email,
        additionalEmails: [],
        firstName: config.firstName ?? null,
        lastName: config.lastName ?? null,
        summary: null,
        location: null,
        companyName: config.companyName ?? null,
        jobTitle: config.jobTitle ?? null,
        linkedinUrl: config.linkedinUrl ?? null,
        picture: null,
        phone: config.phone?.normalized ?? null,
        companyDomain: config.companyDomain ?? null,
        customAttributes: {},
    }

    const addLeadQueryParams = mergeAddLeadQueryParams(await getAddLeadQueryParams(), {
        linkedinEnrichment: config.linkedinEnrichment,
        verifyEmail: config.verifyEmail,
        findEmail: config.findEmail,
        findPhone: config.findPhone,
        deduplicate: config.deduplicate,
    })

    const result = await createLeadInCampaign({
        campaignId,
        person,
        contactOwnerEmail: config.contactOwnerEmail?.normalized ?? null,
        addLeadQueryParams,
    })

    if (isErrored(result)) {
        logger.error("Failed to add person to campaign", {
            uniqueExecutionId,
            campaignId,
            error: result.error,
        })

        return {
            type: "error",
            errorMessage: result.error.errorMessage,
        }
    }

    const lead = result.value

    logger.log("Person added to campaign", {
        uniqueExecutionId,
        campaignId,
        leadId: lead._id,
    })

    return {
        type: "outcome",
        id: "added",
        data: {
            lead_id: lead._id,
            campaign_id: lead.campaignId,
            email: lead.email,
        },
    }
})
