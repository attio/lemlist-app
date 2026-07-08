import {Workflows} from "attio/client"
import block from "./block"

export default Workflows.defineConfigurator(block, (workflowBlock) => {
    const {EmailAddressInput, Outcome} = Workflows.useConfigurator(workflowBlock.configSchema)

    return (
        <>
            <EmailAddressInput name="email" label="Email address" />
            <Outcome
                id="found"
                label="Found"
                schema={Workflows.OutcomeSchema.struct({
                    leads: Workflows.OutcomeSchema.array(
                        Workflows.OutcomeSchema.struct({
                            lead_id: Workflows.OutcomeSchema.string().title("Lead ID"),
                            email: Workflows.OutcomeSchema.emailAddress().title("Email"),
                            first_name: Workflows.OutcomeSchema.string().title("First name"),
                            last_name: Workflows.OutcomeSchema.string().title("Last name"),
                            campaign_id: Workflows.OutcomeSchema.string().title("Campaign ID"),
                            campaign_name: Workflows.OutcomeSchema.string().title("Campaign name"),
                            lead_state: Workflows.OutcomeSchema.string().title("Lead state"),
                            is_paused: Workflows.OutcomeSchema.boolean().title("Is paused"),
                        })
                    ).title("Leads"),
                })}
            />
            <Outcome id="not_found" label="Not found" schema={null} />
        </>
    )
})
