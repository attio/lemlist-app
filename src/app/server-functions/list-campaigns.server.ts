import {isErrored} from "@attio/fetchable"
import {listCampaigns} from "../../lemlist-api/campaigns"
import {createLogger} from "../../common/logger"

const logger = createLogger("list-campaigns")

export default async function listCampaignsForBlock(): Promise<
    Array<{value: string; label: string; description?: string}>
> {
    const result = await listCampaigns()

    if (isErrored(result)) {
        logger.error("Failed to list campaigns", {error: result.error})
        return []
    }

    return result.value.map((campaign) => ({
        value: campaign._id,
        label: campaign.name,
        description: campaign.status,
    }))
}
