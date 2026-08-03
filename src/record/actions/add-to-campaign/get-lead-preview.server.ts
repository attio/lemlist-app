import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {resolveContactOwner} from "../../../lemlist-api/resolve-contact-owner"
import {buildContactBody, buildLeadBody} from "../../../utils/person-for-campaign"
import {addPersonToCampaignErrorMessage} from "./errors"
import {loadPersonForLemlist} from "./load-person-for-lemlist"

/** The exact lemlist lead payload, keyed by lemlist field name. */
export type LeadPreviewPayload = Record<string, unknown>

/** Preview payload plus any owner-resolution warning to show alongside it. */
export type LeadPreview = {
    /** `null` when the person has no email address and there is nothing to send to lemlist. */
    payload: LeadPreviewPayload | null
    /** Set when the requested owner couldn't be matched and ownership fell back to the admin. */
    ownerWarning: string | null
}

/** Error surfaced to the dialog, normalised to a single user-facing message. */
export type LeadPreviewError = {errorMessage: string}

/**
 * Loads the exact lemlist lead payload for a person so the dialog can preview what will be sent. The
 * payload (including Attio custom attributes) is built server-side. `payload` is `null` when the
 * person has no email address and therefore has nothing to send to lemlist.
 */
export default async function getLeadPreview({
    recordId,
    contactOwner,
}: {
    recordId: string
    /** Unset/empty (or unmatched) falls back to `null` (omitted from the preview payload). */
    contactOwner: string | null
}): AsyncResult<LeadPreview, LeadPreviewError> {
    const ownerResult = await resolveContactOwner({owner: contactOwner})
    if (isErrored(ownerResult)) {
        return errored({errorMessage: ownerResult.error.errorMessage})
    }

    const personResult = await loadPersonForLemlist(recordId)
    if (isErrored(personResult)) {
        return errored({errorMessage: addPersonToCampaignErrorMessage(personResult.error)})
    }

    // The preview shows everything we are about to send to lemlist, so it merges
    // the fields from both contact body and lead body.
    const payload = {
        ...buildContactBody({person: personResult.value, contactOwner: ownerResult.value.userId}),
        ...buildLeadBody({person: personResult.value, contactOwner: ownerResult.value.userId}),
    }

    return complete({payload, ownerWarning: ownerResult.value.warning})
}
