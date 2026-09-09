import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"

const mocks = vi.hoisted(() => ({
    createWebhook: vi.fn(),
    listWebhooks: vi.fn(),
}))

vi.mock("../../lemlist-api/webhooks", () => ({
    createWebhook: mocks.createWebhook,
    listWebhooks: mocks.listWebhooks,
}))

import {complete, isErrored} from "@attio/fetchable"
import {createWebhookHandler, deleteWebhookHandler, kv, updateWebhookHandler} from "attio/server"
import type {LemlistWebhook} from "../../lemlist-api/schemas"
import {ensureEnrichmentWebhooks, retainLiveEnrichmentWebhooks} from "./register-webhooks"
import {CLEANUP_TIME_BUDGET_MS} from "./orphaned-webhooks"

function listed(overrides: Partial<LemlistWebhook> = {}): LemlistWebhook {
    return {
        _id: "hoo_live",
        targetUrl: "https://hooks.attio.com/enrichment",
        createdAt: "2026-09-08T00:00:00.000Z",
        type: "enrichmentDone",
        disabled: false,
        ...overrides,
    }
}

function inMemoryKv(initial: Record<string, unknown> = {}) {
    const store = new Map(Object.entries(initial))

    vi.mocked(kv.get).mockImplementation(async (key: string) => {
        if (!store.has(key)) {
            return null
        }

        return {value: store.get(key)}
    })
    vi.mocked(kv.set).mockImplementation(async (key: string, value: unknown) => {
        store.set(key, value)
    })
    vi.mocked(kv.delete).mockImplementation(async (key: string) => {
        store.delete(key)
    })

    return store
}

describe(retainLiveEnrichmentWebhooks, () => {
    const registered = [
        {eventType: "enrichmentDone", lemlistWebhookId: "hoo_done"},
        {eventType: "enrichmentError", lemlistWebhookId: "hoo_error"},
    ]

    it("keeps registrations lemlist is still delivering to", () => {
        expect(
            retainLiveEnrichmentWebhooks(registered, [
                listed({_id: "hoo_done"}),
                listed({_id: "hoo_error", type: "enrichmentError"}),
            ])
        ).toEqual(registered)
    })

    it("drops a webhook lemlist has disabled, so the next ensure call replaces it", () => {
        expect(
            retainLiveEnrichmentWebhooks(registered, [
                listed({_id: "hoo_done", disabled: true}),
                listed({_id: "hoo_error", type: "enrichmentError"}),
            ])
        ).toEqual([registered[1]])
    })

    it("drops a webhook that is no longer on the account", () => {
        expect(
            retainLiveEnrichmentWebhooks(registered, [
                listed({_id: "hoo_error", type: "enrichmentError"}),
            ])
        ).toEqual([registered[1]])
    })
})

describe(ensureEnrichmentWebhooks, () => {
    beforeEach(() => {
        vi.resetAllMocks()
        vi.useFakeTimers()
        inMemoryKv()
        mocks.listWebhooks.mockResolvedValue(complete([]))
        vi.mocked(updateWebhookHandler).mockResolvedValue(undefined)
        vi.mocked(deleteWebhookHandler).mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("waits and continues when another run finishes registering", async () => {
        const store = inMemoryKv({"enrichment-webhooks-verified-at": Date.now()})
        const pending = ensureEnrichmentWebhooks()

        await vi.advanceTimersByTimeAsync(0)
        store.set("enrichment-webhooks", [
            {eventType: "enrichmentDone", handlerId: "h1", lemlistWebhookId: "hoo_done"},
            {eventType: "enrichmentError", handlerId: "h2", lemlistWebhookId: "hoo_error"},
        ])
        await vi.advanceTimersByTimeAsync(CLEANUP_TIME_BUDGET_MS)

        expect(isErrored(await pending)).toBe(false)
        expect(createWebhookHandler).not.toHaveBeenCalled()
        expect(mocks.createWebhook).not.toHaveBeenCalled()
    })

    it("does not create when another run is still registering after the wait", async () => {
        inMemoryKv({"enrichment-webhooks-verified-at": Date.now()})
        const pending = ensureEnrichmentWebhooks()
        await vi.advanceTimersByTimeAsync(CLEANUP_TIME_BUDGET_MS)
        const result = await pending

        expect(isErrored(result)).toBe(true)
        if (isErrored(result)) {
            expect(result.error.code).toBe("RETRY")
        }
        expect(createWebhookHandler).not.toHaveBeenCalled()
        expect(mocks.createWebhook).not.toHaveBeenCalled()
    })

    it("creates the pair when nothing is stored yet", async () => {
        let handlers = 0
        vi.mocked(createWebhookHandler).mockImplementation(async () => {
            handlers += 1
            return {id: `handler_${handlers}`, url: `https://hooks.attio.com/h${handlers}`}
        })

        let webhooks = 0
        mocks.createWebhook.mockImplementation(async () => {
            webhooks += 1
            return complete(listed({_id: `hoo_${webhooks}`}))
        })

        const result = await ensureEnrichmentWebhooks()

        expect(isErrored(result)).toBe(false)
        expect(createWebhookHandler).toHaveBeenCalledTimes(2)
        expect(mocks.createWebhook).toHaveBeenCalledTimes(2)
    })
})
