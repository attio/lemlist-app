import type {PlainComboboxOption, PlainComboboxOptionsProvider} from "attio/client"

/**
 * Labels say when lemlist emits each event; `keywords` are searched but never shown, so the older
 * labels still find their option.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/webhooks/add-webhook#available-event-types
 */
export const ACTIVITY_OPTIONS: Array<PlainComboboxOption> = [
    {
        value: "contacted",
        label: "Lead was contacted for the first time",
        description:
            "Fires when a campaign sends a lead its first message on any channel. It does not fire when a lead is added to a campaign",
    },
    {
        value: "hooked",
        label: "Lead opened a message on any channel",
        description: "Covers email, LinkedIn and WhatsApp opens",
    },
    {
        value: "attracted",
        label: "Lead clicked a link or accepted a LinkedIn invite",
        description: "Covers email link clicks and accepted LinkedIn connection invites",
    },
    {
        value: "warmed",
        label: "Lead replied on any channel",
        description: "Covers email, LinkedIn, WhatsApp and SMS replies",
    },
    {
        value: "interested",
        label: "Lead marked as interested on any channel",
        description: "Covers leads marked as interested by email, LinkedIn, call, API or manually",
    },
    {
        value: "notInterested",
        label: "Lead marked as not interested on any channel",
        description:
            "Covers leads marked as not interested by email, LinkedIn, call, API or manually",
    },
    {
        value: "emailsSent",
        label: "Email sent to lead",
        description: "Fires when a campaign email is sent to the lead",
    },
    {
        value: "emailsOpened",
        label: "Lead opened an email",
        description:
            "Fires every time the lead opens a campaign email, so it can fire more than once for the same email",
    },
    {
        value: "emailsClicked",
        label: "Lead clicked a link in an email",
        description:
            "Fires every time the lead clicks a tracked link in a campaign email, and reports which link was clicked",
    },
    {
        value: "emailsReplied",
        label: "Lead replied to an email",
        description: "Fires when the lead replies to a campaign email",
    },
    {
        value: "emailsBounced",
        label: "Email bounced",
        description:
            "Fires when a campaign email bounces, and reports the bounce reason lemlist received",
    },
    {
        value: "emailsUnsubscribed",
        label: "Lead unsubscribed via email",
        description: "Fires when the lead unsubscribes from a campaign email",
    },
    {
        value: "emailsInterested",
        label: "Lead marked as interested from an email",
        description: "Fires when the lead is marked as interested off the back of an email reply",
    },
    {
        value: "emailsNotInterested",
        label: "Lead marked as not interested from an email",
        description:
            "Fires when the lead is marked as not interested off the back of an email reply",
    },
    {
        value: "aircallCreated",
        label: "Aircall call task created for lead",
        description: "Fires when a campaign creates an Aircall call task for the lead",
    },
    {
        value: "aircallEnded",
        label: "Aircall call ended with lead",
        description: "Fires when a call with the lead ends in Aircall",
    },
    {
        value: "aircallDone",
        label: "Aircall task marked as done",
        description: "Fires when the Aircall call step is completed for the lead",
    },
    {
        value: "aircallInterested",
        label: "Lead marked as interested via Aircall",
        description: "Fires when the lead is marked as interested after an Aircall call",
    },
    {
        value: "aircallNotInterested",
        label: "Lead marked as not interested via Aircall",
        description: "Fires when the lead is marked as not interested after an Aircall call",
    },
    {
        value: "linkedinVisitDone",
        label: "Lead's LinkedIn profile was visited",
        description: "Fires when a LinkedIn profile visit step completes for the lead",
    },
    {
        value: "linkedinVisitFailed",
        label: "LinkedIn profile visit failed",
        description:
            "Fires when a LinkedIn profile visit step fails, for example when the profile cannot be reached",
    },
    {
        value: "linkedinInviteDone",
        label: "LinkedIn connection invite sent",
        description: "Fires when a LinkedIn connection invite is sent to the lead",
    },
    {
        value: "linkedinInviteFailed",
        label: "LinkedIn connection invite failed",
        description: "Fires when a LinkedIn connection invite could not be sent to the lead",
    },
    {
        value: "linkedinInviteAccepted",
        label: "Lead accepted a LinkedIn connection invite",
        description:
            "Fires when the lead accepts the connection invite, which can be days after it was sent",
    },
    {
        value: "linkedinReplied",
        label: "Lead replied to a LinkedIn message",
        description: "Fires when the lead replies to a LinkedIn message from the campaign",
    },
    {
        value: "linkedinSent",
        label: "LinkedIn message sent to lead",
        description: "Fires when a campaign LinkedIn message is sent to the lead",
    },
    {
        value: "linkedinVoiceNoteDone",
        label: "LinkedIn voice note sent",
        description: "Fires when a LinkedIn voice note is sent to the lead",
    },
    {
        value: "linkedinVoiceNoteFailed",
        label: "LinkedIn voice note failed",
        description: "Fires when a LinkedIn voice note could not be sent to the lead",
    },
    {
        value: "linkedinInterested",
        label: "Lead marked as interested via LinkedIn",
        description: "Fires when the lead is marked as interested from a LinkedIn conversation",
    },
    {
        value: "linkedinNotInterested",
        label: "Lead marked as not interested via LinkedIn",
        description: "Fires when the lead is marked as not interested from a LinkedIn conversation",
    },
    {
        value: "linkedinSendFailed",
        label: "LinkedIn message failed to send",
        description:
            "Fires when a LinkedIn message could not be sent, for example when the lead is not a connection",
    },
    {
        value: "manualInterested",
        label: "Lead marked as interested via manual task",
        description:
            "Fires when someone marks the lead as interested while completing a manual task",
    },
    {
        value: "manualNotInterested",
        label: "Lead marked as not interested via manual task",
        description:
            "Fires when someone marks the lead as not interested while completing a manual task",
    },
    {
        value: "paused",
        label: "Lead paused in campaign",
        description: "Fires when the lead is paused, in lemlist or by the Pause lead step",
    },
    {
        value: "resumed",
        label: "Lead resumed in campaign",
        description: "Fires when a paused lead is resumed in the campaign",
    },
    {
        value: "sendLimitReached",
        label: "Daily send limit reached",
        description:
            "Fires when the sending account hits its daily limit and the remaining messages are postponed",
    },
    {
        value: "campaignComplete",
        label: "Lead completed all campaign steps",
        description: "Fires when the lead reaches the end of the campaign sequence",
    },
]

