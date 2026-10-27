import {complete, errored, type Result} from "@attio/fetchable"
import type {output, ZodError, ZodTypeAny} from "zod"
import {createLogger} from "../../common/logger"
import {InvalidSchemaError} from "./schema-error"

/** @see https://developer.lemlist.com/api-reference/getting-started/errors#api-errors */
export type LemlistErrorCode =
    | "INVALID_REQUEST"
    | "UNAUTHORIZED"
    /** `402`. lemlist does not document it. It means the plan does not include the route. */
    | "PLAN_LIMITED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "RATE_LIMITED"
    | "LEMLIST_SERVER_ERROR"
    | "NETWORK_ERROR"
    | "UNEXPECTED_RESPONSE"
    | "UNEXPECTED_ERROR"
    /** Not a lemlist status: ask Attio to retry the block. */
    | "RETRY"
    /** `400 LEAD_ALREADY_IN_CAMPAIGN` or "Lead already in the campaign", from the create lead call. */
    | "ALREADY_IN_CAMPAIGN"
    /** `409 LEAD_ALREADY_IN_OTHER_CAMPAIGN` or "Lead already in other campaign", only sent with `deduplicate`. */
    | "ALREADY_IN_OTHER_CAMPAIGN"

export type LemlistApiError = {
    code: LemlistErrorCode
    detail: string | null
}

const logger = createLogger("lemlist API error")

/** lemlist names these refusals only in the response text, so `detail` outranks the status. */
export function codeForStatus(status: number, detail: string | null = null): LemlistErrorCode {
    // lemlist documents both refusals as codes, but production sends the plain-text message.
    if (
        detail?.includes("LEAD_ALREADY_IN_OTHER_CAMPAIGN") ||
        detail?.toLowerCase().includes("lead already in other campaign")
    ) {
        return "ALREADY_IN_OTHER_CAMPAIGN"
    }
    if (
        detail?.includes("LEAD_ALREADY_IN_CAMPAIGN") ||
        detail?.toLowerCase().includes("lead already in the campaign")
    ) {
        return "ALREADY_IN_CAMPAIGN"
    }

    switch (status) {
        case 400:
            return "INVALID_REQUEST"
        case 401:
            return "UNAUTHORIZED"
        case 402:
            return "PLAN_LIMITED"
        case 403:
            return "FORBIDDEN"
        case 404:
            return "NOT_FOUND"
        case 409:
            return "CONFLICT"
        case 429:
            return "RATE_LIMITED"
        default:
            return status >= 500 ? "LEMLIST_SERVER_ERROR" : "UNEXPECTED_ERROR"
    }
}

/**
 * Workflow step `retryable` flag. Exhaustive on purpose: a new code has to be classified
 * rather than quietly defaulting.
 */
export function isRetryable(error: LemlistApiError): boolean {
    switch (error.code) {
        case "RATE_LIMITED":
        case "LEMLIST_SERVER_ERROR":
        case "NETWORK_ERROR":
        case "RETRY":
            return true
        case "INVALID_REQUEST":
        case "UNAUTHORIZED":
        case "PLAN_LIMITED":
        case "FORBIDDEN":
        case "NOT_FOUND":
        case "CONFLICT":
        case "UNEXPECTED_RESPONSE":
        case "UNEXPECTED_ERROR":
        case "ALREADY_IN_CAMPAIGN":
        case "ALREADY_IN_OTHER_CAMPAIGN":
            return false
    }
}

export function lemlistErrorMessage(error: LemlistApiError): string {
    switch (error.code) {
        case "INVALID_REQUEST":
            return "lemlist rejected the request."
        case "UNAUTHORIZED":
            return "lemlist rejected the API key. Reconnect lemlist to fix this."
        case "PLAN_LIMITED":
            return "Your lemlist account does not have access to this feature. Check your plan and credits at app.lemlist.com."
        case "FORBIDDEN":
            return "lemlist refused this request for your account. Check your account status at app.lemlist.com."
        case "NOT_FOUND":
            return "lemlist could not find what this step asked for."
        case "CONFLICT":
            return "lemlist could not accept this because it conflicts with something already there."
        case "RATE_LIMITED":
            return "lemlist's rate limit was reached. Try again shortly."
        case "LEMLIST_SERVER_ERROR":
            return "lemlist is temporarily unavailable. Try again shortly."
        case "NETWORK_ERROR":
            return "lemlist could not be reached. Try again shortly."
        case "RETRY":
            return "Try again shortly."
        case "ALREADY_IN_CAMPAIGN":
            return "This person is already in this lemlist campaign."
        case "ALREADY_IN_OTHER_CAMPAIGN":
            return "This person is already in another lemlist campaign, and deduplication is on."
        case "UNEXPECTED_RESPONSE":
        case "UNEXPECTED_ERROR":
            return "An unexpected error occurred when calling lemlist's API."
    }
}

export function schemaParseError(detail: string | ZodError): LemlistApiError {
    logger.error(
        typeof detail === "string"
            ? new Error(`Unexpected lemlist API response: ${detail}`)
            : new InvalidSchemaError(detail)
    )

    return {code: "UNEXPECTED_RESPONSE", detail: null}
}

/** Validates a lemlist response body, logging the failing field paths when it does not match. */
export function parseResponse<TSchema extends ZodTypeAny>(
    schema: TSchema,
    data: unknown
): Result<output<TSchema>, LemlistApiError> {
    const parsed = schema.safeParse(data)
    return parsed.success ? complete(parsed.data) : errored(schemaParseError(parsed.error))
}

async function readErrorBody(response: Response): Promise<unknown> {
    const bodyText = await response.text().catch(() => null)

    if (!bodyText?.trim()) {
        return null
    }

    try {
        return JSON.parse(bodyText) as unknown
    } catch {
        return bodyText
    }
}

/** Pulls lemlist's own wording out of a failed response, for `LemlistApiError.detail`. */
export async function readErrorDetail(
    response: Response,
    requestLabel: string
): Promise<string | null> {
    const body = await readErrorBody(response)

    logger.error(`${requestLabel} failed (${response.status})`)

    if (typeof body === "string" && body.trim()) {
        return body.trim()
    }

    if (typeof body === "object" && body !== null) {
        if ("message" in body && typeof body.message === "string" && body.message.trim()) {
            return body.message.trim()
        }

        if ("error" in body && typeof body.error === "string" && body.error.trim()) {
            return body.error.trim()
        }
    }

    return null
}
