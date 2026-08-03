import {Workflows} from "attio/server"
import {LemlistActivityPayloadSchema} from "../../../lemlist-api/schemas"
import {createLogger} from "../../../utils/logger"
import block from "./block"

const logger = createLogger("lemlistActivity trigger - trigger")

export default Workflows.defineWorkflowBlockTrigger(block, async (req, {config, metadata}) => {
    const {uniqueActivationId} = metadata
    let payload: unknown

    try {
        payload = await req.json()
    } catch {
        logger.error("Failed to parse webhook payload", {uniqueActivationId})
        return {type: "no-op"}
    }

    const parsed = LemlistActivityPayloadSchema.safeParse(payload)

    if (!parsed.success) {
        logger.error("Unexpected webhook payload", {uniqueActivationId})
        return {type: "no-op"}
    }

    const data = parsed.data

    if (data.type !== config.eventType) {
        logger.log("Ignoring webhook for different event type", {
            uniqueActivationId,
            receivedType: data.type,
            configuredType: config.eventType,
        })
        return {type: "no-op"}
    }

    if (config.campaignId && data.campaignId !== config.campaignId) {
        logger.log("Ignoring webhook for different campaign", {
            uniqueActivationId,
            receivedCampaignId: data.campaignId,
            configuredCampaignId: config.campaignId,
        })
        return {type: "no-op"}
    }

    logger.log("Received matching webhook", {uniqueActivationId, eventType: data.type})

    const leadEmail = data.leadEmail ? Workflows.OutcomeValue.emailAddress(data.leadEmail) : null

    const baseData = {
        campaign_id: data.campaignId ?? "",
        campaign_name: data.campaignName ?? "",
        lead_id: data.leadId ?? "",
        lead_email: leadEmail ?? undefined,
        lead_first_name: data.leadFirstName ?? "",
        lead_last_name: data.leadLastName ?? "",
    }

    switch (data.type) {
        case "emailsSent":
        case "emailsOpened":
        case "emailsReplied":
        case "emailsUnsubscribed":
        case "emailsInterested":
        case "emailsNotInterested":
            return {
                type: "outcome",
                id: "triggered",
                data: {...baseData, subject: data.subject ?? ""},
            }

        case "emailsClicked":
            return {
                type: "outcome",
                id: "triggered",
                data: {...baseData, subject: data.subject ?? "", link_url: data.linkUrl ?? ""},
            }

        case "emailsBounced":
            return {
                type: "outcome",
                id: "triggered",
                data: {
                    ...baseData,
                    subject: data.subject ?? "",
                    bounce_reason: data.bounceReason ?? "",
                },
            }

        case "linkedinVisitDone":
        case "linkedinVisitFailed":
        case "linkedinInviteDone":
        case "linkedinInviteFailed":
        case "linkedinInviteAccepted":
        case "linkedinReplied":
        case "linkedinSent":
        case "linkedinVoiceNoteDone":
        case "linkedinVoiceNoteFailed":
        case "linkedinInterested":
        case "linkedinNotInterested":
        case "linkedinSendFailed":
            return {
                type: "outcome",
                id: "triggered",
                data: {...baseData, linkedin_url: data.linkedinUrl ?? ""},
            }

        default:
            return {
                type: "outcome",
                id: "triggered",
                data: baseData,
            }
    }
})
