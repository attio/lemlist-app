import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {createTask} from "../../../lemlist-api/tasks"
import {createLogger} from "../../../utils/logger"
import block from "./block"

const logger = createLogger("create-task step - execute")

export default Workflows.defineWorkflowBlockExecute(block, async ({config, metadata}) => {
    const result = await createTask({
        assignedTo: config.assignedTo,
        type: config.type,
        dueDate: new Date(config.dueDate.value).toISOString(),
        recordId: config.recordId,
        priority: (config.priority ?? undefined) as "" | "0" | "1" | "2" | undefined,
        title: config.title ?? undefined,
        description: config.description ?? undefined,
    })

    if (isErrored(result)) {
        logger.error("Failed to create task", {
            uniqueExecutionId: metadata.uniqueExecutionId,
            error: result.error,
        })

        return {
            type: "error",
            errorMessage: result.error.errorMessage,
        }
    }

    const task = result.value

    return {
        type: "outcome",
        id: "created",
        data: {
            task_id: task._id,
            type: task.type,
            due_date: task.dueDate,
            user_id: task.userId ?? "",
            contact_id: task.contactId ?? "",
        },
    }
})
