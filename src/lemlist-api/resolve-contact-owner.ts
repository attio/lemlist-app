import {type AsyncResult, complete, isErrored} from "@attio/fetchable"
import {type LemlistApiError} from "./client"
import type {LemlistUser} from "./schemas"
import {getTeamMembers} from "./team"

export type ResolvedContactOwner = {
    /** Lemlist user ID, or `null` to leave ownership to the API-key owner (workspace admin). */
    userId: string | null
    /**
     * Set only when an owner was requested but no team member matched. The lead still goes through
     * (owner falls back to `null`); the caller should surface this so the user knows why.
     */
    warning: string | null
}

/**
 * Resolves a contact-owner value (Lemlist user ID or login email) to a Lemlist user ID.
 *
 * - Unset / empty → `null`, no warning (Lemlist uses the API-key owner).
 * - Valid ID or email → Lemlist user ID.
 * - Set but not on the team → `null` + a warning (never blocks the add; Lemlist would silently
 *   ignore an unknown owner anyway).
 *
 * Prefer IDs over emails — IDs do not depend on the Attio email matching the Lemlist login email.
 */
export async function resolveContactOwner({
    owner,
    teamMembers,
}: {
    owner: string | null | undefined
    /** Optional pre-fetched team list so bulk callers can resolve once and reuse. */
    teamMembers?: LemlistUser[]
}): AsyncResult<ResolvedContactOwner, LemlistApiError> {
    const trimmed = owner?.trim()
    if (!trimmed) {
        return complete({userId: null, warning: null})
    }

    let members = teamMembers
    if (!members) {
        const teamResult = await getTeamMembers()
        if (isErrored(teamResult)) {
            return teamResult
        }
        members = teamResult.value
    }

    const byId = members.find((member) => member._id === trimmed)
    if (byId) {
        return complete({userId: byId._id, warning: null})
    }

    const normalized = trimmed.toLowerCase()
    const byEmail = members.find((member) => member.email?.toLowerCase() === normalized)
    if (byEmail) {
        return complete({userId: byEmail._id, warning: null})
    }

    return complete({
        userId: null,
        warning: `No lemlist user matches "${trimmed}", so this lead will be assigned to your lemlist workspace admin by default. To assign a specific owner, make sure they have a lemlist account using the same email as their Attio account.`,
    })
}
