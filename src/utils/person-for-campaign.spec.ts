import type {Result} from "@attio/fetchable"
import {describe, expect, it} from "vitest"
import {
    attioCompany,
    attioPerson,
    companyReference,
    domainValue,
    emailValue,
    locationValue,
    nameValue,
    phoneValue,
    textValue,
} from "../../test/utils/attio-fixtures"
import {
    attioRecordToLemlistPerson,
    buildContactBody,
    buildLeadBody,
    type LemlistPerson,
} from "./person-for-campaign"

function unwrap(result: Result<LemlistPerson, {code: "NO_EMAIL"}>): LemlistPerson | null {
    return result.state === "complete" ? result.value : null
}

describe("attioRecordToLemlistPerson", () => {
    it("maps every standard Attio field to the lemlist person shape", () => {
        const person = attioPerson({
            email_addresses: emailValue("jane@example.com"),
            name: nameValue("Jane", "Doe"),
            description: textValue("A summary"),
            primary_location: locationValue({
                locality: "San Francisco",
                region: "CA",
                country_code: "US",
            }),
            job_title: textValue("Engineer"),
            linkedin: textValue("https://linkedin.com/in/jane"),
            avatar_url: textValue("https://example.com/jane.png"),
            phone_numbers: phoneValue("+15551234567"),
            company: companyReference("company_1"),
        })
        const company = attioCompany({
            name: textValue("Acme"),
            domains: domainValue("acme.com"),
        })

        const result = unwrap(attioRecordToLemlistPerson({person, company}))

        expect(result).toEqual({
            email: "jane@example.com",
            additionalEmails: [],
            firstName: "Jane",
            lastName: "Doe",
            summary: "A summary",
            location: "San Francisco, CA, US",
            jobTitle: "Engineer",
            linkedinUrl: "https://linkedin.com/in/jane",
            picture: "https://example.com/jane.png",
            phone: "+15551234567",
            companyName: "Acme",
            companyDomain: "acme.com",
            customAttributes: {},
        })
    })

    it("keeps the first email as primary and the rest as additionalEmails", () => {
        const person = attioPerson({
            email_addresses: [
                ...emailValue("primary@example.com"),
                ...emailValue("work@example.com"),
                ...emailValue("personal@example.com"),
            ],
        })

        const result = unwrap(attioRecordToLemlistPerson({person, company: null}))

        expect(result?.email).toBe("primary@example.com")
        expect(result?.additionalEmails).toEqual(["work@example.com", "personal@example.com"])
    })

    it("returns no additionalEmails for a single email address", () => {
        const person = attioPerson({email_addresses: emailValue("jane@example.com")})

        const result = unwrap(attioRecordToLemlistPerson({person, company: null}))

        expect(result?.additionalEmails).toEqual([])
    })

    it("ignores blank email addresses when splitting primary from additional", () => {
        const person = attioPerson({
            email_addresses: [
                ...emailValue("   "),
                ...emailValue("primary@example.com"),
                ...emailValue("  extra@example.com  "),
            ],
        })

        const result = unwrap(attioRecordToLemlistPerson({person, company: null}))

        expect(result?.email).toBe("primary@example.com")
        expect(result?.additionalEmails).toEqual(["extra@example.com"])
    })

    it("returns a NO_EMAIL error when the person has no email address", () => {
        const person = attioPerson({name: nameValue("Jane", "Doe")})

        const result = attioRecordToLemlistPerson({person, company: null})

        expect(result.state).toBe("error")
        if (result.state === "error") {
            expect(result.error.code).toBe("NO_EMAIL")
        }
    })

    it("trims values and treats blank strings as missing", () => {
        const person = attioPerson({
            email_addresses: emailValue("  jane@example.com  "),
            name: nameValue("  ", "  "),
            job_title: textValue("   "),
        })

        const result = unwrap(attioRecordToLemlistPerson({person, company: null}))

        expect(result?.email).toBe("jane@example.com")
        expect(result?.firstName).toBeNull()
        expect(result?.lastName).toBeNull()
        expect(result?.jobTitle).toBeNull()
    })

    it("leaves company fields null when there is no linked company", () => {
        const person = attioPerson({email_addresses: emailValue("jane@example.com")})

        const result = unwrap(attioRecordToLemlistPerson({person, company: null}))

        expect(result?.companyName).toBeNull()
        expect(result?.companyDomain).toBeNull()
    })

    it("uses the first value when an attribute has several", () => {
        const person = attioPerson({
            email_addresses: [
                ...emailValue("primary@example.com"),
                ...emailValue("secondary@example.com"),
            ],
        })

        const result = unwrap(attioRecordToLemlistPerson({person, company: null}))

        expect(result?.email).toBe("primary@example.com")
    })

    it("includes non-ignored attributes and drops empty ones", () => {
        const person = attioPerson({
            email_addresses: emailValue("jane@example.com"),
            industry: textValue("SaaS"),
            seats: [{value: 50, attribute_type: "number"}],
            empty_note: textValue(""),
        })

        const result = unwrap(attioRecordToLemlistPerson({person, company: null}))

        expect(result?.customAttributes).toEqual({industry: "SaaS", seats: 50})
    })
})

