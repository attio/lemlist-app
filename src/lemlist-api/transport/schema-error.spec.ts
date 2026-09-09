import {describe, expect, it} from "vitest"
import {z} from "zod"
import {zodErrorFor} from "../../../test/utils/index"
import {InvalidSchemaError} from "./schema-error"

const schema = z.object({
    createdAt: z.string().datetime({offset: true}),
    leadEmail: z.string(),
    type: z.enum(["enrichmentDone", "enrichmentError"]),
})

describe(InvalidSchemaError, () => {
    it("names every mismatched field", () => {
        const {message} = new InvalidSchemaError(zodErrorFor(schema, {createdAt: "2026-08-10"}))

        expect(message).toContain("createdAt")
        expect(message).toContain("leadEmail")
        expect(message).toContain("type")
    })

    it("labels a failure on the payload itself rather than a field", () => {
        expect(new InvalidSchemaError(zodErrorFor(schema, "not-an-object")).message).toContain(
            "(root)"
        )
    })

    it("carries a stack trace headed by the message and pointing at the parse site", () => {
        const {name, stack} = new InvalidSchemaError(zodErrorFor(schema, {}))

        expect(name).toBe("InvalidSchemaError")
        expect(stack).toContain("InvalidSchemaError: lemlist returned an invalid schema.")
        expect(stack).toContain("schema-error.spec")
    })

    it("never echoes a rejected value, which can hold lead details", () => {
        const {message} = new InvalidSchemaError(
            zodErrorFor(schema, {
                createdAt: 1,
                leadEmail: {address: "lead@example.com"},
                // An enum mismatch is the case Zod would otherwise quote back verbatim.
                type: "lead@example.com",
            })
        )

        expect(message).not.toContain("lead@example.com")
        expect(message).not.toContain("address")
    })
})
