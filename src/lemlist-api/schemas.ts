import {z} from "zod"

const LemlistContactCampaignSchema = z.object({
    campaignId: z.string(),
    campaignState: z.string(),
    leadState: z.string(),
    leadId: z.string(),
})

export const LemlistContactSchema = z.object({
    _id: z.string(),
    teamId: z.string().optional(),
    fullName: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    fields: z.record(z.string(), z.unknown()).optional(),
    campaigns: z.array(LemlistContactCampaignSchema).optional(),
    ownerId: z.string().optional(),
    createdAt: z.string().optional(),
    createdBy: z.string().optional(),
    unsubscribed: z.boolean().optional(),
})

export type LemlistContact = z.infer<typeof LemlistContactSchema>

const LemlistLeadByEmailItemSchema = z.object({
    _id: z.string(),
    state: z.string(),
    status: z.string(),
    isPaused: z.boolean(),
    source: z.string(),
    contactId: z.string(),
    variables: z
        .object({
            email: z.string().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            companyName: z.string().optional(),
            jobTitle: z.string().optional(),
            companyDomain: z.string().optional(),
        })
        .optional(),
    campaign: z.object({
        id: z.string(),
        name: z.string().optional(),
        status: z.string().optional(),
    }),
    enrichment: z
        .object({
            emailStatus: z.string().optional(),
        })
        .optional(),
})

export const LemlistLeadByEmailSchema = z.array(LemlistLeadByEmailItemSchema)

export type LemlistLeadByEmail = z.infer<typeof LemlistLeadByEmailSchema>

export const LemlistUpsertContactResponseSchema = z.object({
    success: z.boolean(),
    data: z
        .object({
            _id: z.string(),
        })
        .optional(),
})

const LemlistCampaignSchema = z.object({
    _id: z.string(),
    name: z.string(),
    status: z.string().optional(),
})

export type LemlistCampaign = z.infer<typeof LemlistCampaignSchema>

function normalizeCampaignListResponse(response: unknown): unknown {
    if (Array.isArray(response)) {
        return response
    }

    if (typeof response === "object" && response !== null) {
        const record = response as Record<string, unknown>

        if (Array.isArray(record.campaigns)) {
            return record.campaigns
        }

        if (Array.isArray(record.data)) {
            return record.data
        }

        if (Array.isArray(record.results)) {
            return record.results
        }
    }

    return response
}

export const LemlistCampaignListSchema = z.preprocess(
    normalizeCampaignListResponse,
    z.array(LemlistCampaignSchema)
)

export const LemlistPauseLeadResponseSchema = z.array(
    z.object({
        _id: z.string(),
        isPaused: z.boolean(),
        campaignId: z.string(),
    })
)

export type LemlistPauseLeadResponse = z.infer<typeof LemlistPauseLeadResponseSchema>

export const LemlistCreateLeadResponseSchema = z.object({
    _id: z.string(),
    campaignId: z.string(),
    campaignName: z.string().optional(),
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    contactId: z.string().optional(),
})

export type LemlistCreateLeadResponse = z.infer<typeof LemlistCreateLeadResponseSchema>

export const LemlistWebhookEventTypeSchema = z.enum([
    "contacted",
    "hooked",
    "attracted",
    "warmed",
    "interested",
    "skipped",
    "notInterested",
    "opportunitiesDone",
    "emailsSent",
    "emailsOpened",
    "emailsClicked",
    "emailsReplied",
    "emailsBounced",
    "emailsFailed",
    "emailsInterested",
    "emailsNotInterested",
    "emailsUnsubscribed",
    "linkedinSent",
    "linkedinOpened",
    "linkedinReplied",
    "linkedinInterested",
    "linkedinNotInterested",
    "linkedinSendFailed",
    "linkedinVisitDone",
    "linkedinVisitFailed",
    "linkedinFollowDone",
    "linkedinFollowFailed",
    "linkedinFollowSkipped",
    "linkedinInviteDone",
    "linkedinInviteFailed",
    "linkedinInviteAccepted",
    "linkedinEndorseDone",
    "linkedinEndorseFailed",
    "linkedinEndorseSkipped",
    "linkedinVoiceNoteDone",
    "linkedinVoiceNoteFailed",
    "linkedinLikeLastPostDone",
    "linkedinLikeLastPostNoPost",
    "linkedinLikeLastPostFailed",
    "linkedinWithdrawInvitationDone",
    "linkedinWithdrawInvitationFailed",
    "whatsappMessageSent",
    "whatsappMessageDelivered",
    "whatsappMessageOpened",
    "whatsappReplied",
    "whatsappMessageFailed",
    "smsSent",
    "smsDelivered",
    "smsReplied",
    "smsFailed",
    "aircallCreated",
    "aircallEnded",
    "aircallDone",
    "aircallInterested",
    "aircallNotInterested",
    "apiDone",
    "apiInterested",
    "apiNotInterested",
    "apiFailed",
    "manualInterested",
    "manualNotInterested",
    "paused",
    "resumed",
    "stopped",
    "campaignComplete",
    "customDomainErrors",
    "connectionIssue",
    "sendLimitReached",
    "lemwarmPaused",
    "annotated",
    "enrichmentDone",
    "enrichmentError",
    "callRecordingDone",
    "callTranscriptDone",
    "inboxLabelUpdated",
    "signalRegistered",
    "deliverabilityAlertTriggered",
])

