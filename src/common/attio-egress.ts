/**
 * Attio throws this directly — from fetch, kv, or webhook handler management — when the
 * account's shared egress budget is exhausted. It's never wrapped in a LemlistApiError,
 * so each call site that isn't already behind the lemlist client has to catch it itself.
 */
export const ATTIO_EGRESS_RATE_LIMIT = "Egress Rate limit exceeded"

export function isAttioEgressException(error: unknown): boolean {
    return error instanceof Error && error.message === ATTIO_EGRESS_RATE_LIMIT
}