/**
 * Events lemlist no longer emits. Hidden from the list and from search so nobody picks them, but
 * still resolvable so workflows configured with them keep showing a label.
 */
const DEPRECATED_ACTIVITY_OPTIONS: Array<PlainComboboxOption> = [
    {
        value: "skipped",
        label: "Lead skipped a step (Deprecated)",
        description: "Fired when a campaign step was skipped for the lead",
    },
    {
        value: "opportunitiesDone",
        label: "Opportunity task completed (Deprecated)",
        description: "Fired when an opportunity task was completed for the lead",
    },
]

const ALL_ACTIVITY_OPTIONS = [...ACTIVITY_OPTIONS, ...DEPRECATED_ACTIVITY_OPTIONS]

export const EVENT_TYPES_WITH_CAMPAIGN_FILTER = new Set(["contacted", "paused", "resumed"])

export function hasCampaignFilter(eventType?: string): boolean {
    return EVENT_TYPES_WITH_CAMPAIGN_FILTER.has(eventType ?? "")
}

export const optionsProvider: PlainComboboxOptionsProvider = {
    getOption: async (value) => {
        const option = ALL_ACTIVITY_OPTIONS.find((o) => o.value === value)
        return option ? {label: option.label, description: option.description} : undefined
    },
    search: async (query) => {
        if (!query) return ACTIVITY_OPTIONS
        const q = query.toLowerCase()
        return ACTIVITY_OPTIONS.filter((o) =>
            [o.label, o.value].some((term) => term.toLowerCase().includes(q))
        )
    },
}
