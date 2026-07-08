import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {buildContactBody, buildLeadBody} from "../../../utils/person-for-campaign"
import {addPersonToCampaignErrorMessage} from "./errors"
import {loadPersonForLemlist} from "./load-person-for-lemlist"

/** The exact lemlist lead payload, keyed by lemlist field name. */
export type LeadPreview = Record<string, unknown>

/** Error surfaced to the dialog, normalised to a single user-facing message. */
export type LeadPreviewError = {errorMessage: string}

/**
 * Loads the exact lemlist lead payload for a person so the dialog can preview what will be sent. The
 * payload (including Attio custom attributes) is built server-side. Resolves to `null` when the
 * person has no email address and therefore has nothing to send to lemlist.
 */
export default async function getLeadPreview(
    recordId: string
): AsyncResult<LeadPreview | null, LeadPreviewError> {
    const personResult = await loadPersonForLemlist(recordId)
    if (isErrored(personResult)) {
        return errored({errorMessage: addPersonToCampaignErrorMessage(personResult.error)})
    }

    // The preview shows everything we are about to send to lemlist, so it merges
    // the fields from both contact body and lead body.
    const previewLead = {
        ...buildContactBody({person: personResult.value, contactOwnerEmail: null}),
        ...buildLeadBody({person: personResult.value, contactOwnerEmail: null}),
    }

    return complete(previewLead)
}
