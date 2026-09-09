import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {createLogger} from "../common/logger"
import {type LemlistApiError, lemlistApi} from "./transport/lemlist"
import {endpoints} from "./endpoints"
import {schemaParseError} from "./transport/error"
import {LemlistTeamResponseSchema, type LemlistUser, LemlistUserSchema} from "./schemas"

const logger = createLogger("lemlist-team")

async function getUser(userId: string): AsyncResult<LemlistUser, LemlistApiError> {
    const result = await lemlistApi.get(endpoints.api.user(userId))

    if (isErrored(result)) {
        logger.error("Failed to fetch user", {userId, error: result.error})
        return result
    }

    const parsed = LemlistUserSchema.safeParse(result.value.data)

    if (!parsed.success) {
        logger.error(`Failed to parse user ${userId}: ${parsed.error.message}`)
        return errored(schemaParseError(parsed.error))
    }

    return complete(parsed.data)
}

/**
 * @see https://developer.lemlist.com/api-reference/endpoints/team/get-team
 */
export async function getTeamMembers(): AsyncResult<LemlistUser[], LemlistApiError> {
    const teamResult = await lemlistApi.get(endpoints.api.team)

    if (isErrored(teamResult)) {
        return teamResult
    }

    const parsedTeam = LemlistTeamResponseSchema.safeParse(teamResult.value.data)

    if (!parsedTeam.success) {
        logger.error(`Failed to parse team response: ${parsedTeam.error.message}`)
        return errored(schemaParseError(parsedTeam.error))
    }

    const {userIds} = parsedTeam.data

    const results = await Promise.all(userIds.map(getUser))
    const validUsers = results.flatMap((r) => (isErrored(r) ? [] : [r.value]))

    return complete(validUsers)
}
