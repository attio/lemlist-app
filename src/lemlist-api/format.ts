export type AddLeadQueryParams = {
    linkedinEnrichment: boolean
    verifyEmail: boolean
    findEmail: boolean
    findPhone: boolean
    deduplicate: boolean
}

export type EnrichmentQueryParams = Pick<
    AddLeadQueryParams,
    "linkedinEnrichment" | "verifyEmail" | "findEmail" | "findPhone"
>

export function getEffectiveEnrichmentParams(
    settings: AddLeadQueryParams,
    body: Record<string, unknown>
): EnrichmentQueryParams {
    return {
        verifyEmail: settings.verifyEmail,
        findEmail: settings.findEmail && !body.email,
        findPhone: settings.findPhone && !body.phone,
        linkedinEnrichment: settings.linkedinEnrichment && !body.linkedinUrl,
    }
}

export function toEnabledQueryParams<T extends Record<string, boolean>>(params: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(params).filter((entry): entry is [string, true] => entry[1] === true)
    ) as Partial<T>
}

export function withContactId(
    body: Record<string, unknown>,
    contactId: string
): Record<string, unknown> {
    if (contactId.startsWith("ctc_")) {
        return {...body, contactId}
    }

    return body
}
