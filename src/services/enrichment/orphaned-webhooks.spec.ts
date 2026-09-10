import {describe, expect, it} from "vitest"
import type {LemlistWebhook} from "../../lemlist-api/schemas"
import {isOrphanedEnrichmentWebhook} from "./orphaned-webhooks"

const ATTIO_CALLBACK_URL =
    "https://hooks.attio.com/w/2d0b56f4-d0f5-4f4f-bf7c-96e8448cacf0/1c044f3b-619f-4eee-9680-ee2991b86fa4/defer/token"

function webhook(overrides: Partial<LemlistWebhook> = {}): LemlistWebhook {
    return {
        _id: "hoo_abc",
        targetUrl: ATTIO_CALLBACK_URL,
        createdAt: "2026-08-10T00:47:42.035Z",
        type: "enrichmentDone",
        disabled: true,
        ...overrides,
    }
}

describe(isOrphanedEnrichmentWebhook, () => {
    it("matches a disabled enrichmentDone webhook pointing at an Attio callback", () => {
        expect(isOrphanedEnrichmentWebhook(webhook())).toBe(true)
    })

    it("spares a webhook lemlist is still delivering to, which may belong to a live run", () => {
        expect(isOrphanedEnrichmentWebhook(webhook({disabled: false}))).toBe(false)
        expect(isOrphanedEnrichmentWebhook(webhook({disabled: undefined}))).toBe(false)
    })

    it("matches a disabled enrichmentError webhook pointing at an Attio callback", () => {
        expect(isOrphanedEnrichmentWebhook(webhook({type: "enrichmentError"}))).toBe(true)
    })

    it("spares event types the activity trigger uses", () => {
        expect(isOrphanedEnrichmentWebhook(webhook({type: "emailsSent"}))).toBe(false)
        expect(isOrphanedEnrichmentWebhook(webhook({type: undefined}))).toBe(false)
    })

    it("spares webhooks pointing somewhere other than Attio, which are the customer's own", () => {
        expect(
            isOrphanedEnrichmentWebhook(webhook({targetUrl: "https://hooks.zapier.com/enrichment"}))
        ).toBe(false)
    })

    it("spares a lookalike host that merely ends with the Attio callback domain", () => {
        expect(
            isOrphanedEnrichmentWebhook(
                webhook({targetUrl: "https://hooks.attio.com.evil.test/steal"})
            )
        ).toBe(false)
    })

    it("treats an unparseable target URL as not ours rather than assuming", () => {
        expect(isOrphanedEnrichmentWebhook(webhook({targetUrl: "not-a-url"}))).toBe(false)
    })
})
