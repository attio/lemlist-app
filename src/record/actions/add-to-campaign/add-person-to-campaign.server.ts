import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {createLeadInCampaign, getAddLeadQueryParams} from "../../../lemlist-api/campaigns"
import {resolveContactOwner} from "../../../lemlist-api/resolve-contact-owner"
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

export type AddPersonToCampaignSuccess = {
    lead: LemlistCreateLeadResponse
    /** Set when the requested owner couldn't be matched and ownership fell back to the admin. */
    ownerWarning: string | null
}

export default async function addPersonToCampaign({
    campaignId,
    recordId,
    contactOwner,
}: {
    campaignId: string
    recordId: string
    /**
     * Attio user's email (or Lemlist user ID). Resolved to a Lemlist user ID before create.
     * Unset/empty (or unmatched) falls back to `null` (Lemlist assigns the API-key owner).
     */
    contactOwner: string | null
}): AsyncResult<AddPersonToCampaignSuccess, AddPersonToCampaignError> {
    const ownerResult = await resolveContactOwner({owner: contactOwner})
    if (isErrored(ownerResult)) {
        return errored({errorMessage: ownerResult.error.errorMessage})
    }

    const personResult = await loadPersonForLemlist(recordId)
    if (isErrored(personResult)) {
        return errored({errorMessage: addPersonToCampaignErrorMessage(personResult.error)})
    }

    const addLeadQueryParams = await getAddLeadQueryParams()
    const result = await createLeadInCampaign({
        campaignId,
        person: personResult.value,
        contactOwner: ownerResult.value.userId,
        addLeadQueryParams,
    })

    if (isErrored(result)) {
        logger.error(`Failed to add person to campaign ${campaignId}: ${result.error.errorMessage}`)
        return errored({errorMessage: result.error.errorMessage})
    }

    return complete({lead: result.value, ownerWarning: ownerResult.value.warning})
}
