import {type AsyncResult, complete, errored, isErrored} from "@attio/fetchable"
import type {EnrichContactInput, EnrichContactOptions} from "../../lemlist-api/enrich"
import {enrichContact} from "../../lemlist-api/enrich"
import {type LemlistApiError} from "../../lemlist-api/transport/error"
import {storeEnrichmentCallback} from "./callback-store"
import {ensureEnrichmentWebhooks} from "./register-webhooks"
import {ATTIO_EGRESS_RATE_LIMIT, isAttioEgressException} from "../../common/attio-egress"
import type {Logger} from "../../common/logger"

/** Leaves room under the 30s server timeout for the pause plus returning a result. */
const RETRY_PAUSE_BUDGET_MS = 25_000

/**
 * Attio allows 3 attempts per block and retries immediately. A bulk that hit the 30 req/s
 * egress limit would retry in lockstep and get rejected again. The pause has to happen
 * here, and it has to be random: a fixed delay would just move the pileup to a new
 * moment, not spread it out. 15s covers a bulk of roughly 500, with the third attempt as
 * slack.
 *
 * Only when Attio throws "Egress Rate limit exceeded". A lemlist 429 is already retried
 * in the client against Retry-After. Other NETWORK_ERROR throws skip the pause.
 */
const MAX_RETRY_PAUSE_MS = 15_000

async function pauseBeforeRetry({
    startedAt,
    logger,
}: {
    startedAt: number
    logger: Logger
}): Promise<void> {
    const remaining = Math.max(0, RETRY_PAUSE_BUDGET_MS - (Date.now() - startedAt))
    const pause = Math.round(Math.random() * Math.min(MAX_RETRY_PAUSE_MS, remaining))

    logger.log(`Waiting ${pause}ms before handing back for retry`)

    await new Promise((resolve) => setTimeout(resolve, pause))
}

function isAttioEgressError(error: LemlistApiError): boolean {
    return (
        error.code === "NETWORK_ERROR" && Boolean(error.detail?.includes(ATTIO_EGRESS_RATE_LIMIT))
    )
}

export async function executeEnrichment({
    enrichInput,
    enrichOptions,
    finishCallbackUrl,
    logger,
}: {
    enrichInput: EnrichContactInput
    enrichOptions: EnrichContactOptions
    finishCallbackUrl: string
    logger: Logger
}): AsyncResult<string, LemlistApiError> {
    const startedAt = Date.now()

    try {
        const webhooksResult = await ensureEnrichmentWebhooks()

        if (isErrored(webhooksResult)) {
            if (isAttioEgressError(webhooksResult.error))
                await pauseBeforeRetry({startedAt, logger})
            return webhooksResult
        }

        const enrichment = await enrichContact(enrichInput, enrichOptions)

        if (isErrored(enrichment)) {
            if (isAttioEgressError(enrichment.error)) await pauseBeforeRetry({startedAt, logger})
            return enrichment
        }

        const enrichmentId = enrichment.value

        await storeEnrichmentCallback({enrichmentId, finishCallbackUrl})

        logger.log(`Started enrichment ${enrichmentId}`)

        return complete(enrichmentId)
    } catch (error) {
        // ensureEnrichmentWebhooks and storeEnrichmentCallback also make plain Attio SDK
        // calls (kv, webhook handlers) outside the lemlist client, so an egress-limit
        // throw from either surfaces as a raw exception rather than a LemlistApiError.
        if (!isAttioEgressException(error)) {
            throw error
        }

        logger.error("Attio's egress rate limit was hit starting the enrichment")

        await pauseBeforeRetry({startedAt, logger})

        return errored({code: "RETRY", detail: ATTIO_EGRESS_RATE_LIMIT})
    }
}
