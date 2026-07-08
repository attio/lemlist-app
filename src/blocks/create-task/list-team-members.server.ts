import {isErrored} from "@attio/fetchable"
import {getTeamMembers} from "../../lemlist-api/team"
import {createLogger} from "../../utils/logger"

const logger = createLogger("create-task-block list-team-members")

// Returns Promise<T> (not AsyncResult) because useAsyncCache expects plain promises.
// Errors are logged and swallowed an empty list is a safe fallback in the configurator UI.
export default async function listTeamMembersForBlock(): Promise<
    Array<{value: string; label: string; description?: string}>
> {
    const result = await getTeamMembers()

    if (isErrored(result)) {
        logger.error(`Failed to list team members: ${result.error.errorMessage}`)
        return []
    }

    return result.value.map((member) => {
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
