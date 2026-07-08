import type {AttioCompany, AttioPerson} from "../../src/attio/schemas"

/**
 * Test builders for the Attio record shapes returned by the REST API. `values` is intentionally
 * loosely typed so individual tests can supply exactly the attribute values they care about
 * (including arbitrary custom-attribute slugs, which Attio passes through).
 */
export function attioPerson(values: Record<string, unknown>, recordId = "person_1"): AttioPerson {
    return {
        id: {workspace_id: "ws_1", object_id: "people", record_id: recordId},
        created_at: "2024-01-01T00:00:00.000Z",
        web_url: `https://app.attio.com/people/${recordId}`,
        values,
    } as unknown as AttioPerson
}

export function attioCompany(
    values: Record<string, unknown>,
    recordId = "company_1"
): AttioCompany {
    return {
        id: {workspace_id: "ws_1", object_id: "companies", record_id: recordId},
        values,
    } as unknown as AttioCompany
}

export const textValue = (value: string) => [{value, attribute_type: "text"}]

export const emailValue = (email_address: string) => [
    {email_address, attribute_type: "email-address"},
]

export const nameValue = (firstName: string | null, lastName: string | null) => [
    {
        first_name: firstName,
        last_name: lastName,
        full_name: [firstName, lastName].filter(Boolean).join(" "),
        attribute_type: "personal-name",
    },
]

export const phoneValue = (original_phone_number: string) => [
    {original_phone_number, attribute_type: "phone-number"},
]

export const domainValue = (domain: string) => [{domain, attribute_type: "domain"}]

export const locationValue = (parts: Record<string, string>) => [
    {...parts, attribute_type: "location"},
]

export const companyReference = (targetRecordId: string) => [
    {
        target_object: "companies",
        target_record_id: targetRecordId,
        attribute_type: "record-reference",
    },
]
