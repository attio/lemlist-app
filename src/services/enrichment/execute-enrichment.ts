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

const CALLBACK_STORE_ATTEMPTS = 6
const CALLBACK_STORE_SPACING_MS = 400

/**
 * Retried here rather than by the block: lemlist has already been paid by this point, and
 * a block retry re-runs enrichContact, charging for a second enrichment. Every failure is
 * caught for that reason, not just the egress limit.
 */
async function storeCallbackWithRetries(
    enrichmentId: string,
    finishCallbackUrl: string,
    logger: Logger
): AsyncResult<void, LemlistApiError> {
    for (let attempt = 1; attempt <= CALLBACK_STORE_ATTEMPTS; attempt++) {
        if (attempt > 1) {
            await new Promise((resolve) => setTimeout(resolve, CALLBACK_STORE_SPACING_MS))
        }

        try {
            await storeEnrichmentCallback({enrichmentId, finishCallbackUrl})

            return complete(undefined)
        } catch (error) {
            logger.error(
                `Could not record where enrichment ${enrichmentId} reports back to (attempt ${attempt})`,
                error
            )
        }
    }

    return errored({
        code: "UNEXPECTED_ERROR",
        detail: "the enrichment started but its result could not be routed back",
    })
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

        const stored = await storeCallbackWithRetries(enrichmentId, finishCallbackUrl, logger)

        if (isErrored(stored)) {
            return stored
        }

        logger.log(`Started enrichment ${enrichmentId}`)

        return complete(enrichmentId)
    } catch (error) {
        // ensureEnrichmentWebhooks also makes plain Attio SDK calls (kv, webhook handlers)
        // outside the lemlist client, so an egress-limit throw there surfaces as a raw
        // exception rather than a LemlistApiError. Safe to retry: nothing is charged yet.
        if (!isAttioEgressException(error)) {
            throw error
        }

        logger.error("Attio's egress rate limit was hit starting the enrichment")

        await pauseBeforeRetry({startedAt, logger})

        return errored({code: "RETRY", detail: ATTIO_EGRESS_RATE_LIMIT})
    }
}
