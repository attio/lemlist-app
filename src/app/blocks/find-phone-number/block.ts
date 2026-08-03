import {Workflows} from "attio"

export default Workflows.defineWorkflowBlock({
    type: "step",
    id: "find-phone-number",
    title: "Find phone number",
    description: "Use lemlist to find a phone number for a person",
    configSchema: Workflows.ConfigSchema.struct({
        email: Workflows.ConfigSchema.emailAddress().optional(),
        linkedinUrl: Workflows.ConfigSchema.string().optional(),
        firstName: Workflows.ConfigSchema.string().optional(),
        lastName: Workflows.ConfigSchema.string().optional(),
        companyName: Workflows.ConfigSchema.string().optional(),
    }),
})
