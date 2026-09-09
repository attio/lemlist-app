import type {ZodError} from "zod"
import {createLogger} from "../../common/logger"
import {InvalidSchemaError} from "./schema-error"

/** @see https://developer.lemlist.com/api-reference/getting-started/errors#api-errors */
export type LemlistErrorCode =
    | "INVALID_REQUEST"
    | "UNAUTHORIZED"
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

export type LemlistApiError = {
    code: LemlistErrorCode
    detail: string | null
}

const logger = createLogger("lemlist API error")

export function codeForStatus(status: number): LemlistErrorCode {
    switch (status) {
        case 400:
            return "INVALID_REQUEST"
        case 401:
            return "UNAUTHORIZED"
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
        case "FORBIDDEN":
        case "NOT_FOUND":
        case "CONFLICT":
        case "UNEXPECTED_RESPONSE":
        case "UNEXPECTED_ERROR":
            return false
    }
}

export function lemlistErrorMessage(error: LemlistApiError): string {
    switch (error.code) {
        case "INVALID_REQUEST":
            return "lemlist rejected the request."
        case "UNAUTHORIZED":
            return "lemlist rejected the API key. Reconnect lemlist to fix this."
        case "FORBIDDEN":
            return "Your lemlist API key is missing a permission this needs. Update it at app.lemlist.com under Settings, API."
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
