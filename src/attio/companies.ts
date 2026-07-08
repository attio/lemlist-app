import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {createLogger} from "../utils/logger"
import {attioGet, attioPost} from "./client"
import type {AttioApiError} from "./error"
import {
    type AttioCompany,
    AttioGetCompanyResponseSchema,
    AttioQueryCompaniesResponseSchema,
} from "./schemas"

const logger = createLogger("attio companies")

export async function getCompanyByRecordId(
    recordId: string
): AsyncResult<AttioCompany, AttioApiError> {
    const result = await attioGet(`/v2/objects/companies/records/${recordId}`)
    if (isErrored(result)) {
        return result
    }

    const parsed = AttioGetCompanyResponseSchema.safeParse(result.value)

    if (!parsed.success) {
        logger.error(`Unexpected Attio company response: ${parsed.error.message}`)
        return errored({code: "UNEXPECTED_ERROR"})
    }

    return complete(parsed.data.data)
}

/**
 * Fetches multiple companies in a single request via the records query endpoint, filtering by record
 * ID. Used to resolve the companies linked from a batch of people in one call.
 */
export async function getCompaniesByRecordIds(
    recordIds: string[]
): AsyncResult<AttioCompany[], AttioApiError> {
    if (recordIds.length === 0) {
        return complete([])
    }

    const result = await attioPost("/v2/objects/companies/records/query", {
        filter: {record_id: {$in: recordIds}},
        limit: recordIds.length,
    })
    if (isErrored(result)) {
        return result
    }

    const parsed = AttioQueryCompaniesResponseSchema.safeParse(result.value)

    if (!parsed.success) {
        logger.error(`Unexpected Attio companies query response: ${parsed.error.message}`)
        return errored({code: "UNEXPECTED_ERROR"})
    }

    return complete(parsed.data.data)
}
