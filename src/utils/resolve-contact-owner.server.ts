import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {type ResolvedContactOwner, resolveContactOwner} from "../lemlist-api/resolve-contact-owner"

export type ResolveContactOwnerServerError = {errorMessage: string}

/**
 * Resolves an Attio user email (or Lemlist user ID) to a Lemlist user ID for use as contactOwner.
 * Returns `{userId: null}` when the owner is unset/empty or can't be matched (with a `warning` in
 * the latter case). Only genuine Lemlist API failures are errored. Used by record/bulk actions so
 * the team lookup happens once before create/upsert calls.
 */
export default async function resolveContactOwnerServer(
    owner: string | null | undefined
): AsyncResult<ResolvedContactOwner, ResolveContactOwnerServerError> {
    const result = await resolveContactOwner({owner})
    if (isErrored(result)) {
        return errored({errorMessage: result.error.errorMessage})
    }
    return complete(result.value)
}
