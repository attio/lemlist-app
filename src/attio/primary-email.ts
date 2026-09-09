/**
 * Returns the first non-empty trimmed email address from an Attio person record.
 */
export function getPrimaryEmail(emailAddresses: string[] | undefined): string | null {
    const email = emailAddresses?.[0]?.trim()
    return email ? email : null
}
