import {complete, errored, isErrored} from "@attio/fetchable"
import {beforeEach, describe, expect, it, vi} from "vitest"
import {
    attioCompany,
    attioPerson,
    companyReference,
    domainValue,
    emailValue,
    textValue,
} from "../../../../test/utils/attio-fixtures"
import {getCompaniesByRecordIds} from "../../../attio/companies"
import {getPeopleByRecordIds} from "../../../attio/people"
import {loadPeopleForCampaign} from "./load-people-for-campaign"

vi.mock("../../../attio/people", () => ({getPeopleByRecordIds: vi.fn()}))
vi.mock("../../../attio/companies", () => ({getCompaniesByRecordIds: vi.fn()}))
vi.mock("../../../utils/logger", () => ({
    createLogger: () => ({log: vi.fn(), error: vi.fn()}),
}))

const mockGetPeople = vi.mocked(getPeopleByRecordIds)
const mockGetCompanies = vi.mocked(getCompaniesByRecordIds)

beforeEach(() => {
    vi.clearAllMocks()
    mockGetCompanies.mockResolvedValue(complete([]))
})

describe("loadPeopleForCampaign", () => {
    it("matches each linked company to the right person", async () => {
        mockGetPeople.mockResolvedValue(
            complete([
                attioPerson(
                    {
                        email_addresses: emailValue("jane@acme.com"),
                        company: companyReference("company_1"),
                    },
                    "person_1"
                ),
                attioPerson(
                    {
                        email_addresses: emailValue("john@globex.com"),
                        company: companyReference("company_2"),
                    },
                    "person_2"
                ),
            ])
        )
        mockGetCompanies.mockResolvedValue(
            complete([
                attioCompany(
                    {name: textValue("Acme"), domains: domainValue("acme.com")},
                    "company_1"
                ),
                attioCompany(
                    {name: textValue("Globex"), domains: domainValue("globex.com")},
                    "company_2"
                ),
            ])
        )

        const result = await loadPeopleForCampaign(["person_1", "person_2"])

        expect(isErrored(result)).toBe(false)
        if (isErrored(result)) {
            return
        }
        const person1Result = result.value.get("person_1")
        const person1 = person1Result?.state === "complete" ? person1Result.value : null
        expect(person1?.companyName).toBe("Acme")
        expect(person1?.companyDomain).toBe("acme.com")

        const person2Result = result.value.get("person_2")
        expect(person2Result?.state).toBe("complete")
        const person2 = person2Result?.state === "complete" ? person2Result.value : null
        expect(person2?.companyName).toBe("Globex")
        expect(person2?.companyDomain).toBe("globex.com")
    })

    it("queries companies once with de-duplicated record IDs", async () => {
        mockGetPeople.mockResolvedValue(
            complete([
                attioPerson(
                    {
                        email_addresses: emailValue("a@acme.com"),
                        company: companyReference("company_1"),
                    },
                    "person_1"
                ),
                attioPerson(
                    {
                        email_addresses: emailValue("b@acme.com"),
                        company: companyReference("company_1"),
                    },
                    "person_2"
                ),
            ])
        )

        await loadPeopleForCampaign(["person_1", "person_2"])

        expect(mockGetCompanies).toHaveBeenCalledTimes(1)
        expect(mockGetCompanies).toHaveBeenCalledWith(["company_1"])
    })

    it("does not query companies when no person has one", async () => {
        mockGetPeople.mockResolvedValue(
            complete([attioPerson({email_addresses: emailValue("jane@acme.com")}, "person_1")])
        )

        await loadPeopleForCampaign(["person_1"])

        expect(mockGetCompanies).not.toHaveBeenCalled()
    })

    it("stores a NO_EMAIL error for a person without an email address", async () => {
        mockGetPeople.mockResolvedValue(
            complete([attioPerson({name: textValue("No Email")}, "person_1")])
        )

        const result = await loadPeopleForCampaign(["person_1"])

        expect(isErrored(result)).toBe(false)
        if (isErrored(result)) {
            return
        }
        expect(result.value.has("person_1")).toBe(true)
        const person1Result = result.value.get("person_1")
        expect(person1Result?.state).toBe("error")
        if (person1Result?.state === "error") {
            expect(person1Result.error.code).toBe("NO_EMAIL")
        }
    })

    it("omits records that Attio did not return so the caller can treat them as not found", async () => {
        mockGetPeople.mockResolvedValue(
            complete([attioPerson({email_addresses: emailValue("jane@acme.com")}, "person_1")])
        )

        const result = await loadPeopleForCampaign(["person_1", "person_missing"])

        expect(isErrored(result)).toBe(false)
        if (isErrored(result)) {
            return
        }
        expect(result.value.has("person_missing")).toBe(false)
    })

    it("still returns people without company data when the company query fails", async () => {
        mockGetPeople.mockResolvedValue(
            complete([
                attioPerson(
                    {
                        email_addresses: emailValue("jane@acme.com"),
                        company: companyReference("company_1"),
                    },
                    "person_1"
                ),
            ])
        )
        mockGetCompanies.mockResolvedValue(errored({code: "UNEXPECTED_ERROR"}))

        const result = await loadPeopleForCampaign(["person_1"])

        expect(isErrored(result)).toBe(false)
        if (isErrored(result)) {
            return
        }
        const person1Result = result.value.get("person_1")
        const person1 = person1Result?.state === "complete" ? person1Result.value : null
        expect(person1?.email).toBe("jane@acme.com")
        expect(person1?.companyName).toBeNull()
    })

    it("includes custom attributes but excludes standard fields from customAttributes", async () => {
        mockGetPeople.mockResolvedValue(
            complete([
                attioPerson(
                    {email_addresses: emailValue("jane@acme.com"), industry: textValue("SaaS")},
                    "person_1"
                ),
            ])
        )

        const result = await loadPeopleForCampaign(["person_1"])

        expect(isErrored(result)).toBe(false)
        if (isErrored(result)) {
            return
        }
        const person1Result = result.value.get("person_1")
        const person1 = person1Result?.state === "complete" ? person1Result.value : null
        expect(person1?.customAttributes).toEqual({industry: "SaaS"})
    })

    it("propagates a failure to load the people themselves", async () => {
        mockGetPeople.mockResolvedValue(errored({code: "ATTIO_API_ERROR"}))

        const result = await loadPeopleForCampaign(["person_1"])

        expect(isErrored(result)).toBe(true)
        if (isErrored(result)) {
            expect(result.error.code).toBe("ATTIO_API_ERROR")
        }
        expect(mockGetCompanies).not.toHaveBeenCalled()
    })
})
