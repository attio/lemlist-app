import {describe, expect, it} from "vitest"
import {redactUrlForLogging} from "./url"

describe(redactUrlForLogging, () => {
    it("redacts an email used as a path segment", () => {
        expect(redactUrlForLogging("https://api.lemlist.com/api/contacts/person@example.com")).toBe(
            "https://api.lemlist.com/api/contacts/[REDACTED]"
        )
    })

    it("redacts an encoded email used as a path segment", () => {
        expect(
            redactUrlForLogging("https://api.lemlist.com/api/contacts/person%40example.com")
        ).toBe("https://api.lemlist.com/api/contacts/[REDACTED]")
    })

    it("redacts personal query values while preserving useful request context", () => {
        expect(
            redactUrlForLogging(
                "https://api.lemlist.com/api/enrich?email=person%40example.com&phone=123&companyDomain=example.com&verifyEmail=true"
            )
        ).toBe(
            "https://api.lemlist.com/api/enrich?email=[REDACTED]&phone=[REDACTED]&companyDomain=[REDACTED]&verifyEmail=true"
        )
    })

    it("leaves non-sensitive path identifiers available for debugging", () => {
        expect(redactUrlForLogging("https://api.lemlist.com/api/contacts/con_123")).toBe(
            "https://api.lemlist.com/api/contacts/con_123"
        )
    })
})
