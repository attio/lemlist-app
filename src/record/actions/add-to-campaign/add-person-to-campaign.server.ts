import {type AsyncResult, errored, isErrored} from "@attio/fetchable"
import {createLeadInCampaign, getAddLeadQueryParams} from "../../../lemlist-api/campaigns"
import type {LemlistCreateLeadResponse} from "../../../lemlist-api/schemas"
import {createLogger} from "../../../utils/logger"
import {addPersonToCampaignErrorMessage} from "./errors"
import {loadPersonForLemlist} from "./load-person-for-lemlist"

const logger = createLogger("add-person-to-campaign")

/**
 * Error surfaced to the dialog. Both the Attio lookup and the lemlist call are normalised to a
 * single user-facing message so the client never deals with the underlying error shapes.
 */
export type AddPersonToCampaignError = {errorMessage: string}

export default async function addPersonToCampaign({
    campaignId,
    recordId,
    contactOwnerEmail,
}: {
    campaignId: string
    recordId: string
    contactOwnerEmail: string | null
}): AsyncResult<LemlistCreateLeadResponse, AddPersonToCampaignError> {
    const personResult = await loadPersonForLemlist(recordId)
    if (isErrored(personResult)) {
        return errored({errorMessage: addPersonToCampaignErrorMessage(personResult.error)})
    }

    const addLeadQueryParams = await getAddLeadQueryParams()
    const result = await createLeadInCampaign({
        campaignId,
        person: personResult.value,
        contactOwnerEmail,
        addLeadQueryParams,
    })

    if (isErrored(result)) {
        logger.error(`Failed to add person to campaign ${campaignId}: ${result.error.errorMessage}`)
        return errored({errorMessage: result.error.errorMessage})
    }

    return result
}
