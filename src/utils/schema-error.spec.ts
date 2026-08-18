import {describe, expect, it} from "vitest"
import {z} from "zod"
import {zodErrorFor} from "../../test/utils"
import {InvalidSchemaError} from "./schema-error"

const schema = z.object({
    createdAt: z.string().datetime({offset: true}),
    leadEmail: z.string(),
})

describe("InvalidSchemaError", () => {
    it("names every mismatched field", () => {
        const error = new InvalidSchemaError(zodErrorFor(schema, {createdAt: "2026-08-10"}))

        expect(error.message).toBe(
            "lemlist returned an invalid schema. createdAt: Invalid datetime; leadEmail: Required"
        )
    })

    it("labels a failure on the payload itself rather than a field", () => {
        expect(new InvalidSchemaError(zodErrorFor(schema, "not-an-object")).message).toBe(
            "lemlist returned an invalid schema. (root): Expected object, received string"
        )
    })

    it("carries a stack trace headed by the message and pointing at the parse site", () => {
        const {name, stack} = new InvalidSchemaError(zodErrorFor(schema, {}))

        expect(name).toBe("InvalidSchemaError")
        expect(stack).toContain(
            "InvalidSchemaError: lemlist returned an invalid schema. createdAt: Required; leadEmail: Required"
        )
        expect(stack).toContain("schema-error.spec")
    })

    it("reports each field's type mismatch without echoing received values, which can hold lead emails", () => {
        const error = new InvalidSchemaError(
            zodErrorFor(schema, {createdAt: 1, leadEmail: {address: "lead@example.com"}})
        )

        expect(error.message).toBe(
            "lemlist returned an invalid schema. createdAt: Expected string, received number; leadEmail: Expected string, received object"
        )
    })
})
