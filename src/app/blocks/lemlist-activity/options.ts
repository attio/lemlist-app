import type {PlainComboboxOption, PlainComboboxOptionsProvider} from "attio/client"

export const ACTIVITY_OPTIONS: Array<PlainComboboxOption> = [
    {value: "contacted", label: "Lead entered a campaign"},
    {value: "hooked", label: "Lead marked as hooked"},
    {value: "attracted", label: "Lead marked as attracted"},
    {value: "warmed", label: "Lead marked as warmed"},
    {value: "interested", label: "Lead marked as interested"},
    {value: "skipped", label: "Lead skipped a step"},
    {value: "notInterested", label: "Lead marked as not interested"},
    {value: "emailsSent", label: "Email sent to lead"},
    {value: "emailsOpened", label: "Lead opened an email"},
    {value: "emailsClicked", label: "Lead clicked a link in an email"},
    {value: "emailsReplied", label: "Lead replied to an email"},
    {value: "emailsBounced", label: "Email bounced"},
    {value: "emailsUnsubscribed", label: "Lead unsubscribed via email"},
    {value: "emailsInterested", label: "Lead marked as interested from an email"},
    {value: "emailsNotInterested", label: "Lead marked as not interested from an email"},
    {value: "opportunitiesDone", label: "Opportunity task completed"},
    {value: "aircallCreated", label: "Aircall call task created for lead"},
    {value: "aircallEnded", label: "Aircall call ended with lead"},
    {value: "aircallDone", label: "Aircall task marked as done"},
    {value: "aircallInterested", label: "Lead marked as interested via Aircall"},
    {value: "aircallNotInterested", label: "Lead marked as not interested via Aircall"},
    {value: "linkedinVisitDone", label: "Lead's LinkedIn profile was visited"},
    {value: "linkedinVisitFailed", label: "LinkedIn profile visit failed"},
    {value: "linkedinInviteDone", label: "LinkedIn connection invite sent"},
    {value: "linkedinInviteFailed", label: "LinkedIn connection invite failed"},
    {value: "linkedinInviteAccepted", label: "Lead accepted a LinkedIn connection invite"},
    {value: "linkedinReplied", label: "Lead replied to a LinkedIn message"},
    {value: "linkedinSent", label: "LinkedIn message sent to lead"},
    {value: "linkedinVoiceNoteDone", label: "LinkedIn voice note sent"},
    {value: "linkedinVoiceNoteFailed", label: "LinkedIn voice note failed"},
    {value: "linkedinInterested", label: "Lead marked as interested via LinkedIn"},
    {value: "linkedinNotInterested", label: "Lead marked as not interested via LinkedIn"},
    {value: "linkedinSendFailed", label: "LinkedIn message failed to send"},
    {value: "manualInterested", label: "Lead marked as interested via manual task"},
    {value: "manualNotInterested", label: "Lead marked as not interested via manual task"},
    {value: "paused", label: "Lead paused in campaign"},
    {value: "resumed", label: "Lead resumed in campaign"},
    {value: "sendLimitReached", label: "Send limit reached"},
    {value: "campaignComplete", label: "Lead completed all campaign steps"},
]

export const EVENT_TYPES_WITH_CAMPAIGN_FILTER = new Set(["contacted", "paused", "resumed"])

export function hasCampaignFilter(eventType?: string): boolean {
    return EVENT_TYPES_WITH_CAMPAIGN_FILTER.has(eventType ?? "")
}

export const optionsProvider: PlainComboboxOptionsProvider = {
    getOption: async (value) => {
        const option = ACTIVITY_OPTIONS.find((o) => o.value === value)
        return option ? {label: option.label} : undefined
    },
    search: async (query) => {
        if (!query) return ACTIVITY_OPTIONS
        const q = query.toLowerCase()
        return ACTIVITY_OPTIONS.filter(
            (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
        )
    },
}
