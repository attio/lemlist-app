import {type AsyncResult, complete, errored} from "@attio/fetchable"
import {getWorkspaceConnection} from "attio/server"
import {createLogger} from "../utils/logger"
import {formatApiErrorMessage, type LemlistApiError} from "./error"
import {buildAuthorizationHeader, buildUrl, type QueryParams} from "./url"

// lemlist rate limit: 20 req/2s per API key.
// Strategy: react to 429s rather than pre-throttle, pre-throttling requires shared state
// across concurrent requests, which isn't available in this serverless runtime.
const MAX_RETRIES = 3
const RATE_LIMIT_WINDOW_MS = 2000 // fallback when Retry-After header is absent
const logger = createLogger("lemlist client API")

export type {LemlistApiError} from "./error"

// errored(...) on any non-2xx HTTP response or transport failure.
// Callers only need isErrored() to handle all failures.
// statusCode is 0 for transport failures (no HTTP response received).
type LemlistApiResponse<T> = {
    statusCode: number
    data: T | undefined
}

async function request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    options?: {
        params?: QueryParams
        body?: unknown
    },
    attempt = 0
): AsyncResult<LemlistApiResponse<T>, LemlistApiError> {
    try {
        const headers: Record<string, string> = {
            Accept: "application/json",
            Authorization: buildAuthorizationHeader(getWorkspaceConnection().value),
        }

        const init: RequestInit = {
            method,
            headers,
        }

        if (options?.body !== undefined) {
            headers["Content-Type"] = "application/json"
            init.body = JSON.stringify(options.body)
        }

        const url = buildUrl(path, options?.params)
        const response = await fetch(url, init)

        logger.log(`${method} ${url} (${response.status})`)

        if (response.status === 429 && attempt < MAX_RETRIES) {
            // Retry-After is seconds; fall back to the rate limit window duration
            const retryAfterHeader = response.headers.get("Retry-After")
            const delay = retryAfterHeader
                ? parseInt(retryAfterHeader, 10) * 1000
                : RATE_LIMIT_WINDOW_MS
            await new Promise((resolve) => setTimeout(resolve, delay))
            return request<T>(method, path, options, attempt + 1)
        }

        if (!response.ok) {
            return errored({
                statusCode: response.status,
                data: undefined,
                errorMessage: await formatApiErrorMessage(response, `${method} ${url}`),
            })
        }

        if (response.status === 204) {
            return complete({statusCode: response.status, data: undefined})
        }

        const bodyText = await response.text()

        if (!bodyText.trim()) {
            return complete({statusCode: response.status, data: undefined})
        }

        try {
            return complete({
                statusCode: response.status,
                data: JSON.parse(bodyText) as T,
            })
        } catch {
            logger.error("Invalid JSON response from lemlist")
            return errored({
                statusCode: response.status,
                data: undefined,
                errorMessage: "Invalid response from lemlist",
            })
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "unknown_error"

        logger.error(message)

        return errored({statusCode: 0, data: undefined, errorMessage: message})
    }
}

async function get<T>(
    path: string,
    params?: QueryParams
): AsyncResult<LemlistApiResponse<T>, LemlistApiError> {
    return request<T>("GET", path, {params})
}

async function post<T>(
    path: string,
    body?: unknown,
    params?: QueryParams
): AsyncResult<LemlistApiResponse<T>, LemlistApiError> {
    return request<T>("POST", path, {body, params})
}

async function put<T>(
    path: string,
    body?: unknown,
    params?: QueryParams
): AsyncResult<LemlistApiResponse<T>, LemlistApiError> {
    return request<T>("PUT", path, {body, params})
}

async function del<T>(
    path: string,
    params?: QueryParams
): AsyncResult<LemlistApiResponse<T>, LemlistApiError> {
    return request<T>("DELETE", path, {params})
}

export const lemlistApi = {
    get,
    post,
    put,
    delete: del,
}
