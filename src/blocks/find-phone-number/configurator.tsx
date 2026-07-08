import {Workflows} from "attio/client"
import block from "./block"

export default Workflows.defineConfigurator(block, (workflowBlock) => {
    const {EmailAddressInput, TextInput, Outcome} = Workflows.useConfigurator(
        workflowBlock.configSchema
    )

    return (
        <>
            <EmailAddressInput name="email" label="Email" />
            <TextInput name="linkedinUrl" label="LinkedIn URL" />
            <TextInput name="firstName" label="First name" />
            <TextInput name="lastName" label="Last name" />
            <TextInput name="companyName" label="Company name" />
            <Outcome
                id="found"
                label="Found"
                schema={Workflows.OutcomeSchema.struct({
                    phone_number: Workflows.OutcomeSchema.phoneNumber().title("Phone number"),
                })}
            />
            <Outcome id="not_found" label="Not found" schema={null} />
        </>
    )
})