const baseLeadPerson: LemlistPerson = {
    email: "jane@example.com",
    additionalEmails: [],
    firstName: "Jane",
    lastName: "Doe",
    summary: null,
    location: null,
    companyName: "Acme",
    jobTitle: "Engineer",
    linkedinUrl: "https://linkedin.com/in/jane",
    picture: "https://example.com/jane.png",
    phone: "+15551234567",
    companyDomain: "acme.com",
    customAttributes: {},
}

describe("buildContactBody", () => {
    it("includes shared person fields and the contact owner, omitting empty values", () => {
        const body = buildContactBody({
            person: {...baseLeadPerson, linkedinUrl: null, picture: null},
            contactOwner: "usr_alice",
        })

        expect(body).toEqual({
            email: "jane@example.com",
            firstName: "Jane",
            lastName: "Doe",
            jobTitle: "Engineer",
            phone: "+15551234567",
            companyDomain: "acme.com",
            contactOwner: "usr_alice",
        })
    })

    it("omits the contact owner and excludes lead-only fields", () => {
        const body = buildContactBody({person: baseLeadPerson, contactOwner: null})

        expect(body).not.toHaveProperty("contactOwner")
        expect(body).not.toHaveProperty("companyName")
    })

    it("includes the contact-only summary and location fields", () => {
        const body = buildContactBody({
            person: {...baseLeadPerson, summary: "A bio", location: "San Francisco, CA, US"},
            contactOwner: null,
        })

        expect(body).toMatchObject({summary: "A bio", location: "San Francisco, CA, US"})
    })

    it("includes additionalEmails only when the person has more than one email", () => {
        expect(buildContactBody({person: baseLeadPerson, contactOwner: null})).not.toHaveProperty(
            "additionalEmails"
        )

        const body = buildContactBody({
            person: {...baseLeadPerson, additionalEmails: ["work@example.com"]},
            contactOwner: null,
        })

        expect(body).toMatchObject({
            email: "jane@example.com",
            additionalEmails: ["work@example.com"],
        })
    })
})

describe("buildLeadBody", () => {
    it("adds companyName and prefixes custom attributes with attio_", () => {
        const body = buildLeadBody({
            person: {
                ...baseLeadPerson,
                customAttributes: {industry: "SaaS", seats: 50},
            },
            contactOwner: null,
        })

        expect(body).toMatchObject({
            email: "jane@example.com",
            companyName: "Acme",
            attio_industry: "SaaS",
            attio_seats: 50,
        })
    })

    it("includes the shared person fields and the contact owner", () => {
        const body = buildLeadBody({person: baseLeadPerson, contactOwner: "usr_alice"})

        expect(body).toMatchObject({
            email: "jane@example.com",
            firstName: "Jane",
            lastName: "Doe",
            jobTitle: "Engineer",
            linkedinUrl: "https://linkedin.com/in/jane",
            picture: "https://example.com/jane.png",
            phone: "+15551234567",
            companyDomain: "acme.com",
            contactOwner: "usr_alice",
        })
    })

    it("excludes the contact-only summary and location fields", () => {
        const body = buildLeadBody({
            person: {...baseLeadPerson, summary: "A bio", location: "San Francisco, CA, US"},
            contactOwner: null,
        })

        expect(body).not.toHaveProperty("summary")
        expect(body).not.toHaveProperty("location")
    })
})
