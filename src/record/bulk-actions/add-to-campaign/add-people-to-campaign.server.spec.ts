import {complete, errored} from "@attio/fetchable"
import {beforeEach, describe, expect, it, vi} from "vitest"
import {defaultAddLeadParams, sampleLeadResponse} from "../../../../test/utils/fixtures"
import {createLeadInCampaign, getAddLeadQueryParams} from "../../../lemlist-api/campaigns"
import type {LemlistPerson} from "../../../utils/person-for-campaign"
import addPeopleToCampaign from "./add-people-to-campaign.server"
import {loadPeopleForCampaign} from "./load-people-for-campaign"

vi.mock("./load-people-for-campaign", () => ({loadPeopleForCampaign: vi.fn()}))
vi.mock("../../../lemlist-api/campaigns", () => ({
    createLeadInCampaign: vi.fn(),
    getAddLeadQueryParams: vi.fn(),
}))
vi.mock("../../../utils/logger", () => ({
    createLogger: () => ({log: vi.fn(), error: vi.fn()}),
}))

const mockLoadPeople = vi.mocked(loadPeopleForCampaign)
const mockCreateLead = vi.mocked(createLeadInCampaign)
const mockGetAddLeadQueryParams = vi.mocked(getAddLeadQueryParams)

const person = (email: string): LemlistPerson => ({
    email,
    additionalEmails: [],
    firstName: null,
    lastName: null,
    summary: null,
    location: null,
    companyName: null,
    jobTitle: null,
    linkedinUrl: null,
    picture: null,
    phone: null,
    companyDomain: null,
    customAttributes: {},
})

beforeEach(() => {
    vi.clearAllMocks()
    mockGetAddLeadQueryParams.mockResolvedValue(defaultAddLeadParams)
    mockCreateLead.mockResolvedValue(complete(sampleLeadResponse))
})

describe("addPeopleToCampaign", () => {
    it("maps each load outcome to the matching status", async () => {
        mockLoadPeople.mockResolvedValue(
            complete(
                new Map([
                    ["ok", complete(person("ok@example.com"))],
                    ["no_email", errored({code: "NO_EMAIL"})],
                    // "missing" is intentionally absent → not found in Attio
                ])
            )
        )
        mockCreateLead.mockResolvedValue(complete(sampleLeadResponse))

        const outcomes = await addPeopleToCampaign({
            recordIds: ["ok", "no_email", "missing"],
            campaignId: "cam_1",
            contactOwner: "usr_alice",
        })

        expect(outcomes).toEqual([
            {recordId: "ok", status: "success"},
            {recordId: "no_email", status: "skipped_no_email"},
            {recordId: "missing", status: "skipped_not_found"},
        ])
        expect(mockCreateLead).toHaveBeenCalledOnce()
        expect(mockCreateLead).toHaveBeenCalledWith(
            expect.objectContaining({contactOwner: "usr_alice"})
        )
    })

    it("reports a lemlist failure as an error outcome with its message", async () => {
        mockLoadPeople.mockResolvedValue(
            complete(new Map([["ok", complete(person("ok@example.com"))]]))
        )
        mockCreateLead.mockResolvedValue(errored({statusCode: 422, errorMessage: "Lead rejected"}))

        const outcomes = await addPeopleToCampaign({
            recordIds: ["ok"],
            campaignId: "cam_1",
            contactOwner: "usr_alice",
        })

        expect(outcomes).toEqual([{recordId: "ok", status: "error", errorMessage: "Lead rejected"}])
    })

    it("reports every record as an error when the whole batch fails to load", async () => {
        mockLoadPeople.mockResolvedValue(errored({code: "UNEXPECTED_ERROR"}))

        const outcomes = await addPeopleToCampaign({
            recordIds: ["a", "b"],
            campaignId: "cam_1",
            contactOwner: "usr_alice",
        })

        expect(outcomes).toEqual([
            {
                recordId: "a",
                status: "error",
                errorMessage: "Something went wrong loading this record from Attio.",
            },
            {
                recordId: "b",
                status: "error",
                errorMessage: "Something went wrong loading this record from Attio.",
            },
        ])
        expect(mockCreateLead).not.toHaveBeenCalled()
    })

    it("only creates leads for people with an email address", async () => {
        mockLoadPeople.mockResolvedValue(
            complete(
                new Map([
                    ["a", complete(person("a@example.com"))],
                    ["b", errored({code: "NO_EMAIL"})],
                    ["c", complete(person("c@example.com"))],
                ])
            )
        )

        await addPeopleToCampaign({
            recordIds: ["a", "b", "c"],
            campaignId: "cam_1",
            contactOwner: "usr_alice",
        })

        expect(mockCreateLead).toHaveBeenCalledTimes(2)
        expect(mockCreateLead).toHaveBeenCalledWith(
            expect.objectContaining({
                campaignId: "cam_1",
                person: person("a@example.com"),
                contactOwner: "usr_alice",
            })
        )
    })

    it("passes a null contactOwner through when no owner is set", async () => {
        mockLoadPeople.mockResolvedValue(
            complete(new Map([["ok", complete(person("ok@example.com"))]]))
        )

        await addPeopleToCampaign({
            recordIds: ["ok"],
            campaignId: "cam_1",
            contactOwner: null,
        })

        expect(mockCreateLead).toHaveBeenCalledWith(expect.objectContaining({contactOwner: null}))
    })
})
