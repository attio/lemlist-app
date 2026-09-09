import type {AsyncResult} from "@attio/fetchable"
import {listCampaigns} from "../../lemlist-api/campaigns"
import type {LemlistApiError} from "../../lemlist-api/transport/lemlist"
import type {LemlistCampaign} from "../../lemlist-api/schemas"

export default async function listCampaignsForDialog(): AsyncResult<
    LemlistCampaign[],
    LemlistApiError
> {
    return await listCampaigns()
}
