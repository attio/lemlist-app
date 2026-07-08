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
vi.mock("./contacts", () => ({
    upsertContact: lemlistApiMocks.mockUpsertContact,
}))
vi.mock("../utils/logger", () => ({
    createLogger: () => lemlistApiMocks.mockLogger,
}))

import {errored, isErrored} from "@attio/fetchable"
import {getWorkspaceSettings} from "attio/server"
import {apiSuccess} from "../../test/mocks/lemlist-api-client"
import {defaultAddLeadParams, sampleLeadResponse, samplePerson} from "../../test/utils/fixtures"
import {resetLemlistApiMocks} from "../../test/utils/reset-lemlist-api-mocks"
import {
    createLeadInCampaign,
    getAddLeadQueryParams,
    listCampaigns,
    mergeAddLeadQueryParams,
} from "./campaigns"
import {endpoints} from "./endpoints"

const {mockLemlistGet, mockLemlistPost, mockUpsertContact} = lemlistApiMocks
const mockGetWorkspaceSettings = vi.mocked(getWorkspaceSettings)

beforeEach(() => {
    resetLemlistApiMocks(lemlistApiMocks)
})

describe("mergeAddLeadQueryParams", () => {
    it("returns defaults when overrides are empty", () => {
        expect(
            mergeAddLeadQueryParams(
                {
                    linkedinEnrichment: true,
                    verifyEmail: true,
                    findEmail: true,
                    findPhone: true,
                    deduplicate: true,
                },
                {}
            )
        ).toEqual({
            linkedinEnrichment: true,
            verifyEmail: true,
            findEmail: true,
            findPhone: true,
            deduplicate: true,
        })
    })

    it("applies explicit false overrides over true defaults", () => {
        expect(
            mergeAddLeadQueryParams(
                {
                    linkedinEnrichment: true,
                    verifyEmail: true,
                    findEmail: true,
                    findPhone: true,
                    deduplicate: true,
                },
                {findEmail: false, deduplicate: false}
            )
        ).toEqual({
            linkedinEnrichment: true,
            verifyEmail: true,
            findEmail: false,
            findPhone: true,
            deduplicate: false,
        })
    })

    it("applies explicit true overrides over false defaults", () => {
        expect(
            mergeAddLeadQueryParams(defaultAddLeadParams, {
                findEmail: true,
                verifyEmail: true,
            })
        ).toEqual({
            ...defaultAddLeadParams,
            findEmail: true,
            verifyEmail: true,
        })
    })
})

describe("getAddLeadQueryParams", () => {
    it("maps workspace settings to query params", async () => {
        mockGetWorkspaceSettings.mockResolvedValue({
            linkedinEnrichment: true,
            verifyEmail: false,
            findEmail: true,
            findPhone: null,
            deduplicate: true,
        })

        await expect(getAddLeadQueryParams()).resolves.toEqual({
            linkedinEnrichment: true,
            verifyEmail: false,
            findEmail: true,
            findPhone: false,
            deduplicate: true,
        })
    })

    it("returns defaults when workspace settings fail to load", async () => {
        mockGetWorkspaceSettings.mockRejectedValue(new Error("settings_unavailable"))

        await expect(getAddLeadQueryParams()).resolves.toEqual(defaultAddLeadParams)
    })
})

describe("listCampaigns", () => {
    it("returns parsed campaigns on success", async () => {
        const campaigns = [{_id: "cam_1", name: "Outbound"}]
        mockLemlistGet.mockResolvedValue(apiSuccess(campaigns))

        const result = await listCampaigns()

        expect(isErrored(result)).toBe(false)
        if (!isErrored(result)) {
            expect(result.value).toEqual(campaigns)
        }
        expect(mockLemlistGet).toHaveBeenCalledWith(endpoints.api.campaigns, {
            version: "v2",
            offset: 0,
            limit: 100,
        })
    })

    it("fetches multiple pages of campaigns when needed", async () => {
        const campaigns = Array.from({length: 350}, (_, i) => ({
            _id: `cam_${i}`,
            name: i === 0 ? "Outbound" : `Outbound ${i}`,
        }))

        mockLemlistGet.mockImplementation((_path, params: {offset: number}) =>
            Promise.resolve(apiSuccess(campaigns.slice(params.offset, params.offset + 100)))
        )

        const result = await listCampaigns()

        expect(isErrored(result)).toBe(false)
        if (!isErrored(result)) {
            expect(result.value).toEqual(campaigns)
        }

        expect(mockLemlistGet).toHaveBeenCalledTimes(4)
        expect(mockLemlistGet).toHaveBeenNthCalledWith(1, endpoints.api.campaigns, {
            version: "v2",
            offset: 0,
            limit: 100,
        })
        expect(mockLemlistGet).toHaveBeenNthCalledWith(2, endpoints.api.campaigns, {
            version: "v2",
            offset: 100,
            limit: 100,
        })
        expect(mockLemlistGet).toHaveBeenNthCalledWith(3, endpoints.api.campaigns, {
            version: "v2",
            offset: 200,
            limit: 100,
        })
        expect(mockLemlistGet).toHaveBeenNthCalledWith(4, endpoints.api.campaigns, {
            version: "v2",
            offset: 300,
            limit: 100,
        })
    })

    it("returns partial results when the pagination time budget is exceeded", async () => {
        const campaigns = Array.from({length: 350}, (_, i) => ({
            _id: `cam_${i}`,
            name: `Outbound ${i}`,
        }))

        mockLemlistGet.mockImplementation((_path, params: {offset: number}) =>
            Promise.resolve(apiSuccess(campaigns.slice(params.offset, params.offset + 100)))
        )

        // startedAt=0, after page 1=5 000ms (under budget), after page 2=11 000ms (over 10 000ms budget)
        const dateNowSpy = vi
            .spyOn(Date, "now")
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(5_000)
            .mockReturnValueOnce(11_000)

        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

        const result = await listCampaigns()

        expect(isErrored(result)).toBe(false)
        if (!isErrored(result)) {
            expect(result.value).toEqual(campaigns.slice(0, 200))
        }
        expect(mockLemlistGet).toHaveBeenCalledTimes(2)
        expect(warnSpy).toHaveBeenCalledOnce()

        dateNowSpy.mockRestore()
        warnSpy.mockRestore()
    })

    it("propagates API errors", async () => {
        const apiError = {statusCode: 500, errorMessage: "Server error"}
        mockLemlistGet.mockResolvedValue(errored(apiError))

        const result = await listCampaigns()

        expect(result).toEqual(errored(apiError))
    })

    it("returns a parse error for invalid response data", async () => {
        mockLemlistGet.mockResolvedValue(apiSuccess([{_id: 1, name: "Bad"}]))

        const result = await listCampaigns()

        expect(isErrored(result)).toBe(true)
        if (isErrored(result)) {
            expect(result.error.statusCode).toBe(0)
            expect(result.error.errorMessage).toBe("Unexpected response from lemlist API")
        }
    })
})

