import {isErrored} from "@attio/fetchable"
import type {Connection} from "attio/server"
import {ensureEnrichmentWebhooks} from "../../services/enrichment/register-webhooks"
import {createLogger} from "../../common/logger"

const logger = createLogger("connection-added")

const FAILED_PREFIX = "Failed to register lemlist enrichment webhooks"

export default async function connectionAdded({connection}: {connection: Connection}) {
    // A user connection (e.g. MCP) has no enrichment blocks to register webhooks for.
    if (connection.ownedBy.type !== "workspace") {
        return
    }

    logger.log("Connection added, registering enrichment webhooks")

    // A throw here leaves the connection unsaved, so the install fails. Most blocks work
    // without these webhooks, so log the failure and carry on.
    try {
        // This connection is not saved yet, so it has to be passed explicitly.
        const result = await ensureEnrichmentWebhooks(connection)

        if (isErrored(result)) {
            logger.error(FAILED_PREFIX, result.error)
        }
    } catch (error) {
        // ensureEnrichmentWebhooks also calls the Attio SDK (kv, webhook handlers). Those
        // calls throw instead of returning a result.
        logger.error(FAILED_PREFIX, error)
    }
}
