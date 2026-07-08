import {isErrored} from "@attio/fetchable"
import {
    Banner,
    Button,
    LoadingState,
    Typography,
    useAsyncCache,
    useForm,
    type ValueOf,
} from "attio/client"
import {Suspense} from "react"
import type {LemlistCampaign} from "../../../lemlist-api/schemas"
import {createCampaignsProvider} from "../../../utils/hooks/use-campaigns-provider"
import {buildFormConfig} from "../../actions/add-to-campaign/campaign-form-utils"
import listCampaignsForDialog from "../../actions/add-to-campaign/list-campaigns-for-dialog.server"

export type BulkAddFormValues = {
    campaignId: string
    campaignName: string | null
}

function BulkAddToCampaignDialogForm({
    campaigns,
    onSubmit,
}: {
    campaigns: LemlistCampaign[]
    onSubmit: (values: BulkAddFormValues) => void
}) {
    const {schema, initialValues} = buildFormConfig()
    const {Form, Combobox, SubmitButton} = useForm(schema, initialValues)

    const mappedCampaigns = campaigns.map((c) => ({
        value: c._id,
        label: c.name,
        description: c.status,
    }))
    const campaignsProvider = createCampaignsProvider(mappedCampaigns)

    const handleSubmit = async (values: ValueOf<typeof schema>) => {
        const campaignId = values.campaignId
        const campaignName = mappedCampaigns.find((c) => c.value === campaignId)?.label || null

        onSubmit({campaignId: campaignId, campaignName: campaignName})
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
            <Typography.Caption>
                People without an email address will be skipped.
            </Typography.Caption>
        </>
    )
}

function BulkAddToCampaignDialogLoaded({
    onSubmit,
    hideDialog,
}: {
    onSubmit: (values: BulkAddFormValues) => void
    hideDialog: () => void
}) {
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

    return <BulkAddToCampaignDialogForm campaigns={campaigns.value} onSubmit={onSubmit} />
}

export default function BulkAddToCampaignDialog({
    onSubmit,
    hideDialog,
}: {
    onSubmit: (values: BulkAddFormValues) => void
    hideDialog: () => void
}) {
    return (
        <Suspense fallback={<LoadingState>Loading campaigns…</LoadingState>}>
            <BulkAddToCampaignDialogLoaded onSubmit={onSubmit} hideDialog={hideDialog} />
        </Suspense>
    )
}
