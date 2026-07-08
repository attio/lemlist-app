export type AttioApiError =
    | {code: "NOT_FOUND"}
    | {code: "UNAUTHORIZED"}
    | {code: "FORBIDDEN"}
    | {code: "INVALID_REQUEST"}
    | {code: "CONFLICT"}
    | {code: "RATE_LIMITED"}
    | {code: "ATTIO_API_ERROR"} // 5XX errors from Attio
    | {code: "UNEXPECTED_ERROR"} // network failures, invalid/unexpected responses, anything else

/**
 * Maps an {@link AttioApiError} to a short, user-facing message safe to show in a toast or banner.
 * Technical details are logged at the call site rather than surfaced here.
 */
export function attioApiErrorMessage(error: AttioApiError): string {
    switch (error.code) {
        case "NOT_FOUND":
            return "This record could not be found in Attio."
        case "UNAUTHORIZED":
        case "FORBIDDEN":
            return "Attio access denied."
        case "RATE_LIMITED":
            return "Too many requests to Attio. Please try again in a moment."
        case "INVALID_REQUEST":
        case "CONFLICT":
        case "ATTIO_API_ERROR":
        case "UNEXPECTED_ERROR":
            return "Something went wrong loading this record from Attio."
    }
}
