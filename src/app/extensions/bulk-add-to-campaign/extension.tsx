import {isErrored} from "@attio/fetchable"
import {
    type BulkRecordActionBatchRunOutcome,
    runQuery,
    showDialog,
    showToast,
    Extensions,
} from "attio/client"
import getCurrentUser from "../../../graphql/get-current-user.graphql"
import {pluralize} from "../../../utils/pluralize"
import resolveContactOwnerServer from "../../../utils/resolve-contact-owner.server"
import addPeopleToCampaign from "../../../record/bulk-actions/add-to-campaign/add-people-to-campaign.server"
import BulkAddToCampaignDialog, {
    type BulkAddFormValues,
} from "../../../record/bulk-actions/add-to-campaign/bulk-add-to-campaign-dialog"

const BATCH_SIZE = 50

// Prettify known error messages
function formatErrorMessage(message: string, count: number) {
    if (message.toLowerCase().includes("lead already in the campaign")) {
        return `Skipped ${count} ${pluralize(count, "lead", "leads")} that ${pluralize(count, "is", "are")} already in the campaign.`
    }
    return `${count} failed: ${message}`
}

type BatchOutcome = {
    successes: number
    errorsByMessage: Record<string, number>
    noEmailCount: number
    notFoundCount: number
}

async function processBatch({
    campaignId,
    recordIds,
    contactOwner,
}: {
    campaignId: string
    recordIds: string[]
    contactOwner: string | null
}): Promise<BatchOutcome> {
    // People are loaded and added entirely server-side so the full lemlist payload (including Attio
    // custom attributes) stays on the backend. Each record is reported individually below.
    const bulkAddOutcome = await addPeopleToCampaign({
        recordIds,
        campaignId,
        contactOwner,
    })

    let successes = 0
    let noEmailCount = 0
    let notFoundCount = 0
    const errorsByMessage: Record<string, number> = {}

    for (const outcome of bulkAddOutcome) {
        switch (outcome.status) {
            case "success":
                successes++
                break
            case "skipped_no_email":
                noEmailCount++
                break
            case "skipped_not_found":
                notFoundCount++
                break
            case "error":
                errorsByMessage[outcome.errorMessage] =
                    (errorsByMessage[outcome.errorMessage] ?? 0) + 1
                break
        }
    }

    return {successes, errorsByMessage, noEmailCount, notFoundCount}
}

async function showSummaryToast({
    outcome,
    campaignName,
}: {
    outcome: BulkRecordActionBatchRunOutcome<BatchOutcome>
    campaignName: string | null
}) {
    // Show failure toast if the run failed
    if (!outcome.success) {
        showToast({
            variant: "error",
            title: "Error adding to campaign",
            text:
                outcome?.error instanceof Error
                    ? outcome.error.message
                    : `No people were added to ${campaignName ?? "the campaign"}`,
            durationMs: 8_000,
        })
        return
    }

    // Aggregate counts from each batch
    const {successes, skippedNoEmail, skippedNotFound, errorsByMessage} = outcome.results.reduce(
        (acc, outcome) => {
            acc.successes += outcome.successes
            acc.skippedNoEmail += outcome.noEmailCount
            acc.skippedNotFound += outcome.notFoundCount
            for (const [message, count] of Object.entries(outcome.errorsByMessage)) {
                acc.errorsByMessage[message] = (acc.errorsByMessage[message] ?? 0) + count
            }
            return acc
        },
        {
            successes: 0,
            skippedNoEmail: 0,
            skippedNotFound: 0,
            errorsByMessage: {} as Record<string, number>,
        }
    )

    // Summary message to show on the toast (summarise messages errors if any)
    const summary = [
        ...Object.entries(errorsByMessage).map(([message, count]) =>
            formatErrorMessage(message, count)
        ),
        skippedNoEmail > 0
            ? `${skippedNoEmail} skipped ${pluralize(skippedNoEmail, "person", "people")} that ${pluralize(skippedNoEmail, "has", "have")} no email address.`
            : null,
        skippedNotFound > 0
            ? `${skippedNotFound} skipped ${pluralize(skippedNotFound, "person", "people")} that ${pluralize(skippedNotFound, "was", "were")} not found in Attio.`
            : null,
    ]
        .filter((segment): segment is string => segment !== null)
        .join(" • ")

    // Determine the variant and title of the toast
    let variant: "success" | "warning" | "error" = "success"
    let title: string = ""
    if (successes === 0) {
        variant = "error"
        title = `No people were added to ${campaignName ?? "the campaign"}`
    } else {
        title = `Added ${successes} ${pluralize(successes, "person", "people")} to ${campaignName ?? "the campaign"}`
        if (Object.keys(errorsByMessage).length > 0 || skippedNoEmail > 0 || skippedNotFound > 0) {
            variant = "warning"
        }
    }

    // Show the toast
    await showToast({
        variant,
        title,
        text: summary || undefined,
        durationMs: 8_000,
    })
}

export default Extensions.defineExtension({
    type: "bulk-record-action",
    id: "bulk-add-to-campaign",
    label: "Add to campaign",
    objects: "people",
    onTrigger: async ({runRecordBatches}) => {
        let formValues: BulkAddFormValues | null = null

        await showDialog({
            title: "Add to campaign",
            Dialog: ({hideDialog}) => (
                <BulkAddToCampaignDialog
                    hideDialog={hideDialog}
                    onSubmit={(values) => {
                        formValues = values
                        hideDialog()
                    }}
                />
            ),
        })

        if (!formValues) {
            return
        }

        const {campaignId, campaignName} = formValues
        const {currentUser} = await runQuery(getCurrentUser)
        const ownerResult = await resolveContactOwnerServer(currentUser.email)
        if (isErrored(ownerResult)) {
            await showToast({
                variant: "error",
                title: "Could not resolve lead owner",
                text: ownerResult.error.errorMessage,
                durationMs: 8_000,
            })
            return
        }
        const {userId: contactOwner, warning: ownerWarning} = ownerResult.value
        if (ownerWarning) {
            await showToast({
                variant: "warning",
                title: "Lead owner defaulted to workspace admin",
                text: ownerWarning,
                durationMs: 8_000,
            })
        }

        const outcome = await runRecordBatches(
            {
                batchSize: BATCH_SIZE,
                onStart: ({totalRecords}) => ({
                    title: `Adding to campaign${campaignName ? ` ${campaignName}` : ""}`,
                    text: `Preparing ${totalRecords} ${pluralize(totalRecords, "person", "people")}…`,
                }),
                onProgress: ({processedRecords, totalRecords}) => ({
                    title: `Adding to campaign${campaignName ? ` ${campaignName}` : ""}`,
                    text: `${processedRecords} of ${totalRecords} processed`,
                }),
                onError: (_context, error) => ({
                    title: `Error adding to campaign${campaignName ? ` ${campaignName}` : ""}`,
                    text: error instanceof Error ? error.message : "Unknown error",
                }),
            },
            (batch) => processBatch({campaignId, recordIds: batch.recordIds, contactOwner})
        )

        await showSummaryToast({outcome, campaignName})
    },
})
