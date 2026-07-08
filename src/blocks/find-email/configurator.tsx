import {Workflows} from "attio/client"
import block from "./block"

export default Workflows.defineConfigurator(block, (workflowBlock) => {
    const {TextInput, Outcome} = Workflows.useConfigurator(workflowBlock.configSchema)

    return (
        <>
            <TextInput name="linkedinUrl" label="LinkedIn URL" />
            <TextInput name="firstName" label="First name" />
            <TextInput name="lastName" label="Last name" />
            <TextInput name="companyName" label="Company name" />
            <Outcome
                id="found"
                label="Found"
                schema={Workflows.OutcomeSchema.struct({
                    email: Workflows.OutcomeSchema.emailAddress().title("Email"),
                })}
            />
            <Outcome id="not_found" label="Not found" schema={null} />
        </>
    )
})
