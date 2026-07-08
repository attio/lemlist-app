function isNonNullObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null
}

function optionTitle(option: unknown): unknown {
    return isNonNullObject(option) ? option.title : null
}

/** Builds a single comma-separated address string from a location value's components. */
function locationString(value: Record<string, unknown>): string | null {
    const parts = [
        value.line_1,
        value.line_2,
        value.line_3,
        value.line_4,
        value.locality,
        value.region,
        value.postcode,
        value.country_code,
    ]
        .map((part) => (typeof part === "string" ? part.trim() : ""))
        .filter((part) => part.length > 0)

    return parts.length > 0 ? parts.join(", ") : null
}

function extractSingleValue(value: unknown): unknown {
    if (!isNonNullObject(value)) {
        return null
    }

    switch (value.attribute_type) {
        case "text":
        case "number":
        case "rating":
        case "date":
        case "timestamp":
        case "checkbox":
            return value.value
        case "currency":
            return value.currency_value
        case "personal-name":
            return value.full_name
        case "email-address":
            return value.email_address
        case "phone-number":
            return value.original_phone_number
        case "domain":
            return value.domain
        case "select":
            return optionTitle(value.option)
        case "status":
            return optionTitle(value.status)
        case "location":
            return locationString(value)

        // Ignore references (need lookup to be useful) and interactions (system fields that we won't forward to lemlist).
        case "actor-reference":
        case "record-reference":
        case "interaction":
            return null

        default:
            return null
    }
}

function isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === ""
}

/**
 * Extracts the (possibly multi-value) value of a single Attio attribute. Returns `null` when there
 * is no usable value, so callers can omit empty custom variables. Single values are returned as-is;
 * multi-value attributes return an array.
 */
export function extractAttioAttributeValue(rawValue: unknown): unknown {
    if (!Array.isArray(rawValue)) {
        return null
    }

    const parts = rawValue
        .map(extractSingleValue)
        .map((part) => (typeof part === "string" ? part.trim() : part))
        .filter((part) => !isEmpty(part))

    if (parts.length === 0) {
        return null
    }

    return parts.length === 1 ? parts[0] : parts
}
