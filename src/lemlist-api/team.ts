import {type AsyncResult, bind, map} from "@attio/fetchable"
import {type LemlistApiError, lemlistApi} from "./transport/lemlist"
import {endpoints} from "./endpoints"
import {parseResponse} from "./transport/error"
import {LemlistTeamResponseSchema, type LemlistUser} from "./schemas"

/**
 * Single request: `version=v2` embeds member details, so no per-user Get User fan-out
 * (which tripped the 20 req / 2 s rate limit on larger teams).
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/team/get-team
 */
export async function getTeamMembers(): AsyncResult<LemlistUser[], LemlistApiError> {
    const teamResult = await lemlistApi.get(endpoints.api.team, {version: "v2"})

    return bind(teamResult, (response) =>
        map(parseResponse(LemlistTeamResponseSchema, response.data), (team) => team.users)
    )
}
