import {type AsyncResult, bind, errored, map} from "@attio/fetchable"
import {ErrorCode, errorMessage} from "../error-codes"
import {type LemlistApiError, lemlistApi} from "./transport/lemlist"
import {endpoints} from "./endpoints"
import {parseResponse, schemaParseError} from "./transport/error"
import type {EnrichmentGetResult} from "./schemas"
import {LemlistEnrichGetResponseSchema, LemlistEnrichPostResponseSchema} from "./schemas"
import type {QueryParams} from "./transport/url"

export type EnrichContactInput = {
    email?: string
    phone?: string
    linkedinUrl?: string
    firstName?: string
    lastName?: string
    companyName?: string
}

export type EnrichContactOptions = {
    webhookUrl?: string
    findPhone?: boolean
    findEmail?: boolean
    linkedinEnrichment?: boolean
    verifyEmail?: boolean
}

export function hasEnrichContactInput(input: EnrichContactInput): boolean {
    return Boolean(
        input.email?.trim() ||
        input.phone?.trim() ||
        input.linkedinUrl?.trim() ||
        input.firstName?.trim() ||
        input.lastName?.trim() ||
        input.companyName?.trim()
    )
}

function buildEnrichQueryParams(
    input: EnrichContactInput,
    options?: EnrichContactOptions
): QueryParams {
    const params: QueryParams = {
        webhookUrl: options?.webhookUrl,
        ...input,
    }

    if (options?.findEmail) {
        params.findEmail = true
    }

    if (options?.findPhone) {
        params.findPhone = true
    }

    if (options?.linkedinEnrichment) {
        params.linkedinEnrichment = true
    }

    if (options?.verifyEmail) {
        params.verifyEmail = true
    }

    // Callers should pass an explicit enrichment type; default to phone when none is
    // set so POST /enrich still requests a known job (matches EnrichPhoneInputRequired).
    if (
        !options?.findEmail &&
        !options?.findPhone &&
        !options?.linkedinEnrichment &&
        !options?.verifyEmail
    ) {
        params.findPhone = true
    }

    return params
}

/**
 * Starts enrichment via POST /enrich.
 * Returns the enrichment id only; results are delivered asynchronously.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/enrich/enrich-data
 */
export async function enrichContact(
    input: EnrichContactInput,
    options?: EnrichContactOptions
): AsyncResult<string, LemlistApiError> {
    if (!hasEnrichContactInput(input)) {
        const inputRequiredCode = options?.findEmail
            ? ErrorCode.EnrichEmailInputRequired
            : options?.linkedinEnrichment
              ? ErrorCode.EnrichLinkedinInputRequired
              : options?.verifyEmail
                ? ErrorCode.EnrichVerifyEmailInputRequired
                : ErrorCode.EnrichPhoneInputRequired

        return errored(schemaParseError(errorMessage(inputRequiredCode)))
    }

    const responseResult = await lemlistApi.post(
        endpoints.api.enrich,
        undefined,
        buildEnrichQueryParams(input, options)
    )

    return bind(responseResult, (response) =>
        map(parseResponse(LemlistEnrichPostResponseSchema, response.data), (enrich) => enrich.id)
    )
}

/**
 * Fetches the enrichment result via GET /enrich/{enrichId}.
 * Returns "done" with parsed data on HTTP 200, "in_progress" on HTTP 202.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/enrich/get-enrichment-result
 */
export async function getEnrichmentResult(
    enrichId: string
): AsyncResult<EnrichmentGetResult, LemlistApiError> {
    const responseResult = await lemlistApi.get(endpoints.api.enrichResult(enrichId))

    return bind(responseResult, ({statusCode, data}) =>
        map(parseResponse(LemlistEnrichGetResponseSchema, data), (result) => ({
            status: statusCode === 202 ? "in_progress" : "completed",
            data: result,
        }))
    )
}
