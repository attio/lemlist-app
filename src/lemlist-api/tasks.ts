import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {ErrorCode, errorMessage} from "../error-codes"
import {createLogger} from "../utils/logger"
import {type LemlistApiError, lemlistApi} from "./client"
import {endpoints} from "./endpoints"
import {schemaParseError} from "./error"
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
            statusCode: 0,
            data: undefined,
            errorMessage: errorMessage(ErrorCode.CreateTaskInvalidRequest),
        })
    }

    const responseResult = await lemlistApi.post(endpoints.api.tasks, body.data)

    if (isErrored(responseResult)) {
        return responseResult
    }

    const parsed = LemlistCreateTaskResponseSchema.safeParse(responseResult.value.data)

    if (!parsed.success) {
        logger.error(`Failed to parse create task response: ${parsed.error.message}`)
        return errored(schemaParseError(parsed.error.message))
    }

    return complete(parsed.data)
}
