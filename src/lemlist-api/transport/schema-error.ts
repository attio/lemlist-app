import type {ZodError} from "zod"

/**
 * Only the field paths. Zod messages quote the value they rejected, which can carry lead
 * details we must not log.
 */
function formatIssues(error: ZodError): string {
    return error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.code}`)
        .join("; ")
}

export class InvalidSchemaError extends Error {
    constructor(error: ZodError) {
        super(`lemlist returned an invalid schema. ${formatIssues(error)}`)
        this.name = "InvalidSchemaError"
    }
}
