import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {createLogger} from "../common/logger"
import {type LemlistApiError, lemlistApi} from "./transport/lemlist"
import {endpoints} from "./endpoints"
import {schemaParseError} from "./transport/error"
import {
    type LemlistLeadByEmail,
    LemlistLeadByEmailSchema,
    type LemlistPauseLeadResponse,
    LemlistPauseLeadResponseSchema,
} from "./schemas"

const logger = createLogger("lemlist leads")

/**
 * Retrieves all lemlist leads for an email address across campaigns.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/leads/get-lead-by-email
 */
export async function getLeadByEmail(
    email: string
): AsyncResult<LemlistLeadByEmail, LemlistApiError> {
    const responseResult = await lemlistApi.get(endpoints.api.leadByEmail(email.trim()), {
        version: "v2",
    })

    if (isErrored(responseResult)) {
        if (responseResult.error.code === "NOT_FOUND") {
            return complete([])
        }

        logger.error("Failed to fetch lead by email", {error: responseResult.error})
        return responseResult
    }

    const parsed = LemlistLeadByEmailSchema.safeParse(responseResult.value.data)

    if (!parsed.success) {
        return errored(schemaParseError(parsed.error))
    }

    return complete(parsed.data)
}

/**
 * Pauses a lead by lead ID. Optionally scoped to a specific campaign.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/leads/pause-lead
 */
export async function pauseLead(
    leadId: string,
    campaignId?: string
): AsyncResult<LemlistPauseLeadResponse, LemlistApiError> {
    const params = campaignId ? {campaignId} : undefined
    const responseResult = await lemlistApi.post(endpoints.api.pauseLead(leadId), undefined, params)

    if (isErrored(responseResult)) {
        logger.error("Failed to pause lead", {
            leadId,
            error: responseResult.error,
        })
        return responseResult
    }

    const parsed = LemlistPauseLeadResponseSchema.safeParse(responseResult.value.data)

    if (!parsed.success) {
        return errored(schemaParseError(parsed.error))
    }

    return complete(parsed.data)
}
