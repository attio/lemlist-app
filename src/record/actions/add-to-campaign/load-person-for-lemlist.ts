import {type AsyncResult, errored, isErrored} from "@attio/fetchable"
import {getCompanyByRecordId} from "../../../attio/companies"
import {getPersonByRecordId} from "../../../attio/people"
import type {AttioCompany} from "../../../attio/schemas"
import {createLogger} from "../../../utils/logger"
import {
    attioRecordToLemlistPerson,
    extractEmails,
    type LemlistPerson,
} from "../../../utils/person-for-campaign"
import type {AddPersonToCampaignError} from "./errors"

const logger = createLogger("load-person-for-campaign")

/**
 * Loads the full data we send to lemlist for a person, via the Attio REST API. The company
 * name and domain live on the linked company record, so we fetch that separately when present; a
 * missing or inaccessible company is non-fatal and simply omits those fields.
 */
export async function loadPersonForLemlist(
    recordId: string
): AsyncResult<LemlistPerson, AddPersonToCampaignError> {
    const personResult = await getPersonByRecordId(recordId)
    if (isErrored(personResult)) {
        return personResult
    }

    const person = personResult.value

    // error out early if no email
    const emails = extractEmails(person)
    if (emails.length === 0) {
        return errored({code: "NO_EMAIL"})
    }

    const companyRecordId = person.values.company?.[0]?.target_record_id

    let company: AttioCompany | null = null
    if (companyRecordId) {
        const companyResult = await getCompanyByRecordId(companyRecordId)
        if (isErrored(companyResult)) {
            // Best-effort: never block adding the person just because the linked company couldn't be
            // loaded. We omit the company fields.
            logger.error(
                `Failed to load company ${companyRecordId}; sending no company data: ${companyResult.error.code}`
            )
        } else {
            company = companyResult.value
        }
    }

    const personForLemlist = attioRecordToLemlistPerson({person, company})
    if (isErrored(personForLemlist)) {
        // attioRecordToLemlistPerson should only return null when there is no email address,
        // which is already checked above. If this is null here, we hit a bug.
        logger.error(
            "Unexpected null return from attioRecordToLemlistPerson where email already validated to be present"
        )
        return errored({code: "UNEXPECTED_ERROR"})
    }
    return personForLemlist
}
