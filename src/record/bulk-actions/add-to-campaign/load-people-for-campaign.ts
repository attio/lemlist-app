import {type AsyncResult, complete, isErrored, type Result} from "@attio/fetchable"
import {getCompaniesByRecordIds} from "../../../attio/companies"
import type {AttioApiError} from "../../../attio/error"
import {getPeopleByRecordIds} from "../../../attio/people"
import type {AttioCompany, AttioPerson} from "../../../attio/schemas"
import {createLogger} from "../../../utils/logger"
import {attioRecordToLemlistPerson, type LemlistPerson} from "../../../utils/person-for-campaign"

const logger = createLogger("load-people-for-campaign")

/**
 * Batched counterpart to loadPersonForLemlist for the bulk action. Loads every requested person in
 * a single Attio query, then loads all of their linked companies in a second query and matches them
 * back by record ID — so a batch of N people costs ~2 Attio requests.
 *
 * Individual records are returned as Result objects, with NO_EMAIL as a possble error code. Records
 * not found in Attio are omitted.
 */
export async function loadPeopleForCampaign(
    recordIds: string[]
): AsyncResult<Map<string, Result<LemlistPerson, {code: "NO_EMAIL"}>>, AttioApiError> {
    const peopleResult = await getPeopleByRecordIds(recordIds)
    if (isErrored(peopleResult)) {
        return peopleResult
    }

    const people = peopleResult.value
    const companiesByRecordId = await loadCompaniesForPeople(people)

    const peopleByRecordId = new Map<string, Result<LemlistPerson, {code: "NO_EMAIL"}>>()
    for (const person of people) {
        const companyRecordId = person.values.company?.[0]?.target_record_id
        const company = companyRecordId ? (companiesByRecordId.get(companyRecordId) ?? null) : null

        peopleByRecordId.set(person.id.record_id, attioRecordToLemlistPerson({person, company}))
    }

    return complete(peopleByRecordId)
}

/**
 * Resolves the companies linked from a batch of people in a single query, keyed by company record
 * ID. A failure is non-fatal (we just send no company data), matching the single-record behaviour.
 */
async function loadCompaniesForPeople(people: AttioPerson[]): Promise<Map<string, AttioCompany>> {
    const companyRecordIds = [
        ...new Set(
            people
                .map((person) => person.values.company?.[0]?.target_record_id)
                .filter((recordId): recordId is string => typeof recordId === "string")
        ),
    ]

    if (companyRecordIds.length === 0) {
        return new Map()
    }

    const companiesResult = await getCompaniesByRecordIds(companyRecordIds)
    if (isErrored(companiesResult)) {
        logger.error("Failed to load companies for batch; sending no company data")
        return new Map()
    }

    return new Map(companiesResult.value.map((company) => [company.id.record_id, company]))
}
