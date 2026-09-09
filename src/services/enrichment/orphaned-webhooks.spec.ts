import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import type {LemlistWebhook} from "../../lemlist-api/schemas"
import {findDuplicateEnrichmentWebhooks, isOrphanedEnrichmentWebhook} from "./orphaned-webhooks"

const ATTIO_CALLBACK_URL =
    "https://hooks.attio.com/w/2d0b56f4-d0f5-4f4f-bf7c-96e8448cacf0/1c044f3b-619f-4eee-9680-ee2991b86fa4/defer/token"

const OWN_WORKSPACE_ID = "2d0b56f4-d0f5-4f4f-bf7c-96e8448cacf0"
const OTHER_WORKSPACE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

function appWebhookUrl(workspaceId: string, handlerId: string): string {
    return `https://hooks.attio.com/a/${workspaceId}/${handlerId}`
}

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

describe(findDuplicateEnrichmentWebhooks, () => {
    const oldEnoughAt = "2026-01-01T00:00:00.000Z"
    const tracked = webhook({
        _id: "hoo_tracked",
        targetUrl: appWebhookUrl(OWN_WORKSPACE_ID, "handler_1"),
        disabled: false,
        createdAt: oldEnoughAt,
    })
    const trackedIds = new Set([tracked._id])

    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2026-01-01T00:01:00.000Z"))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("finds an enabled, untracked webhook on our own workspace once past the grace window", () => {
        const duplicate = webhook({
            _id: "hoo_duplicate",
            targetUrl: appWebhookUrl(OWN_WORKSPACE_ID, "handler_2"),
            disabled: false,
            createdAt: oldEnoughAt,
        })

        expect(findDuplicateEnrichmentWebhooks([tracked, duplicate], trackedIds)).toEqual([
            duplicate,
        ])
    })

    it("spares a webhook still inside the grace window, which may just not be in KV yet", () => {
        const justCreated = webhook({
            _id: "hoo_new",
            targetUrl: appWebhookUrl(OWN_WORKSPACE_ID, "handler_2"),
            disabled: false,
            createdAt: new Date().toISOString(),
        })

        expect(findDuplicateEnrichmentWebhooks([tracked, justCreated], trackedIds)).toEqual([])
    })

    it("spares an untracked webhook on another workspace sharing this lemlist account", () => {
        const otherWorkspace = webhook({
            _id: "hoo_other",
            targetUrl: appWebhookUrl(OTHER_WORKSPACE_ID, "handler_9"),
            disabled: false,
            createdAt: oldEnoughAt,
        })

        expect(findDuplicateEnrichmentWebhooks([tracked, otherWorkspace], trackedIds)).toEqual([])
    })

    it("spares a disabled webhook, which the orphan check already covers", () => {
        const disabled = webhook({
            _id: "hoo_disabled",
            targetUrl: appWebhookUrl(OWN_WORKSPACE_ID, "handler_2"),
            disabled: true,
            createdAt: oldEnoughAt,
        })

        expect(findDuplicateEnrichmentWebhooks([tracked, disabled], trackedIds)).toEqual([])
    })

    it("finds nothing when none of our tracked webhooks are in the listing to read a workspace id from", () => {
        const duplicate = webhook({
            _id: "hoo_duplicate",
            targetUrl: appWebhookUrl(OWN_WORKSPACE_ID, "handler_2"),
            disabled: false,
            createdAt: oldEnoughAt,
        })

        expect(findDuplicateEnrichmentWebhooks([duplicate], trackedIds)).toEqual([])
    })
})
