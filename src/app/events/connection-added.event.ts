import {isErrored} from "@attio/fetchable"
import type {Connection} from "attio/server"
import {ensureEnrichmentWebhooks} from "../../services/enrichment/register-webhooks"
import {isAttioEgressException} from "../../common/attio-egress"
import {createLogger} from "../../common/logger"
import {lemlistErrorMessage} from "../../lemlist-api/transport/error"

const logger = createLogger("connection-added")

const FAILED_PREFIX = "Failed to register lemlist enrichment webhooks"

export default async function connectionAdded({connection}: {connection: Connection}) {
    // A user connection (e.g. MCP) has no enrichment blocks to register webhooks for.
    if (connection.ownedBy.type !== "workspace") {
        return
    }

    logger.log("Connection added, registering enrichment webhooks")

    try {
        // This connection is not saved yet, so it has to be passed explicitly.
        const result = await ensureEnrichmentWebhooks(connection)

        if (isErrored(result)) {
            // Throwing leaves the connection unsaved and asks the user to try again. That
            // beats connecting into a state where enrichment cannot work.
            throw new Error(`${FAILED_PREFIX}: ${lemlistErrorMessage(result.error)}`)
        }
    } catch (error) {
        if (!isAttioEgressException(error)) {
            throw error
        }
        logger.error("Attio's egress rate limit was hit registering enrichment webhooks", error)
        throw new Error(`${FAILED_PREFIX}: Attio's rate limit was hit. Try again shortly.`)
    }
}
