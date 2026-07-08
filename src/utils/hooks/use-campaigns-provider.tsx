import type {PlainComboboxOptionsProvider} from "attio/client"
import {useAsyncCache} from "attio/client"
import {useMemo} from "react"
import listCampaignsForBlock from "../list-campaigns.server"

type Campaign = {value: string; label: string; description?: string}

export function createCampaignsProvider(campaigns: Campaign[]): PlainComboboxOptionsProvider {
    return {
        async getOption(value) {
            const campaign = campaigns.find((c) => c.value === value)
            return campaign ? {label: campaign.label, description: campaign.description} : undefined
        },

        async search(query) {
            if (!query) return campaigns
            const q = query.toLowerCase()
            return campaigns.filter(
                (c) => c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q)
            )
        },
    }
}

/**
 * Returns a memoized options provider for campaign combobox inputs.
 */
export function useCampaignsProvider(): PlainComboboxOptionsProvider {
    const {
        values: {campaigns},
    } = useAsyncCache({campaigns: listCampaignsForBlock})

    return useMemo(() => createCampaignsProvider(campaigns), [campaigns])
}
