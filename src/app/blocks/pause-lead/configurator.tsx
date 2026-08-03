import {Workflows} from "attio/client"
import {useCampaignsProvider} from "../../../utils/hooks/use-campaigns-provider"
import block from "./block"

export default Workflows.defineConfigurator(block, (workflowBlock) => {
    const {ComboboxInput, EmailAddressInput, TextInput, Outcome} = Workflows.useConfigurator(
        workflowBlock.configSchema
    )

    const campaignsProvider = useCampaignsProvider()

    return (
        <>
            <EmailAddressInput name="email" label="Email address" />
            <TextInput name="leadId" label="Lead ID" help="If provided, skips email lookup" />
            <ComboboxInput
                name="campaignId"
                label="Campaign"
                help="Leave empty to pause the lead across all campaigns"
                options={campaignsProvider}
            />
            <Outcome
                id="paused"
                label="Paused"
                schema={Workflows.OutcomeSchema.struct({
                    paused_campaigns: Workflows.OutcomeSchema.array(
                        Workflows.OutcomeSchema.struct({
                            campaign_id: Workflows.OutcomeSchema.string().title("Campaign ID"),
                            lead_id: Workflows.OutcomeSchema.string().title("Lead ID"),
                        })
                    ).title("Paused campaigns"),
                })}
            />
            <Outcome id="not_found" label="Not found" schema={null} />
        </>
    )
})