describe("createLeadInCampaign", () => {
    it("creates a lead without calling enrich when enrichment is disabled", async () => {
        const result = await createLeadInCampaign({
            campaignId: "cam_456",
            person: samplePerson,
            contactOwnerEmail: null,
            addLeadQueryParams: defaultAddLeadParams,
        })

        expect(isErrored(result)).toBe(false)
        if (!isErrored(result)) {
            expect(result.value).toEqual(sampleLeadResponse)
        }
        expect(mockUpsertContact).toHaveBeenCalledOnce()
        expect(mockLemlistPost).toHaveBeenCalledOnce()
        expect(mockLemlistPost).toHaveBeenCalledWith(
            endpoints.api.campaignLeads("cam_456"),
            expect.objectContaining({
                email: "jane@example.com",
                contactId: "ctc_contact_1",
            }),
            {}
        )
    })

    it("calls enrich after creating a lead when enrichment params are enabled", async () => {
        const result = await createLeadInCampaign({
            campaignId: "cam_456",
            person: samplePerson,
            contactOwnerEmail: null,
            addLeadQueryParams: {
                ...defaultAddLeadParams,
                verifyEmail: true,
            },
        })

        expect(isErrored(result)).toBe(false)
        expect(mockLemlistPost).toHaveBeenCalledTimes(2)
        expect(mockLemlistPost).toHaveBeenNthCalledWith(
            2,
            endpoints.api.enrichLead("lead_123"),
            undefined,
            {verifyEmail: true}
        )
    })

    it("passes deduplicate on the campaign leads request", async () => {
        await createLeadInCampaign({
            campaignId: "cam_456",
            person: samplePerson,
            contactOwnerEmail: null,
            addLeadQueryParams: {
                ...defaultAddLeadParams,
                deduplicate: true,
            },
        })

        expect(mockLemlistPost).toHaveBeenCalledWith(
            endpoints.api.campaignLeads("cam_456"),
            expect.any(Object),
            {deduplicate: true}
        )
    })

    it("returns contact upsert errors without creating a lead", async () => {
        const contactError = {statusCode: 400, errorMessage: "Invalid contact"}
        mockUpsertContact.mockResolvedValue(errored(contactError))

        const result = await createLeadInCampaign({
            campaignId: "cam_456",
            person: samplePerson,
            contactOwnerEmail: null,
            addLeadQueryParams: defaultAddLeadParams,
        })

        expect(result).toEqual(errored(contactError))
        expect(mockLemlistPost).not.toHaveBeenCalled()
    })

    it("returns campaign lead API errors", async () => {
        const leadError = {statusCode: 422, errorMessage: "Lead rejected"}
        mockLemlistPost.mockResolvedValue(errored(leadError))

        const result = await createLeadInCampaign({
            campaignId: "cam_456",
            person: samplePerson,
            contactOwnerEmail: null,
            addLeadQueryParams: defaultAddLeadParams,
        })

        expect(result).toEqual(errored(leadError))
    })

    it("still completes when enrichment fails after the lead is created", async () => {
        mockLemlistPost
            .mockResolvedValueOnce(apiSuccess(sampleLeadResponse))
            .mockResolvedValueOnce(
                errored({statusCode: 500, errorMessage: "Enrichment unavailable"})
            )

        const result = await createLeadInCampaign({
            campaignId: "cam_456",
            person: samplePerson,
            contactOwnerEmail: null,
            addLeadQueryParams: {
                ...defaultAddLeadParams,
                verifyEmail: true,
            },
        })

        expect(isErrored(result)).toBe(false)
        if (!isErrored(result)) {
            expect(result.value._id).toBe("lead_123")
        }
        expect(mockLemlistPost).toHaveBeenCalledTimes(2)
    })
})
