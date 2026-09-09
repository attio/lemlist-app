import {beforeEach, describe, expect, it, vi} from "vitest"

const mocks = vi.hoisted(() => ({
    getStoredEnrichmentCallback: vi.fn(),
    clearStoredEnrichmentCallback: vi.fn(),
    getEnrichmentResult: vi.fn(),
    fetch: vi.fn(),
    logger: {log: vi.fn(), error: vi.fn()},
}))

vi.mock("./callback-store", () => ({
    getStoredEnrichmentCallback: mocks.getStoredEnrichmentCallback,
    clearStoredEnrichmentCallback: mocks.clearStoredEnrichmentCallback,
}))

vi.mock("../../lemlist-api/enrich", () => ({
    getEnrichmentResult: mocks.getEnrichmentResult,
}))

vi.mock("../../common/logger", () => ({
    createLogger: () => mocks.logger,
}))

import {complete, errored} from "@attio/fetchable"
import {deliverEnrichmentResult} from "./deliver"

const completedResult = {
    status: "completed" as const,
    data: {enrichmentId: "enr_1", enrichmentStatus: "done" as const},
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal("fetch", mocks.fetch)
    mocks.getStoredEnrichmentCallback.mockResolvedValue("https://hooks.attio.com/finish")
    mocks.clearStoredEnrichmentCallback.mockResolvedValue(undefined)
    mocks.getEnrichmentResult.mockResolvedValue(complete(completedResult))
    mocks.fetch.mockResolvedValue(new Response(null, {status: 200}))
})

describe(deliverEnrichmentResult, () => {
    it("does nothing when no run is waiting on this enrichment", async () => {
        mocks.getStoredEnrichmentCallback.mockResolvedValue(null)

        expect(
            await deliverEnrichmentResult({enrichmentId: "enr_1", enrichmentFailed: false})
        ).toBe(true)
        expect(mocks.getEnrichmentResult).not.toHaveBeenCalled()
        expect(mocks.fetch).not.toHaveBeenCalled()
    })

    it("posts the fetched result and forgets the callback", async () => {
        expect(
            await deliverEnrichmentResult({enrichmentId: "enr_1", enrichmentFailed: false})
        ).toBe(true)

        expect(JSON.parse(mocks.fetch.mock.calls[0]?.[1].body)).toEqual({
            status: "ready",
            result: completedResult,
        })
        expect(mocks.clearStoredEnrichmentCallback).toHaveBeenCalledWith("enr_1")
    })

    it("asks lemlist to redeliver when the result is not ready yet", async () => {
        mocks.getEnrichmentResult.mockResolvedValue(
            complete({
                status: "in_progress",
                data: {enrichmentId: "enr_1", enrichmentStatus: "in-progress"},
            })
        )

        expect(
            await deliverEnrichmentResult({enrichmentId: "enr_1", enrichmentFailed: false})
        ).toBe(false)
        expect(mocks.fetch).not.toHaveBeenCalled()
        expect(mocks.clearStoredEnrichmentCallback).not.toHaveBeenCalled()
    })

    it("asks lemlist to redeliver a retryable fetch failure instead of failing the run", async () => {
        mocks.getEnrichmentResult.mockResolvedValue(errored({code: "RATE_LIMITED", detail: null}))

        expect(
            await deliverEnrichmentResult({enrichmentId: "enr_1", enrichmentFailed: false})
        ).toBe(false)
        expect(mocks.fetch).not.toHaveBeenCalled()
        expect(mocks.clearStoredEnrichmentCallback).not.toHaveBeenCalled()
    })

    it("fails the run for a fetch we cannot recover from", async () => {
        mocks.getEnrichmentResult.mockResolvedValue(
            errored({code: "UNEXPECTED_RESPONSE", detail: null})
        )

        expect(
            await deliverEnrichmentResult({enrichmentId: "enr_1", enrichmentFailed: false})
        ).toBe(true)
        expect(JSON.parse(mocks.fetch.mock.calls[0]?.[1].body)).toEqual({
            status: "error",
            errorMessage: "An unexpected error occurred when calling lemlist's API.",
        })
        expect(mocks.clearStoredEnrichmentCallback).toHaveBeenCalledWith("enr_1")
    })

    it("does not fetch when lemlist already reported the enrichment failed", async () => {
        expect(await deliverEnrichmentResult({enrichmentId: "enr_1", enrichmentFailed: true})).toBe(
            true
        )
        expect(mocks.getEnrichmentResult).not.toHaveBeenCalled()
        expect(JSON.parse(mocks.fetch.mock.calls[0]?.[1].body).status).toBe("error")
    })

    it("treats a gone run as delivered so lemlist does not disable the shared webhook", async () => {
        mocks.fetch.mockResolvedValue(new Response(null, {status: 404}))

        expect(
            await deliverEnrichmentResult({enrichmentId: "enr_1", enrichmentFailed: false})
        ).toBe(true)
        expect(mocks.clearStoredEnrichmentCallback).toHaveBeenCalledWith("enr_1")
    })

    it("asks lemlist to redeliver when the workflow is temporarily unavailable", async () => {
        mocks.fetch.mockResolvedValue(new Response(null, {status: 503}))

        expect(
            await deliverEnrichmentResult({enrichmentId: "enr_1", enrichmentFailed: false})
        ).toBe(false)
        expect(mocks.clearStoredEnrichmentCallback).not.toHaveBeenCalled()
    })
})
