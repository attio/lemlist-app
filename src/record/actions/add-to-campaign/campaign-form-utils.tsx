import {Forms} from "attio/client"

export function buildFormConfig() {
    return {
        schema: {
            campaignId: Forms.string(),
        },
        initialValues: {
            campaignId: "",
        },
    }
}
