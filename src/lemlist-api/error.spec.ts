import {beforeEach, describe, expect, it, vi} from "vitest"

const mockLogger = vi.hoisted(() => ({log: vi.fn(), error: vi.fn()}))

vi.mock("../utils/logger", () => ({createLogger: () => mockLogger}))

import {z} from "zod"
import {zodErrorFor} from "../../test/utils"
import {schemaParseError} from "./error"

const schema = z.object({createdAt: z.string().datetime({offset: true})})

const loggedError = () => mockLogger.error.mock.calls[0]?.[0] as Error

beforeEach(() => {
    vi.resetAllMocks()
})

describe("schemaParseError", () => {
    it("logs the mismatched fields with a stack trace for a ZodError", () => {
        schemaParseError(zodErrorFor(schema, {createdAt: "2026-08-10"}))

        expect(loggedError().message).toBe(
            "lemlist returned an invalid schema. createdAt: Invalid datetime"
        )
        expect(loggedError().stack).toContain(
            "InvalidSchemaError: lemlist returned an invalid schema. createdAt: Invalid datetime"
        )
        expect(loggedError().stack).toContain("error.spec")
    })

    it("logs a plain reason for callers rejecting a response for a non-schema reason", () => {
        schemaParseError("success_false")

        expect(loggedError().message).toBe("Unexpected lemlist API response: success_false")
    })

    it("shows users the same plain message either way, keeping schema detail in the logs", () => {
        const userFacing = {
            statusCode: 0,
            data: undefined,
            errorMessage: "Unexpected response from lemlist API",
        }

        expect(schemaParseError(zodErrorFor(schema, {}))).toEqual(userFacing)
        expect(schemaParseError("success_false")).toEqual(userFacing)
    })
})
