import {Workflows} from "attio/server"
import type {LemlistActivityPayload} from "../../../lemlist-api/schemas"

export function toOutcomeData(data: LemlistActivityPayload) {
    const leadEmail = data.leadEmail ? Workflows.OutcomeValue.emailAddress(data.leadEmail) : null

    const baseData = {
        campaign_id: data.campaignId ?? "",
        campaign_name: data.campaignName ?? "",
        lead_id: data.leadId ?? "",
        lead_email: leadEmail ?? undefined,
        lead_first_name: data.leadFirstName ?? "",
        lead_last_name: data.leadLastName ?? "",
        created_at: new Date(data.createdAt),
    }

    switch (data.type) {
        case "emailsSent":
        case "emailsOpened":
        case "emailsReplied":
        case "emailsUnsubscribed":
        case "emailsInterested":
        case "emailsNotInterested":
            return {...baseData, subject: data.subject ?? ""}

        case "emailsClicked":
            return {...baseData, subject: data.subject ?? "", link_url: data.linkUrl ?? ""}

        case "emailsBounced":
            return {
                ...baseData,
                subject: data.subject ?? "",
                bounce_reason: data.bounceReason ?? "",
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
            return {...baseData, linkedin_url: data.linkedinUrl ?? ""}

        default:
            return baseData
    }
}
