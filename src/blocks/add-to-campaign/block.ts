import {Workflows} from "attio"

export default Workflows.defineWorkflowBlock({
    type: "step",
    id: "add-to-campaign",
    title: "Add to campaign",
    description: "Add a person as a lead in a lemlist campaign",
    configSchema: Workflows.ConfigSchema.struct({
        campaignId: Workflows.ConfigSchema.string(),
        email: Workflows.ConfigSchema.emailAddress(),
        firstName: Workflows.ConfigSchema.string().optional(),
        lastName: Workflows.ConfigSchema.string().optional(),
        companyName: Workflows.ConfigSchema.string().optional(),
        jobTitle: Workflows.ConfigSchema.string().optional(),
        linkedinUrl: Workflows.ConfigSchema.string().optional(),
        phone: Workflows.ConfigSchema.phoneNumber().optional(),
        companyDomain: Workflows.ConfigSchema.string().optional(),
        contactOwnerEmail: Workflows.ConfigSchema.emailAddress().optional(),
        findEmail: Workflows.ConfigSchema.boolean().optional(),
        findPhone: Workflows.ConfigSchema.boolean().optional(),
        linkedinEnrichment: Workflows.ConfigSchema.boolean().optional(),
        verifyEmail: Workflows.ConfigSchema.boolean().optional(),
        deduplicate: Workflows.ConfigSchema.boolean().optional(),
    }),
})
