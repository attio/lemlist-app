import {beforeEach, describe, expect, it, vi} from "vitest"
import type {LemlistApiMocks} from "../../test/utils/create-lemlist-api-mocks"

const lemlistApiMocks = vi.hoisted(
    (): LemlistApiMocks => ({
        mockLemlistGet: vi.fn(),
        mockLemlistPost: vi.fn(),
        mockUpsertContact: vi.fn(),
        mockLogger: {
            log: vi.fn(),
            error: vi.fn(),
        },
    })
)

vi.mock("./client", () => ({
    lemlistApi: {
        get: lemlistApiMocks.mockLemlistGet,
        post: lemlistApiMocks.mockLemlistPost,
    },
}))
vi.mock("../utils/logger", () => ({
    createLogger: () => lemlistApiMocks.mockLogger,
}))

import {errored, isErrored} from "@attio/fetchable"
import {apiSuccess} from "../../test/mocks/lemlist-api-client"
import {endpoints} from "./endpoints"
import {getLeadByEmail, pauseLead} from "./leads"

const {mockLemlistGet, mockLemlistPost, mockLogger} = lemlistApiMocks

const sampleLead = {
    _id: "lead_123",
    state: "inprogress",
    status: "active",
    isPaused: false,
    source: "api",
    contactId: "ctc_contact_1",
    campaign: {id: "cam_456", name: "Outbound"},
    variables: {email: "jane@example.com", firstName: "Jane", lastName: "Doe"},
}

beforeEach(() => {
    vi.resetAllMocks()
})

describe("getLeadByEmail", () => {
    it("returns parsed leads on success", async () => {
        mockLemlistGet.mockResolvedValue(apiSuccess([sampleLead]))

        const result = await getLeadByEmail("jane@example.com")

        expect(isErrored(result)).toBe(false)
        if (!isErrored(result)) {
            expect(result.value).toEqual([sampleLead])
        }
        expect(mockLemlistGet).toHaveBeenCalledWith(endpoints.api.leadByEmail("jane@example.com"), {
            version: "v2",
        })
    })

    it("returns empty array on 404", async () => {
        mockLemlistGet.mockResolvedValue(errored({statusCode: 404, errorMessage: "Not found"}))

        const result = await getLeadByEmail("nobody@example.com")

        expect(isErrored(result)).toBe(false)
        if (!isErrored(result)) {
            expect(result.value).toEqual([])
        }
    })

    it("propagates non-404 API errors", async () => {
        const apiError = {statusCode: 500, errorMessage: "Server error"}
        mockLemlistGet.mockResolvedValue(errored(apiError))

        const result = await getLeadByEmail("jane@example.com")

        expect(result).toEqual(errored(apiError))
        expect(mockLogger.error).toHaveBeenCalledWith("Failed to fetch lead by email", {
            statusCode: 500,
        })
    })

    it("returns parse error for invalid response data", async () => {
        mockLemlistGet.mockResolvedValue(apiSuccess([{_id: 123, state: "inprogress"}]))

        const result = await getLeadByEmail("jane@example.com")

        expect(isErrored(result)).toBe(true)
        if (isErrored(result)) {
            expect(result.error.statusCode).toBe(0)
            expect(result.error.errorMessage).toBe("Unexpected response from lemlist API")
        }
    })

    it("trims whitespace from email before calling API", async () => {
        mockLemlistGet.mockResolvedValue(apiSuccess([]))

        await getLeadByEmail("  jane@example.com  ")

        expect(mockLemlistGet).toHaveBeenCalledWith(endpoints.api.leadByEmail("jane@example.com"), {
            version: "v2",
        })
    })

    it("returns empty array for empty response", async () => {
        mockLemlistGet.mockResolvedValue(apiSuccess([]))

        const result = await getLeadByEmail("jane@example.com")

        expect(isErrored(result)).toBe(false)
        if (!isErrored(result)) {
            expect(result.value).toEqual([])
        }
    })

    it("returns multiple leads across campaigns", async () => {
        const leads = [
            {...sampleLead, _id: "lead_1", campaign: {id: "cam_1", name: "Campaign A"}},
            {...sampleLead, _id: "lead_2", campaign: {id: "cam_2", name: "Campaign B"}},
        ]
        mockLemlistGet.mockResolvedValue(apiSuccess(leads))

        const result = await getLeadByEmail("jane@example.com")

        expect(isErrored(result)).toBe(false)
        if (!isErrored(result)) {
            expect(result.value).toHaveLength(2)
            expect(result.value[0]._id).toBe("lead_1")
            expect(result.value[1]._id).toBe("lead_2")
        }
    })
})

const samplePausedLead = {
    _id: "lea_fiDpiGV585wy3Oii2",
    isPaused: true,
    campaignId: "cam_bSn8EORHQxbWPjHvu",
}

describe("pauseLead", () => {
    it("pauses lead and returns parsed response", async () => {
        mockLemlistPost.mockResolvedValue(apiSuccess([samplePausedLead]))

        const result = await pauseLead("lea_fiDpiGV585wy3Oii2")

        expect(isErrored(result)).toBe(false)
        if (!isErrored(result)) {
            expect(result.value).toEqual([samplePausedLead])
        }
        expect(mockLemlistPost).toHaveBeenCalledWith(
            endpoints.api.pauseLead("lea_fiDpiGV585wy3Oii2"),
            undefined,
            undefined
        )
    })

    it("passes campaignId as query param when provided", async () => {
        mockLemlistPost.mockResolvedValue(apiSuccess([samplePausedLead]))

        await pauseLead("lea_fiDpiGV585wy3Oii2", "cam_bSn8EORHQxbWPjHvu")

        expect(mockLemlistPost).toHaveBeenCalledWith(
            endpoints.api.pauseLead("lea_fiDpiGV585wy3Oii2"),
            undefined,
            {campaignId: "cam_bSn8EORHQxbWPjHvu"}
        )
    })

    it("propagates API errors", async () => {
        const apiError = {statusCode: 500, errorMessage: "Server error"}
        mockLemlistPost.mockResolvedValue(errored(apiError))

        const result = await pauseLead("lea_fiDpiGV585wy3Oii2")

        expect(result).toEqual(errored(apiError))
        expect(mockLogger.error).toHaveBeenCalledWith("Failed to pause lead", {
            statusCode: 500,
            leadId: "lea_fiDpiGV585wy3Oii2",
        })
    })

    it("returns parse error for invalid response", async () => {
        mockLemlistPost.mockResolvedValue(apiSuccess([{_id: 123}]))

        const result = await pauseLead("lea_fiDpiGV585wy3Oii2")

        expect(isErrored(result)).toBe(true)
        if (isErrored(result)) {
            expect(result.error.statusCode).toBe(0)
            expect(result.error.errorMessage).toBe("Unexpected response from lemlist API")
        }
    })
})
