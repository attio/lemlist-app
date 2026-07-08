import {Workflows} from "attio"

export default Workflows.defineWorkflowBlock({
    type: "step",
    id: "verify-email",
    title: "Verify email",
    description: "Use lemlist to verify that an email address is valid",
    configSchema: Workflows.ConfigSchema.struct({
        email: Workflows.ConfigSchema.emailAddress(),
    }),
})
