import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import {createLogger} from "../common/logger"
import type {Connection} from "attio/server"
import {lemlistApi, type LemlistApiError, lemlistApiWithConnection} from "./transport/lemlist"
import {endpoints} from "./endpoints"
import {schemaParseError} from "./transport/error"
import {
    type CreateLemlistWebhookRequest,
    CreateLemlistWebhookRequestSchema,
    type LemlistWebhook,
    LemlistWebhookListSchema,
    LemlistWebhookSchema,
} from "./schemas"

const logger = createLogger("lemlist webhooks")

function clientFor(connection?: Connection) {
    return connection ? lemlistApiWithConnection(connection) : lemlistApi
}

/**
 * Creates a lemlist webhook that receives real-time POST callbacks for selected events.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/webhooks/add-webhook
 */
export async function createWebhook(
    request: CreateLemlistWebhookRequest,
    connection?: Connection
): AsyncResult<LemlistWebhook, LemlistApiError> {
    const validatedRequest = CreateLemlistWebhookRequestSchema.safeParse(request)

    if (!validatedRequest.success) {
        return errored(schemaParseError(validatedRequest.error))
    }

    const responseResult = await clientFor(connection).post(
        endpoints.api.webhooks,
        validatedRequest.data
    )

    if (isErrored(responseResult)) {
        // The target URL is left out of the log because it contains a signed token.
        logger.error("Failed to create webhook", {
            type: request.type ?? "untyped",
            error: responseResult.error,
        })
        return responseResult
    }

    const parsed = LemlistWebhookSchema.safeParse(responseResult.value.data)

    if (!parsed.success) {
        return errored(schemaParseError(parsed.error))
    }

    return complete(parsed.data)
}

/**
 * Deletes a specific lemlist webhook.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/webhooks/delete-webhook
 */
export async function deleteWebhook(
    webhookId: string,
    connection?: Connection
): AsyncResult<void, LemlistApiError> {
    const responseResult = await clientFor(connection).delete(endpoints.api.webhook(webhookId))

    if (isErrored(responseResult)) {
        logger.error("Failed to delete webhook", {webhookId, error: responseResult.error})
        return responseResult
    }

    return complete(undefined)
}

/**
 * Lists every webhook registered on the account, including ones lemlist has disabled.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/webhooks/get-many-webhooks
 */
export async function listWebhooks(
    connection?: Connection
): AsyncResult<LemlistWebhook[], LemlistApiError> {
    const responseResult = await clientFor(connection).get(endpoints.api.webhooks)

    if (isErrored(responseResult)) {
        logger.error(`Failed to list webhooks: ${responseResult.error.code}`)
        return responseResult
    }

    const parsed = LemlistWebhookListSchema.safeParse(responseResult.value.data)

    if (!parsed.success) {
        return errored(schemaParseError(parsed.error))
    }

    return complete(parsed.data)
}
