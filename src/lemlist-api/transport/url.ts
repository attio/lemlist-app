import {LEMLIST_API_BASE_URL} from "../endpoints"

export type QueryParams = Record<
    string,
    string | number | boolean | undefined | null | string[] | number[]
>

export function buildAuthorizationHeader(apiToken: string): string {
    return `Basic ${btoa(`:${apiToken}`)}`
}

export function buildUrl(path: string, params?: QueryParams): string {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path
    const url = new URL(normalizedPath, `${LEMLIST_API_BASE_URL}/`)

    if (params) {
        const searchParams = new URLSearchParams()

        for (const [key, value] of Object.entries(params)) {
            if (Array.isArray(value)) {
                searchParams.append(key, value.join(","))
            } else if (value !== null && value !== undefined) {
                searchParams.append(key, String(value))
            }
        }

        url.search = searchParams.toString()
    }

    return url.toString()
}

function decodePathSegment(segment: string): string {
    try {
        return decodeURIComponent(segment)
    } catch {
        return segment
    }
}

const REDACTED_QUERY_PARAMS = new Set([
    "email",
    "phone",
    "linkedinurl",
    "firstname",
    "lastname",
    "companyname",
    "companydomain",
    "webhookurl",
])

export function redactUrlForLogging(rawUrl: string): string {
    const url = new URL(rawUrl)

    url.pathname = url.pathname
        .split("/")
        .map((segment) => (decodePathSegment(segment).includes("@") ? "[REDACTED]" : segment))
        .join("/")

    for (const key of url.searchParams.keys()) {
        if (REDACTED_QUERY_PARAMS.has(key.toLowerCase())) {
            url.searchParams.set(key, "[REDACTED]")
        }
    }

    // Keep redaction markers human-readable rather than percent-encoding their brackets.
    return url.toString().replace(/%5B/g, "[").replace(/%5D/g, "]")
}
