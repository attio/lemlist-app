import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import type {LemlistApiError} from "../../../lemlist-api/client"
import {getContact, getContactDisplayFields} from "../../../lemlist-api/contacts"
import {endpoints} from "../../../lemlist-api/endpoints"
import {createLogger} from "../../../utils/logger"

const logger = createLogger("open-in-lemlist")

export type OpenInLemlistResult = {
    url: string
    fullName: string | null
    company: string | null
    description: string | null
    tagline: string | null
    phone: string | null
    skills: string[]
}

export default async function openInLemlist(
    email: string
): AsyncResult<OpenInLemlistResult, LemlistApiError> {
    const contactResult = await getContact(email)

    if (isErrored(contactResult)) {
        logger.error(
            `Failed to get lemlist link by email: ${email} — ${contactResult.error.errorMessage}`
        )
        return contactResult
    }

    const contact = contactResult.value

    if (contact === null) {
        return errored({statusCode: 404, errorMessage: "Contact not found in lemlist"})
    }

    const {company, description, tagline, phone, skills} = getContactDisplayFields(contact)

    return complete({
        url: endpoints.app.contact(contact._id),
        fullName: contact.fullName ?? null,
        company,
        description,
        tagline,
        phone,
        skills,
    })
}
