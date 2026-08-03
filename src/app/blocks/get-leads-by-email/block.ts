import {Workflows} from "attio"

export default Workflows.defineWorkflowBlock({
    type: "step",
    id: "get-leads-by-email",
    title: "Get leads by email",
    description: "Look up lemlist leads by their email address",
    configSchema: Workflows.ConfigSchema.struct({
        email: Workflows.ConfigSchema.emailAddress(),
    }),
})
