import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {createLogger} from "../utils/logger"
import {type LemlistApiError, lemlistApi} from "./client"
import {endpoints} from "./endpoints"
import {schemaParseError} from "./error"
import {
    type CreateLemlistWebhookParams,
    type CreateLemlistWebhookRequest,
    CreateLemlistWebhookRequestSchema,
    type LemlistWebhook,
    LemlistWebhookSchema,
} from "./schemas"

const logger = createLogger("lemlist webhooks")

/**
 * Creates a lemlist webhook that receives real-time POST callbacks for selected events.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/webhooks/add-webhook
 */
export async function createWebhook(
    request: CreateLemlistWebhookRequest,
    params?: CreateLemlistWebhookParams
): AsyncResult<LemlistWebhook, LemlistApiError> {
    const validatedRequest = CreateLemlistWebhookRequestSchema.safeParse(request)

    if (!validatedRequest.success) {
        return errored(schemaParseError(validatedRequest.error.message))
    }

    const responseResult = await lemlistApi.post(
        endpoints.api.webhooks,
        validatedRequest.data,
        params
    )

    if (isErrored(responseResult)) {
        logger.error(`Failed to create webhook: ${responseResult.error.errorMessage}`)
        return responseResult
    }

    const parsed = LemlistWebhookSchema.safeParse(responseResult.value.data)

    if (!parsed.success) {
        return errored(schemaParseError(parsed.error.message))
    }

    return complete(parsed.data)
}

/**
 * Deletes a specific lemlist webhook.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/webhooks/delete-webhook
 */
export async function deleteWebhook(hookId: string): AsyncResult<void, LemlistApiError> {
    const responseResult = await lemlistApi.delete(endpoints.api.webhook(hookId))

    if (isErrored(responseResult)) {
        logger.error(`Failed to delete webhook ${hookId}: ${responseResult.error.errorMessage}`)
        return responseResult
    }

    return complete(undefined)
}
