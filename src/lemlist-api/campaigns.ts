import {type AsyncResult, bind, complete, isErrored} from "@attio/fetchable"
import {getWorkspaceSettings} from "attio/server"
import {createLogger} from "../common/logger"
import {buildContactBody, buildLeadBody, type LemlistPerson} from "./person-for-campaign"
import {type LemlistApiError, lemlistApi} from "./transport/lemlist"
import {upsertContact} from "./contacts"
import {endpoints} from "./endpoints"
import {parseResponse} from "./transport/error"
import {type AddLeadQueryParams, getEffectiveEnrichmentParams, toEnabledQueryParams} from "./format"
import {
    type LemlistCampaign,
    LemlistCampaignListSchema,
    type LemlistCreateLeadResponse,
    LemlistCreateLeadResponseSchema,
} from "./schemas"

export type {AddLeadQueryParams} from "./format"

const logger = createLogger("lemlist-campaigns")

type CreateLeadOptions = {
    campaignId: string
    person: LemlistPerson
    /** Resolved Lemlist user ID (or null to leave ownership to the API-key owner). */
    contactOwner: string | null
    addLeadQueryParams: AddLeadQueryParams
}

/**
 * Maximum wall-clock time {@link listCampaigns} will spend paginating before returning whatever it
 * has gathered so far.
 *
 * App SDK server executions have a hard 30s timeout. We are deliberately conservative: 10s leaves
 * ~20s of headroom for other API calls and ensures a snappier user experience.
 */
const PAGINATION_TIME_LIMIT_MS = 10_000

const CAMPAIGNS_PAGE_LIMIT = 100 // 100 is the max lemlist allows

/**
 * Fetch as many pages of campaigns as possible within the time limit.
 * @see https://developer.lemlist.com/api-reference/endpoints/campaigns/get-many-campaigns
 */
export async function listCampaigns(): AsyncResult<LemlistCampaign[], LemlistApiError> {
    const campaigns: LemlistCampaign[] = []
    let offset = 0
    let requestCount = 0
    const startedAt = Date.now()

    while (true) {
        const responseResult = await lemlistApi.get(endpoints.api.campaigns, {
            version: "v2",
            limit: CAMPAIGNS_PAGE_LIMIT,
            offset,
        })

        const pageResult = bind(responseResult, (response) =>
            parseResponse(LemlistCampaignListSchema, response.data)
        )

        if (isErrored(pageResult)) {
            return pageResult
        }

        const page = pageResult.value
        campaigns.push(...page)
        requestCount++

        const isLastPage = page.length < CAMPAIGNS_PAGE_LIMIT
        if (isLastPage) {
            break
        }

        offset += CAMPAIGNS_PAGE_LIMIT

        const elapsedMs = Date.now() - startedAt
        if (elapsedMs > PAGINATION_TIME_LIMIT_MS) {
            console.warn(
                `[lemlist] campaigns pagination time budget of ${PAGINATION_TIME_LIMIT_MS}ms exceeded after ` +
                    `${requestCount} request(s) (${elapsedMs}ms elapsed, ${campaigns.length} results); ` +
                    `returning partial results`
            )
            break
        }
    }

    return complete(campaigns)
}

const DEFAULT_ADD_LEAD_QUERY_PARAMS: AddLeadQueryParams = {
    linkedinEnrichment: false,
    verifyEmail: false,
    findEmail: false,
    findPhone: false,
    deduplicate: false,
}

export async function getAddLeadQueryParams(): Promise<AddLeadQueryParams> {
    try {
        const settings = await getWorkspaceSettings()

        return {
            linkedinEnrichment: settings.linkedinEnrichment ?? false,
            verifyEmail: settings.verifyEmail ?? false,
            findEmail: settings.findEmail ?? false,
            findPhone: settings.findPhone ?? false,
            deduplicate: settings.deduplicate ?? false,
        }
    } catch (error) {
        logger.error(
            `Failed to load workspace settings, using defaults: ${error instanceof Error ? error.message : "unknown_error"}`
        )
        return DEFAULT_ADD_LEAD_QUERY_PARAMS
    }
}

export function mergeAddLeadQueryParams(
    defaults: AddLeadQueryParams,
    overrides: Partial<AddLeadQueryParams>
): AddLeadQueryParams {
    return {
        linkedinEnrichment: overrides.linkedinEnrichment ?? defaults.linkedinEnrichment,
        verifyEmail: overrides.verifyEmail ?? defaults.verifyEmail,
        findEmail: overrides.findEmail ?? defaults.findEmail,
        findPhone: overrides.findPhone ?? defaults.findPhone,
        deduplicate: overrides.deduplicate ?? defaults.deduplicate,
    }
}

/**
 * Fields only POST /contacts accepts. Create lead creates or matches the contact itself, so the
 * extra upsert call is only worth it when the person has one of these.
 */
function needsContactUpsert(person: LemlistPerson): boolean {
    return Boolean(person.summary || person.location || person.additionalEmails.length)
}

/**
 * One request in the common case: create lead creates or matches the contact and runs the
 * enrichments from its query params.
 *
 * @see https://developer.lemlist.com/api-reference/endpoints/leads/create-lead-in-campaign
 */
export async function createLeadInCampaign({
    campaignId,
    person,
    contactOwner,
    addLeadQueryParams,
}: CreateLeadOptions): AsyncResult<LemlistCreateLeadResponse, LemlistApiError> {
    if (needsContactUpsert(person)) {
        const contactResult = await upsertContact(buildContactBody({person, contactOwner}))

        if (isErrored(contactResult)) {
            logger.error("Create lead failed at upsert contact", {
                campaignId,
                error: contactResult.error,
            })
            return contactResult
        }
    }

    const body = buildLeadBody({person, contactOwner})

    const postResult = await lemlistApi.post(
        endpoints.api.campaignLeads(campaignId),
        body,
        toEnabledQueryParams({
            ...getEffectiveEnrichmentParams(addLeadQueryParams, body),
            deduplicate: addLeadQueryParams.deduplicate,
        })
    )

    const result = bind(postResult, (response) =>
        parseResponse(LemlistCreateLeadResponseSchema, response.data)
    )

    if (isErrored(result)) {
        logger.error("Create lead failed", {campaignId, error: result.error})
    }

    return result
}
