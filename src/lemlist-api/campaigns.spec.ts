import {beforeEach, describe, expect, it, vi} from "vitest"
import type {LemlistApiMocks} from "../../test/utils/create-lemlist-api-mocks"

const lemlistApiMocks = vi.hoisted((): LemlistApiMocks => ({
    mockLemlistGet: vi.fn(),
    mockLemlistPost: vi.fn(),
    mockUpsertContact: vi.fn(),
    mockLogger: {
        log: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock("./transport/lemlist", () => ({
    lemlistApi: {
        get: lemlistApiMocks.mockLemlistGet,
        post: lemlistApiMocks.mockLemlistPost,
    },
}))
vi.mock("./contacts", () => ({
    upsertContact: lemlistApiMocks.mockUpsertContact,
}))
vi.mock("../common/logger", () => ({
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
        const apiError = {code: "LEMLIST_SERVER_ERROR" as const, detail: "server error"}
        mockLemlistGet.mockResolvedValue(errored(apiError))

        const result = await listCampaigns()

        expect(result).toEqual(errored(apiError))
    })

    it("returns a parse error for invalid response data", async () => {
        mockLemlistGet.mockResolvedValue(apiSuccess([{_id: 1, name: "Bad"}]))

        const result = await listCampaigns()

        expect(isErrored(result)).toBe(true)
        if (isErrored(result)) {
            expect(result.error.code).toBe("UNEXPECTED_RESPONSE")
        }
    })
})

describe("createLeadInCampaign", () => {
    it("creates the lead in one request when the person has no contact-only fields", async () => {
        const result = await createLeadInCampaign({
            campaignId: "cam_456",
            person: samplePerson,
            contactOwner: null,
            addLeadQueryParams: defaultAddLeadParams,
        })

        expect(isErrored(result)).toBe(false)
        if (!isErrored(result)) {
            expect(result.value).toEqual(sampleLeadResponse)
        }
        expect(mockUpsertContact).not.toHaveBeenCalled()
        expect(mockLemlistPost).toHaveBeenCalledOnce()
        expect(mockLemlistPost).toHaveBeenCalledWith(
            endpoints.api.campaignLeads("cam_456"),
            expect.not.objectContaining({contactId: expect.anything()}),
            {}
        )
    })

    it.each([
        ["summary", {summary: "Founder"}],
        ["location", {location: "Paris"}],
        ["additionalEmails", {additionalEmails: ["jane@work.example.com"]}],
    ])("upserts the contact first when the person has %s", async (_field, extra) => {
        await createLeadInCampaign({
            campaignId: "cam_456",
            person: {...samplePerson, ...extra},
            contactOwner: null,
            addLeadQueryParams: defaultAddLeadParams,
        })

        expect(mockUpsertContact).toHaveBeenCalledWith(expect.objectContaining(extra))
        expect(mockLemlistPost).toHaveBeenCalledOnce()
    })

    it("sends a resolved Lemlist user ID as contactOwner on create and upsert", async () => {
        await createLeadInCampaign({
            campaignId: "cam_456",
            person: {...samplePerson, summary: "Founder"},
            contactOwner: "usr_alice",
            addLeadQueryParams: defaultAddLeadParams,
        })

        expect(mockUpsertContact).toHaveBeenCalledWith(
            expect.objectContaining({contactOwner: "usr_alice"})
        )
        expect(mockLemlistPost).toHaveBeenCalledWith(
            endpoints.api.campaignLeads("cam_456"),
            expect.objectContaining({contactOwner: "usr_alice"}),
            {}
        )
    })

    it("passes enrichment and deduplicate as query params on the create request", async () => {
        await createLeadInCampaign({
            campaignId: "cam_456",
            person: samplePerson,
            contactOwner: null,
            addLeadQueryParams: {
                ...defaultAddLeadParams,
                verifyEmail: true,
                findPhone: true,
                deduplicate: true,
            },
        })

        expect(mockLemlistPost).toHaveBeenCalledOnce()
        expect(mockLemlistPost).toHaveBeenCalledWith(
            endpoints.api.campaignLeads("cam_456"),
            expect.any(Object),
            {verifyEmail: true, findPhone: true, deduplicate: true}
        )
    })

    it("skips enrichments for fields the person already has", async () => {
        await createLeadInCampaign({
            campaignId: "cam_456",
            person: samplePerson,
            contactOwner: null,
            addLeadQueryParams: {...defaultAddLeadParams, findEmail: true},
        })

        expect(mockLemlistPost).toHaveBeenCalledWith(
            endpoints.api.campaignLeads("cam_456"),
            expect.any(Object),
            {}
        )
    })

    it("returns contact upsert errors without creating a lead", async () => {
        const contactError = {code: "INVALID_REQUEST" as const, detail: "invalid contact"}
        mockUpsertContact.mockResolvedValue(errored(contactError))

        const result = await createLeadInCampaign({
            campaignId: "cam_456",
            person: {...samplePerson, location: "Paris"},
            contactOwner: null,
            addLeadQueryParams: defaultAddLeadParams,
        })

        expect(result).toEqual(errored(contactError))
        expect(mockLemlistPost).not.toHaveBeenCalled()
    })

    it("returns campaign lead API errors", async () => {
        const leadError = {code: "UNEXPECTED_ERROR" as const, detail: "lead rejected"}
        mockLemlistPost.mockResolvedValue(errored(leadError))

        const result = await createLeadInCampaign({
            campaignId: "cam_456",
            person: samplePerson,
            contactOwner: null,
            addLeadQueryParams: defaultAddLeadParams,
        })

        expect(result).toEqual(errored(leadError))
    })

    it("accepts a create response without an email", async () => {
        mockLemlistPost.mockResolvedValue(apiSuccess({_id: "lead_123", campaignId: "cam_456"}))

        const result = await createLeadInCampaign({
            campaignId: "cam_456",
            person: samplePerson,
            contactOwner: null,
            addLeadQueryParams: defaultAddLeadParams,
        })

        expect(isErrored(result)).toBe(false)
    })
})
