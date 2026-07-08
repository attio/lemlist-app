import {Workflows} from "attio"

export default Workflows.defineWorkflowBlock({
    type: "step",
    id: "create-task",
    title: "Create task",
    description: "Create a task in lemlist and assign it to a team member",
    configSchema: Workflows.ConfigSchema.struct({
        assignedTo: Workflows.ConfigSchema.string(),
        type: Workflows.ConfigSchema.string(),
        dueDate: Workflows.ConfigSchema.date(),
        recordId: Workflows.ConfigSchema.string(),
        priority: Workflows.ConfigSchema.string().optional(),
        title: Workflows.ConfigSchema.string().optional(),
        description: Workflows.ConfigSchema.string().optional(),
    }),
})
