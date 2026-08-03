import {Workflows} from "attio/client"
import block from "./block"

export default Workflows.defineConfigurator(block, () => {
    const {EmailAddressInput, PhoneNumberInput, TextInput, Outcome} = Workflows.useConfigurator()

    return (
        <>
            <EmailAddressInput name="email" label="Email" />
            <PhoneNumberInput name="phoneNumber" label="Phone number" />
            <TextInput name="firstName" label="First name" />
            <TextInput name="lastName" label="Last name" />
            <TextInput name="companyName" label="Company name" />
            <Outcome
                id="found"
                label="Found"
                schema={Workflows.OutcomeSchema.struct({
                    linkedin_url: Workflows.OutcomeSchema.string().title("LinkedIn URL"),
                    first_name: Workflows.OutcomeSchema.string().title("First name"),
                    last_name: Workflows.OutcomeSchema.string().title("Last name"),
                    location_name: Workflows.OutcomeSchema.string().title("Location"),
                    industry: Workflows.OutcomeSchema.string().title("Industry"),
                    company_name: Workflows.OutcomeSchema.string().title("Company name"),
                    company_domain: Workflows.OutcomeSchema.string().title("Company domain"),
                    occupation: Workflows.OutcomeSchema.string().title("Occupation"),
                    tagline: Workflows.OutcomeSchema.string().title("Tagline"),
                })}
            />
            <Outcome id="not_found" label="Not found" schema={null} />
        </>
    )
})
