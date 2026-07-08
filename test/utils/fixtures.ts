import type {AddLeadQueryParams} from "../../src/lemlist-api/format"
import type {LemlistPerson} from "../../src/utils/person-for-campaign"

export const defaultContactId = "ctc_contact_1"

export const defaultAddLeadParams: AddLeadQueryParams = {
    linkedinEnrichment: false,
    verifyEmail: false,
    findEmail: false,
    findPhone: false,
    deduplicate: false,
}

export const samplePerson: LemlistPerson = {
    email: "jane@example.com",
    additionalEmails: [],
    firstName: "Jane",
    lastName: "Doe",
    summary: null,
    location: null,
    companyName: "Acme",
    jobTitle: null,
    linkedinUrl: null,
    picture: null,
    phone: null,
    companyDomain: null,
    customAttributes: {},
}

export const sampleLeadResponse = {
    _id: "lead_123",
    campaignId: "cam_456",
    email: "jane@example.com",
}
