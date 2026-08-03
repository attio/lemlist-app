import {useAsyncCache, Workflows} from "attio/client"
import listCampaignsForBlock from "../../../utils/list-campaigns.server"
import block from "./block"
import {hasCampaignFilter, optionsProvider} from "./options"
import {getOutcomeSchema} from "./outcome-schema"

export default Workflows.defineConfigurator(block, (workflowBlock) => {
    const {ComboboxInput, Outcome, watch} = Workflows.useConfigurator(workflowBlock.configSchema)

    const eventTypeConfig = watch("eventType")
    const eventType = eventTypeConfig?.type === "static" ? eventTypeConfig.value : undefined

    const {
        values: {campaigns},
    } = useAsyncCache({campaigns: listCampaignsForBlock})

    const campaignOptions = campaigns.map((c) => ({
        value: c.value,
        label: c.label,
        description: c.description,
    }))

    return (
        <>
            <ComboboxInput
                name="eventType"
                label="Event type"
                disableVariables
                options={optionsProvider}
            />
            {hasCampaignFilter(eventType) && (
                <ComboboxInput
                    name="campaignId"
                    label="Campaign"
                    placeholder="Any campaign"
                    disableVariables
                    options={campaignOptions}
                />
            )}
            <Outcome id="triggered" schema={getOutcomeSchema(eventType)} />
        </>
    )
})
