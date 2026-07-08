import {Workflows} from "attio"

export default Workflows.defineWorkflowBlock({
    type: "step",
    id: "get-linkedin-data",
    title: "Get LinkedIn data",
    description: "Use lemlist to find a LinkedIn profile URL for a person",
    configSchema: Workflows.ConfigSchema.struct({
        email: Workflows.ConfigSchema.emailAddress().optional(),
        phoneNumber: Workflows.ConfigSchema.phoneNumber().optional(),
        firstName: Workflows.ConfigSchema.string().optional(),
        lastName: Workflows.ConfigSchema.string().optional(),
        companyName: Workflows.ConfigSchema.string().optional(),
    }),
})
