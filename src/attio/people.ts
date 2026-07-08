import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {createLogger} from "../utils/logger"
import {attioGet, attioPost} from "./client"
import type {AttioApiError} from "./error"
import {
    AttioGetPersonResponseSchema,
    type AttioPerson,
    AttioQueryPeopleResponseSchema,
} from "./schemas"

const logger = createLogger("attio people")

export async function getPersonByRecordId(
    recordId: string
): AsyncResult<AttioPerson, AttioApiError> {
    const result = await attioGet(`/v2/objects/people/records/${recordId}`)
    if (isErrored(result)) {
        return result
    }

    const parsed = AttioGetPersonResponseSchema.safeParse(result.value)

    if (!parsed.success) {
        logger.error(`Unexpected Attio person response: ${parsed.error.message}`)
        return errored({code: "UNEXPECTED_ERROR"})
    }

    return complete(parsed.data.data)
}

/**
 * Fetches multiple people in a single request via the records query endpoint, filtering by record
 * ID. Records that don't exist are simply absent from the result, so callers can detect them by
 * comparing against the requested IDs.
 */
export async function getPeopleByRecordIds(
    recordIds: string[]
): AsyncResult<AttioPerson[], AttioApiError> {
    if (recordIds.length === 0) {
        return complete([])
    }

    const result = await attioPost("/v2/objects/people/records/query", {
        filter: {record_id: {$in: recordIds}},
        limit: recordIds.length,
    })
    if (isErrored(result)) {
        return result
    }

    const parsed = AttioQueryPeopleResponseSchema.safeParse(result.value)

    if (!parsed.success) {
        logger.error(`Unexpected Attio people query response: ${parsed.error.message}`)
        return errored({code: "UNEXPECTED_ERROR"})
    }

    return complete(parsed.data.data)
}
