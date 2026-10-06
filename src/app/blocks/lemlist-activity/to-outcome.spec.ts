import {describe, expect, it} from "vitest"
import {LemlistActivityPayloadSchema} from "../../../lemlist-api/schemas"
import {toOutcomeData} from "./to-outcome"

const CREATED_AT = "2026-08-10T00:47:42.035Z"

const payload = (overrides: Record<string, unknown> = {}) => {
    const parsed = LemlistActivityPayloadSchema.parse({
        type: "emailsReplied",
        createdAt: CREATED_AT,
        campaignId: "cam_1",
        campaignName: "Campaign one",
        leadId: "lea_1",
        leadEmail: "lead@example.com",
        leadFirstName: "Ada",
        leadLastName: "Lovelace",
        subject: "Re: hello",
        ...overrides,
    })

    return parsed
}

describe("LemlistActivityPayloadSchema createdAt", () => {
    it.each([CREATED_AT, "2026-08-10T02:47:42.035+02:00"])(
        "accepts the ISO 8601 timestamp %s",
        (createdAt) => {
            expect(payload({createdAt}).createdAt).toBe(createdAt)
        }
    )

    it.each([undefined, "2026-08-10"])("rejects the payload when createdAt is %s", (createdAt) => {
        const parsed = LemlistActivityPayloadSchema.safeParse({type: "emailsReplied", createdAt})

        expect(parsed.success).toBe(false)
    })
})

describe("toOutcomeData", () => {
    it("exposes created_at as a timestamp", () => {
        expect(toOutcomeData(payload()).created_at).toEqual(new Date(CREATED_AT))
    })

    it.each([
        ["emailsSent", {subject: "Hello"}],
        ["emailsClicked", {subject: "Hello", linkUrl: "https://example.com"}],
        ["emailsBounced", {subject: "Hello", bounceReason: "hard"}],
        ["linkedinReplied", {linkedinUrl: "https://linkedin.com/in/ada"}],
        // Not handled by a dedicated branch so it falls through to the base outcome
        ["smsReplied", {}],
    ])("exposes created_at for %s activities", (type, extra) => {
        const data = toOutcomeData(payload({type, ...extra}))

        expect(data.created_at).toEqual(new Date(CREATED_AT))
    })

    it("maps the lead and campaign fields alongside the timestamp", () => {
        expect(toOutcomeData(payload())).toEqual({
            campaign_id: "cam_1",
            campaign_name: "Campaign one",
            lead_id: "lea_1",
            lead_email: {type: "email-address", value: "lead@example.com"},
            lead_first_name: "Ada",
            lead_last_name: "Lovelace",
            subject: "Re: hello",
            created_at: new Date(CREATED_AT),
        })
    })

    it("falls back to empty strings for missing optional fields", () => {
        const data = toOutcomeData(payload({campaignName: undefined, leadEmail: undefined}))

        expect(data.campaign_name).toBe("")
        expect(data.lead_email).toBeUndefined()
    })

    describe("unsubscribes", () => {
        const unsubscribedFromCampaignEmail = {
            _id: "act_1",
            type: "entityUnsubscribed",
            unsubscribedSource: "lead",
            mutationAction: "unsubscribe",
            mutationType: "entity",
            createdAt: CREATED_AT,
            leadId: "lea_1",
            campaignId: "cam_1",
            campaignName: "Campaign one",
            leadFirstName: "Ada",
            leadLastName: "Lovelace",
            leadEmail: "ada@example.com",
            contactId: "ctc_1",
            email: "ada@example.com",
            firstName: "Ada",
            lastName: "Lovelace",
            doNotContact: "true",
            unsubEmail: "true",
        }

        it("maps the contact and campaign fields", () => {
            const data = toOutcomeData(
                LemlistActivityPayloadSchema.parse(unsubscribedFromCampaignEmail)
            )

            expect(data).toEqual({
                contact_id: "ctc_1",
                contact_email: {type: "email-address", value: "ada@example.com"},
                contact_first_name: "Ada",
                contact_last_name: "Lovelace",
                campaign_id: "cam_1",
                campaign_name: "Campaign one",
                created_at: new Date(CREATED_AT),
            })
        })

        it("leaves the campaign fields unset outside a campaign", () => {
            const data = toOutcomeData(
                LemlistActivityPayloadSchema.parse({
                    ...unsubscribedFromCampaignEmail,
                    campaignId: undefined,
                    campaignName: undefined,
                })
            )

            expect(data).toMatchObject({
                contact_id: "ctc_1",
                campaign_id: undefined,
                campaign_name: undefined,
            })
        })
    })
})
