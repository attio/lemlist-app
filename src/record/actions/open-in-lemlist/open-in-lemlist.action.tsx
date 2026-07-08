import {isErrored} from "@attio/fetchable"
import type {App} from "attio"
import {runQuery, showDialog, showToast} from "attio/client"
import getPersonSummary from "../../../graphql/get-person-summary.graphql"
import {getPrimaryEmail} from "../../../utils/attio"
import openInLemlist from "./open-in-lemlist.server"
import OpenInLemlistDialog from "./open-in-lemlist-dialog"

export const openInLemlistAction: App.Record.Action = {
    id: "open-in-lemlist",
    label: "Open in lemlist",
    objects: "people",
    onTrigger: async ({recordId}) => {
        const {person} = await runQuery(getPersonSummary, {recordId})
        const email = getPrimaryEmail(person?.email_addresses)

        if (!email) {
            await showToast({
                variant: "error",
                title: "No email address",
                text: "This person record has no email address to look up in lemlist.",
            })
            return
        }

        const {updateToast} = await showToast({
            variant: "neutral",
            title: "Getting lemlist information",
            dismissable: false,
            durationMs: 60_000,
        })

        const result = await openInLemlist(email)

        if (isErrored(result)) {
            await updateToast({
                variant: "error",
                title: "The email of this person is not available in lemlist",
                dismissable: true,
                durationMs: 4_000,
            })
            return
        }

        await updateToast({
            variant: "success",
            title: "User found in lemlist",
            dismissable: true,
            durationMs: 4_000,
        })

        const {url, fullName, company, description, tagline, phone, skills} = result.value

        await showDialog({
            title: fullName ? `Open ${fullName} in lemlist` : "Open in lemlist",
            Dialog: ({hideDialog}) => (
                <OpenInLemlistDialog
                    url={url}
                    fullName={fullName}
                    company={company}
                    description={description}
                    tagline={tagline}
                    phone={phone}
                    skills={skills}
                    hideDialog={hideDialog}
                />
            ),
        })
    },
}
