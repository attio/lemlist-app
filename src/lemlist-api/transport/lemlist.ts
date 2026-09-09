import {type AsyncResult, complete, errored} from "@attio/fetchable"
import {type Connection, getWorkspaceConnection} from "attio/server"
import {createLogger} from "../../common/logger"
import {codeForStatus, type LemlistApiError, readErrorDetail} from "./error"
import {buildAuthorizationHeader, buildUrl, type QueryParams} from "./url"

// lemlist rate limit: 20 req/2s per API key.
// Strategy: react to 429s rather than pre-throttle, pre-throttling requires shared state
// across concurrent requests, which isn't available in this serverless runtime.
const MAX_RETRIES = 3
const RATE_LIMIT_WINDOW_MS = 2000 // fallback when Retry-After header is absent
const logger = createLogger("lemlist client API")

export type {LemlistApiError} from "./error"

// Not every throw in this runtime is `instanceof Error` (e.g. DOMException does not
// extend it), so duck-type the message instead of assuming the prototype.
function messageFrom(error: unknown): string {
    if (error instanceof Error) return error.message
    if (
        typeof error === "object" &&
        error !== null &&
        typeof (error as {message?: unknown}).message === "string"
    ) {
        return (error as {message: string}).message
    }
    return String(error)
}

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
        /** Defaults to the workspace connection. Set explicitly for connection-lifecycle
         * events, where `getWorkspaceConnection()` cannot find it yet. */
        connection?: Connection
    },
    attempt = 0
): AsyncResult<LemlistApiResponse<T>, LemlistApiError> {
    // Outside the try on purpose: this throws an AttioError that drives the connection
    // dialog, and catching it would show a network failure instead of a connect prompt.
    const connection = options?.connection ?? getWorkspaceConnection()

    try {
        const headers: Record<string, string> = {
            Accept: "application/json",
            Authorization: buildAuthorizationHeader(connection.value),
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
                code: codeForStatus(response.status),
                detail: await readErrorDetail(response, `${method} ${url}`),
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
            return errored({code: "UNEXPECTED_RESPONSE", detail: "response was not JSON"})
        }
    } catch (error) {
        const message = messageFrom(error)

        logger.error(message)

        return errored({code: "NETWORK_ERROR", detail: message})
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

/**
 * Factory for connection-lifecycle events where the workspace connection isn't wired up
 * yet. Threads the explicit `Connection` through every call.
 */
export function lemlistApiWithConnection(connection: Connection) {
    return {
        get: (path: string, params?: QueryParams) => request("GET", path, {params, connection}),
        post: (path: string, body?: unknown, params?: QueryParams) =>
            request("POST", path, {body, params, connection}),
        delete: (path: string, params?: QueryParams) =>
            request("DELETE", path, {params, connection}),
    }
}
