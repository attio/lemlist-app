import {isErrored} from "@attio/fetchable"
import type {Connection} from "attio/server"
import {deleteWebhookHandler, listWebhookHandlers} from "attio/server"
import {deleteWebhook} from "../../lemlist-api/webhooks"
import {ENRICHMENT_WEBHOOK_HANDLER_FILE_NAME} from "../../services/enrichment/register-webhooks"
import {createLogger} from "../../common/logger"

const logger = createLogger("connection-removed")

export default async function connectionRemoved({connection}: {connection: Connection}) {
    // A user connection (e.g. MCP) has no enrichment webhooks to tear down.
    if (connection.ownedBy.type !== "workspace") {
        return
    }

    try {
        const handlers = (await listWebhookHandlers()).filter(
            (handler) => handler.fileName === ENRICHMENT_WEBHOOK_HANDLER_FILE_NAME
        )

        logger.log(`Connection removed, tearing down ${handlers.length} enrichment webhook(s)`)

        const deletes = await Promise.all(
            handlers
                .filter(
                    (handler): handler is typeof handler & {externalWebhookId: string} =>
                        handler.externalWebhookId !== null
                )
                .map((handler) => deleteWebhook(handler.externalWebhookId, connection))
        )

        for (const result of deletes) {
            if (isErrored(result)) {
                logger.error("Failed to delete a lemlist enrichment webhook")
            }
        }

        await Promise.all(handlers.map((handler) => deleteWebhookHandler(handler.id)))

        logger.log("Enrichment webhook teardown complete")
    } catch (error) {
        // Never block the disconnect on cleanup. A leftover webhook can be dealt with
        // later; a connection the user cannot remove cannot.
        logger.error("Failed to fully tear down enrichment webhooks", error)
    }
}