export type LemlistWebhookEventType = z.infer<typeof LemlistWebhookEventTypeSchema>

export const CreateLemlistWebhookRequestSchema = z.object({
    targetUrl: z.string().url(),
    type: LemlistWebhookEventTypeSchema.optional(),
    secret: z.string().optional(),
})

export type CreateLemlistWebhookRequest = z.infer<typeof CreateLemlistWebhookRequestSchema>

export type CreateLemlistWebhookParams = {
    campaignId?: string
    isFirst?: boolean
    zapId?: string
}

export const LemlistWebhookSchema = z.object({
    _id: z.string(),
    targetUrl: z.string(),
    createdAt: z.string(),
    type: LemlistWebhookEventTypeSchema.optional(),
    campaignId: z.string().optional(),
})

export type LemlistWebhook = z.infer<typeof LemlistWebhookSchema>

export const LemlistActivityPayloadSchema = z
    .object({
        type: LemlistWebhookEventTypeSchema,
        campaignId: z.string().optional(),
        campaignName: z.string().optional(),
        leadId: z.string().optional(),
        leadEmail: z.string().optional(),
        leadFirstName: z.string().optional(),
        leadLastName: z.string().optional(),
        subject: z.string().optional(),
        linkUrl: z.string().optional(),
        bounceReason: z.string().optional(),
        linkedinUrl: z.string().optional(),
    })
    .passthrough()

/** POST /enrich acknowledges the job with an enrichment id; results arrive via webhook. */
export const LemlistEnrichPostResponseSchema = z.object({
    id: z.string(),
})

/**
 * Minimal webhook schema used only to match the enrichment id in the resume callback.
 * Full data is fetched via GET /enrich/{id}.
 */
export const LemlistEnrichmentDoneWebhookMinimalSchema = z.object({
    type: z.literal("enrichmentDone"),
    data: z.array(z.object({id: z.string()})),
})

/** GET /enrich/{enrichId} response — all data keys are optional */
export const LemlistEnrichGetResponseSchema = z.object({
    enrichmentId: z.string(),
    enrichmentStatus: z.enum(["in-progress", "done"]),
    input: z.record(z.string(), z.unknown()).optional(),
    data: z
        .object({
            email: z
                .object({
                    email: z.string().optional(),
                    status: z.string().optional(),
                    notFound: z.boolean().optional(),
                })
                .optional(),
            phone: z
                .object({
                    phone: z.string().optional(),
                })
                .optional(),
            linkedin: z
                .object({
                    linkedinUrl: z.string().optional(),
                    firstName: z.string().optional(),
                    lastName: z.string().optional(),
                    locationName: z.string().optional(),
                    industry: z.string().optional(),
                    companyName: z.string().optional(),
                    companyDomain: z.string().optional(),
                    occupation: z.string().optional(),
                    tagline: z.string().optional(),
                })
                .optional(),
        })
        .optional(),
})

export type LemlistEnrichGetResponse = z.infer<typeof LemlistEnrichGetResponseSchema>

const LemlistCompanySchema = z.object({
    _id: z.string(),
    name: z.string().optional(),
    domain: z.string().optional(),
})

export type LemlistCompany = z.infer<typeof LemlistCompanySchema>

export const LemlistCompanyListSchema = z.object({data: z.array(LemlistCompanySchema)})

export const LemlistTeamResponseSchema = z.object({
    userIds: z.array(z.string()),
})

export const LemlistUserSchema = z.object({
    _id: z.string(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
})

export type LemlistUser = z.infer<typeof LemlistUserSchema>

export const LemlistCreateTaskRequestSchema = z.object({
    assignedTo: z.string(),
    recordId: z.string(),
    type: z.string(),
    dueDate: z.string(),
    priority: z.enum(["", "0", "1", "2"]).optional(),
    title: z.string().optional(),
    description: z.string().optional(),
})

export type LemlistCreateTaskRequest = z.infer<typeof LemlistCreateTaskRequestSchema>

export const LemlistCreateTaskResponseSchema = z.object({
    _id: z.string(),
    type: z.string(),
    title: z.string().optional(),
    priority: z.number().optional(),
    leadId: z.string().optional(),
    campaignId: z.string().optional(),
    contactId: z.string().optional(),
    dueDate: z.string(),
    userId: z.string().optional(),
    content: z.string().optional(),
})

export type LemlistCreateTaskResponse = z.infer<typeof LemlistCreateTaskResponseSchema>
