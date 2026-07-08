import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {createLogger} from "../utils/logger"
import {type LemlistApiError, lemlistApi} from "./client"
import {endpoints} from "./endpoints"
import {schemaParseError} from "./error"
import {
    type LemlistContact,
    LemlistContactSchema,
    LemlistUpsertContactResponseSchema,
} from "./schemas"

const logger = createLogger("lemlist contacts")

type LemlistContactDisplayFields = {
    company: string | null
    description: string | null
    tagline: string | null
    phone: string | null
    linkedinUrl: string | null
    skills: string[]
}

function getFieldString(
    fields: Record<string, unknown> | undefined,
    keys: readonly string[]
): string | null {
    if (!fields) {
        return null
    }

    for (const key of keys) {
        const value = fields[key]

        if (typeof value === "string" && value.trim()) {
            return value.trim()
        }
    }

    return null
}

function getFieldStringList(
    fields: Record<string, unknown> | undefined,
    keys: readonly string[]
): string[] {
    const value = getFieldString(fields, keys)

    if (!value) {
        return []
    }

    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
}

export function getContactDisplayFields(contact: LemlistContact): LemlistContactDisplayFields {
    const fields = contact.fields

    return {
        company: getFieldString(fields, ["companyName", "company"]),
        description: getFieldString(fields, ["summary", "description", "jobDescription"]),
        tagline: getFieldString(fields, ["tagline"]),
        phone: getFieldString(fields, ["phone", "phoneNumber"]),
        linkedinUrl: getFieldString(fields, ["linkedinUrl", "linkedin", "linkedInUrl"]),
        skills: getFieldStringList(fields, ["skills"]),
    }
}

/**
 * Retrieves a lemlist contact by ID or email address.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/contacts/get-contact
 */
export async function getContact(
    idOrEmail: string
): AsyncResult<LemlistContact | null, LemlistApiError> {
    const responseResult = await lemlistApi.get(endpoints.api.contact(idOrEmail.trim()))

    if (isErrored(responseResult)) {
        if (responseResult.error.statusCode === 404) {
            return complete(null)
        }

        return responseResult
    }

    const parsed = LemlistContactSchema.safeParse(responseResult.value.data)

    if (!parsed.success) {
        return errored(schemaParseError(parsed.error.message))
    }

    return complete(parsed.data)
}

/**
 * Creates or updates a lemlist contact before adding them to a campaign.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/contacts/upsert-contact
 */
export async function upsertContact(
    body: Record<string, unknown>
): AsyncResult<string, LemlistApiError> {
    const responseResult = await lemlistApi.post(endpoints.api.contacts, body)

    if (isErrored(responseResult)) {
        return responseResult
    }

    const parsed = LemlistUpsertContactResponseSchema.safeParse(responseResult.value.data)

    if (!parsed.success) {
        return errored(schemaParseError(parsed.error.message))
    }

    if (!parsed.data.success) {
        return errored(schemaParseError("success_false"))
    }

    const id = parsed.data.data?._id
    if (!id) {
        const fallbackId = typeof body.email === "string" ? body.email : ""
        logger.error(
            `Upsert contact response had no _id; falling back to ${fallbackId ? "email" : "empty id"}`
        )
        return complete(fallbackId)
    }

    return complete(id)
}
