import type {ZodError, ZodTypeAny} from "zod"

export function zodErrorFor(schema: ZodTypeAny, input: unknown): ZodError {
    const parsed = schema.safeParse(input)

    if (parsed.success) throw new Error("expected this input to fail the schema")

    return parsed.error
}
