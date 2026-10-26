import {type AsyncResult, bind, map} from "@attio/fetchable"
import {type LemlistApiError, lemlistApi} from "./transport/lemlist"
import {endpoints} from "./endpoints"
import {parseResponse} from "./transport/error"
import {type LemlistCompany, LemlistCompanyListSchema} from "./schemas"

/**
 * @see https://developer.lemlist.com/api-reference/endpoints/companies/get-many-companies
 */
export async function listCompanies(): AsyncResult<LemlistCompany[], LemlistApiError> {
    const responseResult = await lemlistApi.get(endpoints.api.companies, {limit: 100})

    return bind(responseResult, (response) =>
        map(parseResponse(LemlistCompanyListSchema, response.data), (page) => page.data)
    )
}
