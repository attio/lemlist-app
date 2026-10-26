import {type AsyncResult, bind, errored} from "@attio/fetchable"
import {ErrorCode, errorMessage} from "../error-codes"
import {createLogger} from "../common/logger"
import {type LemlistApiError, lemlistApi} from "./transport/lemlist"
import {endpoints} from "./endpoints"
import {parseResponse} from "./transport/error"
import {
    type LemlistCreateTaskRequest,
    LemlistCreateTaskRequestSchema,
    type LemlistCreateTaskResponse,
    LemlistCreateTaskResponseSchema,
} from "./schemas"

const logger = createLogger("lemlist-tasks")

/**
 * @see https://developer.lemlist.com/api-reference/endpoints/tasks/create-task
 */
export async function createTask(
    options: LemlistCreateTaskRequest
): AsyncResult<LemlistCreateTaskResponse, LemlistApiError> {
    const body = LemlistCreateTaskRequestSchema.safeParse(options)

    if (!body.success) {
        logger.error(`Invalid create task request: ${body.error.message}`)
        return errored({
            code: "INVALID_REQUEST",
            detail: errorMessage(ErrorCode.CreateTaskInvalidRequest),
        })
    }

    const responseResult = await lemlistApi.post(endpoints.api.tasks, body.data)

    return bind(responseResult, (response) =>
        parseResponse(LemlistCreateTaskResponseSchema, response.data)
    )
}
