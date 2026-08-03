import {isErrored} from "@attio/fetchable"
import {attioApiErrorMessage} from "../../../attio/error"
import {createLeadInCampaign, getAddLeadQueryParams} from "../../../lemlist-api/campaigns"
import {createLogger} from "../../../utils/logger"
import {loadPeopleForCampaign} from "./load-people-for-campaign"

const logger = createLogger("bulk-add-people-to-campaign")

export type BulkAddOutcome =
    | {recordId: string; status: "success"}
    | {recordId: string; status: "error"; errorMessage: string}
    | {recordId: string; status: "skipped_no_email"}
    | {recordId: string; status: "skipped_not_found"}

function assertNever(_value: never): void {}

/**
 * Adds a batch of people to a lemlist campaign. People (and their linked companies) are loaded
 * server-side in two batched Attio queries (see {@link loadPeopleForCampaign}) so the full lemlist
 * payload — including Attio custom attributes — is built on the backend and never exposed to the
 * client, exactly like the single-record action.
 *
 * `contactOwner` must already be a validated Lemlist user ID, or `null` when unset
 * (see {@link resolveContactOwnerServer}) — Lemlist silently ignores invalid owners.
 *
 * Each record is reported individually: records that no longer exist in Attio are `skipped_not_found`
 * and records without an email address are `skipped_no_email`, so the caller can summarise them
 * separately from genuine errors. If the batch can't be loaded at all, every record is reported as an
 * error so the counts still add up.
 */
export default async function addPeopleToCampaign({
    recordIds,
    campaignId,
    contactOwner,
}: {
    recordIds: string[]
    campaignId: string
    /** Pre-resolved Lemlist user ID, or `null` when no owner should be set. */
    contactOwner: string | null
}): Promise<BulkAddOutcome[]> {
    const loadResult = await loadPeopleForCampaign(recordIds)
    if (isErrored(loadResult)) {
        logger.error(`Failed to load batch for campaign ${campaignId}: ${loadResult.error.code}`)
        const errorMessage = attioApiErrorMessage(loadResult.error)
        return recordIds.map((recordId) => ({recordId, status: "error", errorMessage}))
    }

    const peopleByRecordId = loadResult.value
    const addLeadQueryParams = await getAddLeadQueryParams()
    const outcomes: BulkAddOutcome[] = []

    for (const recordId of recordIds) {
        const personResult = peopleByRecordId.get(recordId)
        if (!personResult) {
            outcomes.push({recordId, status: "skipped_not_found"})
            continue
        }
        if (isErrored(personResult)) {
            switch (personResult.error.code) {
                case "NO_EMAIL":
                    outcomes.push({recordId, status: "skipped_no_email"})
                    break
                default:
                    assertNever(personResult.error.code)
            }
            continue
        }
        const person = personResult.value

        const result = await createLeadInCampaign({
            campaignId,
            person,
            contactOwner,
            addLeadQueryParams,
        })

        if (isErrored(result)) {
            logger.error(
                `Failed to add ${recordId} to campaign ${campaignId}: ${result.error.errorMessage}`
            )
            outcomes.push({
                recordId,
                status: "error",
                errorMessage: result.error.errorMessage,
            })
            continue
        }

        outcomes.push({recordId, status: "success"})
    }

    return outcomes
}
