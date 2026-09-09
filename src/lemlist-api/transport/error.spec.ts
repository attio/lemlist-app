import {beforeEach, describe, expect, it, vi} from "vitest"

const mockLogger = vi.hoisted(() => ({log: vi.fn(), error: vi.fn()}))

vi.mock("../../common/logger", () => ({createLogger: () => mockLogger}))

import {z} from "zod"
import {zodErrorFor} from "../../../test/utils/index"
import {
    codeForStatus,
    isRetryable,
    type LemlistErrorCode,
    lemlistErrorMessage,
    schemaParseError,
} from "./error"

const apiError = (code: LemlistErrorCode) => ({code, detail: null})

const schema = z.object({createdAt: z.string().datetime({offset: true})})

const loggedError = () => mockLogger.error.mock.calls[0]?.[0] as Error

beforeEach(() => {
    vi.resetAllMocks()
})

describe("schemaParseError", () => {
    it("logs the mismatched fields with a stack trace for a ZodError", () => {
        schemaParseError(zodErrorFor(schema, {createdAt: "2026-08-10"}))

        expect(loggedError().message).toContain("lemlist returned an invalid schema.")
        expect(loggedError().message).toContain("createdAt")
        expect(loggedError().stack).toContain(
            "InvalidSchemaError: lemlist returned an invalid schema."
        )
        expect(loggedError().stack).toContain("error.spec")
    })

    it("logs a plain reason for callers rejecting a response for a non-schema reason", () => {
        schemaParseError("success_false")

        expect(loggedError().message).toBe("Unexpected lemlist API response: success_false")
    })

    it("shows users the same plain message either way, keeping schema detail in the logs", () => {
        const userFacing = {code: "UNEXPECTED_RESPONSE", detail: null}

        expect(schemaParseError(zodErrorFor(schema, {}))).toEqual(userFacing)
        expect(schemaParseError("success_false")).toEqual(userFacing)
    })
})

describe(codeForStatus, () => {
    it("keeps 401 and 403 apart, since only one is fixed by reconnecting", () => {
        expect(codeForStatus(401)).toBe("UNAUTHORIZED")
        expect(codeForStatus(403)).toBe("FORBIDDEN")
    })

    it("maps the statuses the app branches on", () => {
        expect(codeForStatus(404)).toBe("NOT_FOUND")
        expect(codeForStatus(409)).toBe("CONFLICT")
        expect(codeForStatus(429)).toBe("RATE_LIMITED")
        expect(codeForStatus(503)).toBe("LEMLIST_SERVER_ERROR")
    })
})

describe(isRetryable, () => {
    it("retries a rate limit, an outage, or a request that may never have left", () => {
        expect(isRetryable(apiError("RATE_LIMITED"))).toBe(true)
        expect(isRetryable(apiError("LEMLIST_SERVER_ERROR"))).toBe(true)
        expect(isRetryable(apiError("NETWORK_ERROR"))).toBe(true)
        expect(isRetryable(apiError("RETRY"))).toBe(true)
    })

    it("does not retry anything the caller has to fix first", () => {
        expect(isRetryable(apiError("INVALID_REQUEST"))).toBe(false)
        expect(isRetryable(apiError("UNAUTHORIZED"))).toBe(false)
        expect(isRetryable(apiError("FORBIDDEN"))).toBe(false)
        expect(isRetryable(apiError("NOT_FOUND"))).toBe(false)
        expect(isRetryable(apiError("CONFLICT"))).toBe(false)
        expect(isRetryable(apiError("UNEXPECTED_RESPONSE"))).toBe(false)
        expect(isRetryable(apiError("UNEXPECTED_ERROR"))).toBe(false)
    })
})

describe(lemlistErrorMessage, () => {
    const CODES = [
        "INVALID_REQUEST",
        "UNAUTHORIZED",
        "FORBIDDEN",
        "NOT_FOUND",
        "CONFLICT",
        "RATE_LIMITED",
        "LEMLIST_SERVER_ERROR",
        "NETWORK_ERROR",
        "UNEXPECTED_RESPONSE",
        "UNEXPECTED_ERROR",
        "RETRY",
    ] as const

    it("never leaks a status code, brackets, or raw detail into what a member reads", () => {
        for (const code of CODES) {
            const message = lemlistErrorMessage({code, detail: "SQLSTATE[42000] boom"})

            expect(message).not.toContain("[")
            expect(message).not.toContain("boom")
            expect(message).not.toMatch(/\b[45]\d\d\b/)
        }
    })

    it("tells the member how to fix a permission problem", () => {
        expect(lemlistErrorMessage({code: "UNAUTHORIZED", detail: null})).toContain("Reconnect")
        expect(lemlistErrorMessage({code: "FORBIDDEN", detail: null})).toContain("app.lemlist.com")
    })
})
