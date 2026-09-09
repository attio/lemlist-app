import {kv} from "attio/server"

// Expires after a day so a callback that lemlist never reports back on doesn't stick around forever.
const ENRICHMENT_CALLBACK_TTL_SECONDS = 60 * 60 * 24

function enrichmentCallbackKey(enrichmentId: string): string {
    return `enrichment-callback:${enrichmentId}`
}

export async function storeEnrichmentCallback({
    enrichmentId,
    finishCallbackUrl,
}: {
    enrichmentId: string
    finishCallbackUrl: string
}): Promise<void> {
    await kv.set(enrichmentCallbackKey(enrichmentId), finishCallbackUrl, {
        ttlInSeconds: ENRICHMENT_CALLBACK_TTL_SECONDS,
    })
}

export async function getStoredEnrichmentCallback(enrichmentId: string): Promise<string | null> {
    const stored = await kv.get(enrichmentCallbackKey(enrichmentId))
    const value = stored?.value

    return typeof value === "string" && value.trim() ? value.trim() : null
}

export async function clearStoredEnrichmentCallback(enrichmentId: string): Promise<void> {
    await kv.delete(enrichmentCallbackKey(enrichmentId))
}
