import {Workflows} from "attio"

export default Workflows.defineWorkflowBlock({
    type: "trigger",
    id: "lemlist-activity",
    title: "New activity",
    description: "Triggers when a lemlist activity event occurs",
    configSchema: Workflows.ConfigSchema.struct({
        eventType: Workflows.ConfigSchema.string(),
        campaignId: Workflows.ConfigSchema.string().optional(),
    }),
})
