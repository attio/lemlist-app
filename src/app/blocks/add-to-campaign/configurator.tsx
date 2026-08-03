import {Workflows} from "attio/client"
import {useCampaignsProvider} from "../../../utils/hooks/use-campaigns-provider"
import {useTeamMembersProvider} from "../../../utils/hooks/use-team-members-provider"
import block from "./block"

export default Workflows.defineConfigurator(block, (workflowBlock) => {
    const {CheckboxInput, ComboboxInput, EmailAddressInput, PhoneNumberInput, TextInput, Outcome} =
        Workflows.useConfigurator(workflowBlock.configSchema)

    const campaignsProvider = useCampaignsProvider()
    const teamMembersProvider = useTeamMembersProvider()

    return (
        <>
            <ComboboxInput
                name="campaignId"
                label="Campaign"
                help="Select a campaign"
                options={campaignsProvider}
            />
            <EmailAddressInput name="email" label="Email" />
            <TextInput name="firstName" label="First name" />
            <TextInput name="lastName" label="Last name" />
            <TextInput name="companyName" label="Company name" />
            <TextInput name="jobTitle" label="Job title" />
            <TextInput name="linkedinUrl" label="LinkedIn URL" />
            <PhoneNumberInput name="phone" label="Phone number" />
            <TextInput name="companyDomain" label="Company domain" />
            <ComboboxInput
                name="contactOwner"
                label="Lead owner"
                help="Lemlist team member who will own this lead. You can also pass a Lemlist user ID or email from a prior step."
                placeholder="Select a team member"
                options={teamMembersProvider}
            />
            <CheckboxInput
                name="findEmail"
                label="Find email"
                help="Find a verified email address when adding a lead."
                disableVariables
            />
            <CheckboxInput
                name="findPhone"
                label="Find phone"
                help="Find a phone number when adding a lead."
                disableVariables
            />
            <CheckboxInput
                name="linkedinEnrichment"
                label="Enable social enrichment"
                help="Run social enrichment when adding a lead."
                disableVariables
            />
            <CheckboxInput
                name="verifyEmail"
                label="Verify email"
                help="Verify the existing email address (debounce)."
                disableVariables
            />
            <CheckboxInput
                name="deduplicate"
                label="Deduplicate"
                help="Skip adding the lead if the email already exists in another campaign."
                disableVariables
            />
            <Outcome
                id="added"
                schema={Workflows.OutcomeSchema.struct({
                    lead_id: Workflows.OutcomeSchema.string().title("Lead ID"),
                    campaign_id: Workflows.OutcomeSchema.string().title("Campaign ID"),
                    email: Workflows.OutcomeSchema.string().title("Email"),
                })}
            />
        </>
    )
})
