import {isErrored} from "@attio/fetchable"
import {getTeamMembers} from "../lemlist-api/team"
import {createLogger} from "./logger"

const logger = createLogger("list-team-members")

export type TeamMemberOption = {
    value: string
    label: string
    description?: string
}

/**
 * Returns Promise<T> (not AsyncResult) because useAsyncCache expects plain promises.
 * Errors are logged and swallowed — an empty list is a safe fallback in the configurator UI.
 */
export default async function listTeamMembers(): Promise<TeamMemberOption[]> {
    const result = await getTeamMembers()

    if (isErrored(result)) {
        logger.error(`Failed to list team members: ${result.error.errorMessage}`)
        return []
    }

    return result.value.map((member) => {
        // Lemlist's Get User docs only guarantee email (+ role); first/last name are optional.
        const label =
            member.firstName || member.lastName
                ? [member.firstName, member.lastName].filter(Boolean).join(" ")
                : (member.email ?? member._id)

        return {
            value: member._id,
            label,
            description: member.email,
        }
    })
}
