import {createLogger} from "../utils/logger"

export type LemlistApiError = {
    statusCode: number
    data?: undefined
    errorMessage: string
}

const logger = createLogger("lemlist API error")

export function schemaParseError(message: string): LemlistApiError {
    logger.error(`Unexpected lemlist API response: ${message}`)
    return {statusCode: 0, data: undefined, errorMessage: "Unexpected response from lemlist API"}
}

type ApiErrorDefinition = {
    matches: (status: number) => boolean
    prefix: (status: number) => string
    fallback: (status: number) => string
}

const API_ERROR_DEFINITIONS: ApiErrorDefinition[] = [
    {
        matches: (status) => status === 401 || status === 403,
        prefix: (status) => `[lemlist] Authentication failed (${status})`,
        fallback: () => "lemlist authentication failed. Check your workspace connection.",
    },
    {
        matches: (status) => status === 429,
        prefix: () => "[lemlist] Rate limit exceeded",
        fallback: () => "lemlist rate limit exceeded. Please try again later.",
    },
    {
        matches: (status) => status >= 500,
        prefix: (status) => `Service unavailable (${status})`,
        fallback: () => "lemlist service temporarily unavailable. Please try again later.",
    },
]

const DEFAULT_API_ERROR_DEFINITION: ApiErrorDefinition = {
    matches: () => true,
    prefix: () => "[lemlist]",
    fallback: (status) => `lemlist API error (${status})`,
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

function getApiErrorMessage(errorBody: unknown): string | null {
    if (typeof errorBody === "string" && errorBody.trim()) {
        return errorBody.trim()
    }

    if (typeof errorBody === "object" && errorBody !== null) {
        if (
            "message" in errorBody &&
            typeof errorBody.message === "string" &&
            errorBody.message.trim()
        ) {
            return errorBody.message.trim()
        }

        if ("error" in errorBody && typeof errorBody.error === "string" && errorBody.error.trim()) {
            return errorBody.error.trim()
        }
    }

    return null
}

function withApiMessage(prefix: string, apiMessage: string | null, fallback: string): string {
    return apiMessage ? `${prefix}: ${apiMessage}` : fallback
}

function getApiErrorDefinition(status: number): ApiErrorDefinition {
    return (
        API_ERROR_DEFINITIONS.find((definition) => definition.matches(status)) ??
        DEFAULT_API_ERROR_DEFINITION
    )
}

export async function formatApiErrorMessage(
    response: Response,
    requestLabel?: string
): Promise<string> {
    const {status} = response
    const definition = getApiErrorDefinition(status)
    const prefix = definition.prefix(status)
    const fallback = definition.fallback(status)
    const apiMessage = getApiErrorMessage(await readErrorBody(response))
    const error = withApiMessage(prefix, apiMessage, fallback)

    if (requestLabel) {
        logger.error(`${requestLabel} failed (${status})`)
    }

    logger.error(error)

    return error
}
