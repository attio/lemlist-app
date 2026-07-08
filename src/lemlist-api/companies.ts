import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {type LemlistApiError, lemlistApi} from "./client"
import {endpoints} from "./endpoints"
import {schemaParseError} from "./error"
import {type LemlistCompany, LemlistCompanyListSchema} from "./schemas"

/**
 * @see https://developer.lemlist.com/api-reference/endpoints/companies/get-many-companies
 */
export async function listCompanies(): AsyncResult<LemlistCompany[], LemlistApiError> {
    const responseResult = await lemlistApi.get(endpoints.api.companies, {limit: 100})

    if (isErrored(responseResult)) {
        return responseResult
    }

    const parsed = LemlistCompanyListSchema.safeParse(responseResult.value.data)

    if (!parsed.success) {
        return errored(schemaParseError(parsed.error.message))
    }

    return complete(parsed.data.data)
}
