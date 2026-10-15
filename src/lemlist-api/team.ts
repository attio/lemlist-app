import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {createLogger} from "../common/logger"
import {type LemlistApiError, lemlistApi} from "./transport/lemlist"
import {endpoints} from "./endpoints"
import {schemaParseError} from "./transport/error"
import {LemlistTeamResponseSchema, type LemlistUser} from "./schemas"

const logger = createLogger("lemlist-team")

/**
 * Single request: `version=v2` embeds member details, so no per-user Get User fan-out
 * (which tripped the 20 req / 2 s rate limit on larger teams).
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/team/get-team
 */
export async function getTeamMembers(): AsyncResult<LemlistUser[], LemlistApiError> {
    const teamResult = await lemlistApi.get(endpoints.api.team, {version: "v2"})

    if (isErrored(teamResult)) {
        return teamResult
    }

    const parsedTeam = LemlistTeamResponseSchema.safeParse(teamResult.value.data)

    if (!parsedTeam.success) {
        logger.error(`Failed to parse team response: ${parsedTeam.error.message}`)
        return errored(schemaParseError(parsedTeam.error))
    }

    return complete(parsedTeam.data.users)
}
