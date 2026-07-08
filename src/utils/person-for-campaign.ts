import {complete, errored, type Result} from "@attio/fetchable"
import {extractAttioAttributeValue} from "../attio/attribute-value"
import type {AttioCompany, AttioPerson} from "../attio/schemas"
import {ATTIO_IGNORE_SLUGS} from "./ignore-slugs"

/**
 * Normalised person data we send to lemlist, built from an Attio record (see
 * {@link attioRecordToLemlistPerson}) or directly from workflow-block config. It feeds both the
 * lemlist contact upsert and the lemlist lead creation; only leads are tied to a campaign.
 */
export type LemlistPerson = {
    email: string
    additionalEmails: string[]
    firstName: string | null
    lastName: string | null
    summary: string | null
    location: string | null
    companyName: string | null
    companyDomain: string | null
    jobTitle: string | null
    linkedinUrl: string | null
    picture: string | null
    phone: string | null
    customAttributes: Record<string, unknown>
}

/** Prefix applied to every Attio custom attribute sent to lemlist, e.g. `attio_industry`. */
const CUSTOM_ATTRIBUTE_PREFIX = "attio_"

type BuildBodyArgs = {
    person: LemlistPerson
    contactOwnerEmail: string | null
}

function omitEmpty(
    entries: ReadonlyArray<readonly [string, string | null | undefined]>
): Record<string, string> {
    return Object.fromEntries(
        entries.filter((entry): entry is [string, string] => Boolean(entry[1]))
    )
}

/**
 * Fields accepted by POST /contacts (upsert). Deliberately excludes lead-only fields: the company
 * name and the Attio custom variables, which only belong on the campaign lead.
 */
export function buildContactBody({
    person,
    contactOwnerEmail,
}: BuildBodyArgs): Record<string, unknown> {
    return {
        ...omitEmpty([
            ["email", person.email],
            ["firstName", person.firstName],
            ["lastName", person.lastName],
            ["summary", person.summary],
            ["location", person.location],
            ["companyDomain", person.companyDomain],
            ["jobTitle", person.jobTitle],
            ["linkedinUrl", person.linkedinUrl],
            ["picture", person.picture],
            ["phone", person.phone],
            ["contactOwner", contactOwnerEmail],
        ]),
        // lemlist takes the primary address as `email` and any extras as `additionalEmails`.
        ...(person.additionalEmails.length ? {additionalEmails: person.additionalEmails} : {}),
    }
}

/**
 * Fields sent when creating a campaign lead. Independent from {@link buildContactBody} on purpose:
 * the lead carries the company name and the prefixed Attio custom variables, but not the rich
 * profile fields (summary, location) that only the contact endpoint accepts.
 */
export function buildLeadBody({person, contactOwnerEmail}: BuildBodyArgs): Record<string, unknown> {
    return {
        ...omitEmpty([
            ["email", person.email],
            ["firstName", person.firstName],
            ["lastName", person.lastName],
            ["companyName", person.companyName],
            ["companyDomain", person.companyDomain],
            ["jobTitle", person.jobTitle],
            ["linkedinUrl", person.linkedinUrl],
            ["picture", person.picture],
            ["phone", person.phone],
            ["contactOwner", contactOwnerEmail],
        ]),
        ...prefixCustomAttributes(person.customAttributes),
    }
}

function prefixCustomAttributes(custom: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(custom).map(([key, value]) => [`${CUSTOM_ATTRIBUTE_PREFIX}${key}`, value])
    )
}

function asText(value: unknown): string | null {
    return typeof value === "string" ? value : null
}

export function extractEmails(person: AttioPerson): string[] {
    return (person.values.email_addresses ?? [])
        .map((entry) => entry.email_address.trim())
        .filter((value) => value.length > 0)
}

/**
 * Builds the custom-variable map sent to lemlist from an Attio record's `values`. Only slugs that
 * Attio reports as user-defined custom attributes are included, and empty values are dropped.
 */
function extractCustomAttributes(values: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const [slug, value] of Object.entries(values)) {
        if (ATTIO_IGNORE_SLUGS.has(slug)) {
            continue
        }
        const extractedValue = extractAttioAttributeValue(value)
        if (extractedValue !== null) {
            result[slug] = extractedValue
        }
    }

    return result
}

/**
 * Maps an Attio person record (and its optional linked company record) fetched via the REST API
 * into the {@link LemlistPerson} shape.
 *
 * The company name and domain live on the linked company record, so callers must fetch that record
 * separately and pass it in.
 *
 * `customAttributeSlugs` is the set of user-defined attribute slugs (see
 * {@link getPersonCustomAttributeSlugs}); the matching values are forwarded to lemlist as custom
 * variables.
 */
export function attioRecordToLemlistPerson({
    person,
    company,
}: {
    person: AttioPerson
    company: AttioCompany | null
}): Result<LemlistPerson, {code: "NO_EMAIL"}> {
    const emails = extractEmails(person)
    if (emails.length === 0) {
        return errored({code: "NO_EMAIL"})
    }
    const email = emails[0]

    const name = person.values.name?.[0]

    return complete({
        email,
        additionalEmails: emails.slice(1),
        firstName: name?.first_name?.trim() || null,
        lastName: name?.last_name?.trim() || null,
        summary: asText(extractAttioAttributeValue(person.values.description)),
        location: asText(extractAttioAttributeValue(person.values.primary_location)),
        companyName: asText(extractAttioAttributeValue(company?.values.name)),
        companyDomain: asText(extractAttioAttributeValue(company?.values.domains)),
        jobTitle: asText(extractAttioAttributeValue(person.values.job_title)),
        linkedinUrl: asText(extractAttioAttributeValue(person.values.linkedin)),
        picture: asText(extractAttioAttributeValue(person.values.avatar_url)),
        phone: asText(extractAttioAttributeValue(person.values.phone_numbers)),
        customAttributes: extractCustomAttributes(person.values),
    })
}
