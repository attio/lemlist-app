import {Workflows} from "attio"

export default Workflows.defineWorkflowBlock({
    type: "step",
    id: "find-email",
    title: "Find email",
    description: "Use lemlist to find an email address for a person",
    configSchema: Workflows.ConfigSchema.struct({
        linkedinUrl: Workflows.ConfigSchema.string().optional(),
        firstName: Workflows.ConfigSchema.string().optional(),
        lastName: Workflows.ConfigSchema.string().optional(),
        companyName: Workflows.ConfigSchema.string(),
    }),
})
