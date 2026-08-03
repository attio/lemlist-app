import {Workflows} from "attio"

export default Workflows.defineWorkflowBlock({
    type: "step",
    id: "pause-lead",
    title: "Pause lead",
    description: "Pause a lemlist lead by email address, optionally scoped to a campaign",
    configSchema: Workflows.ConfigSchema.struct({
        email: Workflows.ConfigSchema.emailAddress().optional(),
        leadId: Workflows.ConfigSchema.string().optional(),
        campaignId: Workflows.ConfigSchema.string().optional(),
    }),
})
