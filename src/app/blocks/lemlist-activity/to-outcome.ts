import {Workflows} from "attio/server"
import {
    type LemlistActivityPayload,
    type LemlistWebhookEventType,
    LemlistWebhookEventTypeSchema,
} from "../../../lemlist-api/schemas"

const LeadStateEventTypeSchema = LemlistWebhookEventTypeSchema.extract([
    "contacted",
    "hooked",
    "attracted",
    "warmed",
    "interested",
    "notInterested",
])

/** lemlist documents `emailsUnsubscribed` as also matching these activities. */
const EMAILS_UNSUBSCRIBED_ACTIVITY_TYPES: ReadonlyArray<LemlistWebhookEventType> = [
    "emailsUnsubscribed",
    "apiUnsubscribed",
    "manualUnsubscribed",
]

/**
 * A webhook payload mirrors the underlying activity, so its `type` is not always the one subscribed
 * to: a `notInterested` webhook receives `manualNotInterested`, and an `emailsUnsubscribed` one can
 * receive `apiUnsubscribed`. lemlist has already filtered the webhook, so those match, and the
 * outcome keeps the shape of the configured type.
 *
 * Returns the type the outcome is shaped by, or undefined when the event is for another type.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/webhooks/add-webhook#available-event-types
 */
export function matchEventType(
    configured: string,
    received: LemlistWebhookEventType
): LemlistWebhookEventType | undefined {
    const leadState = LeadStateEventTypeSchema.safeParse(configured)

    if (leadState.success) {
        return leadState.data
    }

    if (
        configured === "emailsUnsubscribed" &&
        EMAILS_UNSUBSCRIBED_ACTIVITY_TYPES.includes(received)
    ) {
        return configured
    }

    return received === configured ? received : undefined
}

/** Shapes the outcome by `eventType`, the one `matchEventType` returns, not by `data.type`. */
export function toOutcomeData(data: LemlistActivityPayload, eventType: LemlistWebhookEventType) {
    if (eventType === "entityUnsubscribed") {
        return {
            contact_id: data.contactId ?? "",
            contact_email:
                (data.email ? Workflows.OutcomeValue.emailAddress(data.email) : null) ?? undefined,
            contact_first_name: data.firstName ?? "",
            contact_last_name: data.lastName ?? "",
            campaign_id: data.campaignId,
            campaign_name: data.campaignName,
            created_at: new Date(data.createdAt),
        }
    }

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

    switch (eventType) {
        case "emailsSent":
        case "emailsOpened":
        case "emailsReplied":
        case "emailsUnsubscribed":
        case "emailsInterested":
        case "emailsNotInterested":
            return {...baseData, subject: data.subject ?? ""}

        case "emailsClicked":
            return {...baseData, link_url: data.location ?? "", bot: data.bot}

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
