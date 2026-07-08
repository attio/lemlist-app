import type {App} from "attio"
import {runQuery, showDialog, showToast} from "attio/client"
import getPersonSummary from "../../../graphql/get-person-summary.graphql"
import {getPrimaryEmail} from "../../../utils/attio"
import AddToCampaignDialog from "./add-to-campaign-dialog"

export const addToCampaignAction: App.Record.Action = {
    id: "add-to-campaign",
    label: "Add to campaign",
    objects: "people",
    onTrigger: async ({recordId}) => {
        const {person} = await runQuery(getPersonSummary, {recordId})

        if (!person) {
            await showToast({
                variant: "error",
                title: "Person not found",
                text: "Could not load Person record from Attio.",
            })
            return
        }

        const email = getPrimaryEmail(person.email_addresses)
        if (!email) {
            await showToast({
                variant: "error",
                title: "No email address",
                text: "This person record has no email address. Add an email before adding them to a campaign.",
            })
            return
        }

        const fullName = person.name?.full_name ?? null

        await showDialog({
            title: fullName ? `Add ${fullName} to campaign` : "Add to campaign",
            Dialog: ({hideDialog}) => (
                <AddToCampaignDialog
                    recordId={recordId}
                    person={{email, fullName}}
                    hideDialog={hideDialog}
                />
            ),
        })
    },
}
