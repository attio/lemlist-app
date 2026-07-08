import {Workflows} from "attio/client"

const baseOutcomeSchema = Workflows.OutcomeSchema.struct({
    campaign_id: Workflows.OutcomeSchema.string().title("Campaign ID"),
    campaign_name: Workflows.OutcomeSchema.string().title("Campaign name"),
    lead_id: Workflows.OutcomeSchema.string().title("Lead ID"),
    lead_email: Workflows.OutcomeSchema.emailAddress().optional().title("Lead email"),
    lead_first_name: Workflows.OutcomeSchema.string().title("Lead first name"),
    lead_last_name: Workflows.OutcomeSchema.string().title("Lead last name"),
})

const emailOutcomeSchema = Workflows.OutcomeSchema.struct({
    campaign_id: Workflows.OutcomeSchema.string().title("Campaign ID"),
    campaign_name: Workflows.OutcomeSchema.string().title("Campaign name"),
    lead_id: Workflows.OutcomeSchema.string().title("Lead ID"),
    lead_email: Workflows.OutcomeSchema.emailAddress().optional().title("Lead email"),
    lead_first_name: Workflows.OutcomeSchema.string().title("Lead first name"),
    lead_last_name: Workflows.OutcomeSchema.string().title("Lead last name"),
    subject: Workflows.OutcomeSchema.string().title("Subject"),
})

const emailClickedOutcomeSchema = Workflows.OutcomeSchema.struct({
    campaign_id: Workflows.OutcomeSchema.string().title("Campaign ID"),
    campaign_name: Workflows.OutcomeSchema.string().title("Campaign name"),
    lead_id: Workflows.OutcomeSchema.string().title("Lead ID"),
    lead_email: Workflows.OutcomeSchema.emailAddress().optional().title("Lead email"),
    lead_first_name: Workflows.OutcomeSchema.string().title("Lead first name"),
    lead_last_name: Workflows.OutcomeSchema.string().title("Lead last name"),
    subject: Workflows.OutcomeSchema.string().title("Subject"),
    link_url: Workflows.OutcomeSchema.string().title("Link URL"),
})

const emailBouncedOutcomeSchema = Workflows.OutcomeSchema.struct({
    campaign_id: Workflows.OutcomeSchema.string().title("Campaign ID"),
    campaign_name: Workflows.OutcomeSchema.string().title("Campaign name"),
    lead_id: Workflows.OutcomeSchema.string().title("Lead ID"),
    lead_email: Workflows.OutcomeSchema.emailAddress().optional().title("Lead email"),
    lead_first_name: Workflows.OutcomeSchema.string().title("Lead first name"),
    lead_last_name: Workflows.OutcomeSchema.string().title("Lead last name"),
    subject: Workflows.OutcomeSchema.string().title("Subject"),
    bounce_reason: Workflows.OutcomeSchema.string().title("Bounce reason"),
})

const linkedinOutcomeSchema = Workflows.OutcomeSchema.struct({
    campaign_id: Workflows.OutcomeSchema.string().title("Campaign ID"),
    campaign_name: Workflows.OutcomeSchema.string().title("Campaign name"),
    lead_id: Workflows.OutcomeSchema.string().title("Lead ID"),
    lead_email: Workflows.OutcomeSchema.emailAddress().optional().title("Lead email"),
    lead_first_name: Workflows.OutcomeSchema.string().title("Lead first name"),
    lead_last_name: Workflows.OutcomeSchema.string().title("Lead last name"),
    linkedin_url: Workflows.OutcomeSchema.string().title("LinkedIn URL"),
})

export function getOutcomeSchema(eventType: string | undefined) {
    switch (eventType) {
        case "emailsSent":
        case "emailsOpened":
        case "emailsReplied":
        case "emailsUnsubscribed":
        case "emailsInterested":
        case "emailsNotInterested":
            return emailOutcomeSchema

        case "emailsClicked":
            return emailClickedOutcomeSchema

        case "emailsBounced":
            return emailBouncedOutcomeSchema

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
            return linkedinOutcomeSchema

        default:
            return baseOutcomeSchema
    }
}
