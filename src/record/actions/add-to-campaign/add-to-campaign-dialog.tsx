import {isErrored} from "@attio/fetchable"
import {
    Banner,
    Button,
    LoadingState,
    showToast,
    useAsyncCache,
    useForm,
    type ValueOf,
} from "attio/client"
import {Suspense} from "react"
import type {LemlistCampaign} from "../../../lemlist-api/schemas"
import {createCampaignsProvider} from "../../../utils/hooks/use-campaigns-provider"
import addPersonToCampaign from "./add-person-to-campaign.server"
import {buildFormConfig} from "./campaign-form-utils"
import LeadPreview from "./lead-preview"
import listCampaignsForDialog from "./list-campaigns-for-dialog.server"

type Props = {
    recordId: string
    person: {email: string; fullName: string | null}
    /** Email of the Attio user who triggered the action — used as Lemlist contactOwner. */
    currentUserEmail: string
    hideDialog: () => void
}

function AddToCampaignDialogForm({
    recordId,
    person,
    campaigns,
    currentUserEmail,
    hideDialog,
}: {
    recordId: string
    person: {email: string; fullName: string | null}
    campaigns: LemlistCampaign[]
    currentUserEmail: string
    hideDialog: () => void
}) {
    const {schema, initialValues} = buildFormConfig()
    const {Form, Combobox, SubmitButton} = useForm(schema, initialValues)

    const campaignsProvider = createCampaignsProvider(
        campaigns.map((c) => ({value: c._id, label: c.name, description: c.status}))
    )

    const handleSubmit = async (values: ValueOf<typeof schema>) => {
        const campaignId = values.campaignId.trim()
        if (!campaignId) {
            await showToast({
                variant: "error",
                title: "No campaign selected",
                text: "Select a campaign before adding this person as a lead.",
            })
            return
        }

        const {updateToast} = await showToast({
            variant: "neutral",
            title: "Adding to campaign",
            dismissable: false,
            durationMs: 60_000,
        })

        const result = await addPersonToCampaign({
            campaignId,
            recordId,
            contactOwner: currentUserEmail,
        })

        if (isErrored(result)) {
            await updateToast({
                variant: "error",
                title: "Could not add to campaign",
                text: result.error.errorMessage,
                dismissable: true,
                durationMs: 6_000,
            })
            return
        }

        const {lead, ownerWarning} = result.value

        await updateToast({
            variant: ownerWarning ? "warning" : "success",
            title: "Added to campaign",
            text: ownerWarning
                ? ownerWarning
                : lead.campaignName
                  ? `${person.email} was added to ${lead.campaignName}.`
                  : `${person.email} was added to the campaign.`,
            dismissable: true,
            durationMs: ownerWarning ? 8_000 : 4_000,
        })
        hideDialog()
    }

    return (
        <>
            {campaigns.length === 0 ? (
                <Banner variant="warning">
                    No campaigns were found in your lemlist workspace. Create a campaign in lemlist
                    before adding leads.
                </Banner>
            ) : null}
            <Form onSubmit={handleSubmit}>
                <Combobox
                    label="Campaign"
                    name="campaignId"
                    placeholder="Select a campaign"
                    options={campaignsProvider}
                    disabled={campaigns.length === 0}
                />
                <SubmitButton label="Add to campaign" />
            </Form>
            <LeadPreview
                recordId={recordId}
                fullName={person.fullName}
                email={person.email}
                contactOwner={currentUserEmail}
            />
        </>
    )
}

function AddToCampaignDialogLoaded({recordId, person, currentUserEmail, hideDialog}: Props) {
    const {
        values: {campaigns},
    } = useAsyncCache({
        campaigns: listCampaignsForDialog,
    })

    if (isErrored(campaigns)) {
        return (
            <>
                <Banner variant="error">{campaigns.error.errorMessage}</Banner>
                <Button label="Close" onClick={hideDialog} />
            </>
        )
    }

    return (
        <AddToCampaignDialogForm
            recordId={recordId}
            person={person}
            campaigns={campaigns.value}
            currentUserEmail={currentUserEmail}
            hideDialog={hideDialog}
        />
    )
}

export default function AddToCampaignDialog({
    recordId,
    person,
    currentUserEmail,
    hideDialog,
}: Props) {
    return (
        <Suspense fallback={<LoadingState>Loading campaigns…</LoadingState>}>
            <AddToCampaignDialogLoaded
                recordId={recordId}
                person={person}
                currentUserEmail={currentUserEmail}
                hideDialog={hideDialog}
            />
        </Suspense>
    )
}
