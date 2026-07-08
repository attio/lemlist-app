import {describe, expect, it} from "vitest"
import {extractAttioAttributeValue} from "./attribute-value"

describe("extractAttioAttributeValue", () => {
    it("returns null for non-array input", () => {
        expect(extractAttioAttributeValue(undefined)).toBeNull()
        expect(extractAttioAttributeValue(null)).toBeNull()
        expect(extractAttioAttributeValue("text")).toBeNull()
    })

    it("returns null for an empty array", () => {
        expect(extractAttioAttributeValue([])).toBeNull()
    })

    it("extracts the `value` field for simple scalar types", () => {
        expect(extractAttioAttributeValue([{value: "Engineering", attribute_type: "text"}])).toBe(
            "Engineering"
        )
        expect(extractAttioAttributeValue([{value: 42, attribute_type: "number"}])).toBe(42)
        expect(extractAttioAttributeValue([{value: true, attribute_type: "checkbox"}])).toBe(true)
        expect(extractAttioAttributeValue([{value: 5, attribute_type: "rating"}])).toBe(5)
        expect(extractAttioAttributeValue([{value: "2024-01-01", attribute_type: "date"}])).toBe(
            "2024-01-01"
        )
    })

    it("extracts type-specific fields", () => {
        expect(
            extractAttioAttributeValue([{currency_value: 1999, attribute_type: "currency"}])
        ).toBe(1999)
        expect(
            extractAttioAttributeValue([{full_name: "Jane Doe", attribute_type: "personal-name"}])
        ).toBe("Jane Doe")
        expect(
            extractAttioAttributeValue([
                {email_address: "jane@example.com", attribute_type: "email-address"},
            ])
        ).toBe("jane@example.com")
        expect(
            extractAttioAttributeValue([
                {original_phone_number: "+15551234567", attribute_type: "phone-number"},
            ])
        ).toBe("+15551234567")
        expect(
            extractAttioAttributeValue([{domain: "example.com", attribute_type: "domain"}])
        ).toBe("example.com")
    })

    it("extracts the title for select and status options", () => {
        expect(
            extractAttioAttributeValue([{option: {title: "Lead"}, attribute_type: "select"}])
        ).toBe("Lead")
        expect(
            extractAttioAttributeValue([{status: {title: "Active"}, attribute_type: "status"}])
        ).toBe("Active")
    })

    it("joins the non-empty parts of a location into one string", () => {
        expect(
            extractAttioAttributeValue([
                {
                    line_1: "123 Main St",
                    line_2: "  ",
                    locality: "Springfield",
                    region: "",
                    postcode: "12345",
                    country_code: "US",
                    attribute_type: "location",
                },
            ])
        ).toBe("123 Main St, Springfield, 12345, US")
    })

    it("returns null for reference types that only carry IDs", () => {
        expect(
            extractAttioAttributeValue([
                {target_record_id: "rec_1", attribute_type: "record-reference"},
            ])
        ).toBeNull()
        expect(
            extractAttioAttributeValue([
                {referenced_actor_id: "act_1", attribute_type: "actor-reference"},
            ])
        ).toBeNull()
    })

    it("returns null for interaction system fields rather than forwarding the timestamp", () => {
        expect(
            extractAttioAttributeValue([
                {interacted_at: "2024-05-01", attribute_type: "interaction"},
            ])
        ).toBeNull()
    })

    it("returns an array for multi-value attributes", () => {
        expect(
            extractAttioAttributeValue([
                {option: {title: "SaaS"}, attribute_type: "select"},
                {option: {title: "Fintech"}, attribute_type: "select"},
            ])
        ).toEqual(["SaaS", "Fintech"])
    })

    it("drops empty entries, collapsing to a single value when only one remains", () => {
        expect(
            extractAttioAttributeValue([
                {value: "", attribute_type: "text"},
                {value: "Real", attribute_type: "text"},
            ])
        ).toBe("Real")
    })

    it("returns null when every entry is empty", () => {
        expect(
            extractAttioAttributeValue([
                {value: "", attribute_type: "text"},
                {value: null, attribute_type: "text"},
            ])
        ).toBeNull()
    })
})
