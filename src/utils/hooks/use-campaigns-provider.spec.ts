import {describe, expect, it, vi} from "vitest"

vi.mock("../list-campaigns.server", () => ({default: vi.fn()}))

import {createCampaignsProvider} from "./use-campaigns-provider"

const campaigns = [
    {value: "campaign-1", label: "Campaign One", description: "active"},
    {value: "campaign-2", label: "Campaign Two", description: "paused"},
    {value: "campaign-3", label: "Third Campaign", description: "draft"},
]

describe("createCampaignsProvider", () => {
    describe("getOption", () => {
        it("returns label and description for known campaign", async () => {
            const provider = createCampaignsProvider(campaigns)
            expect(await provider.getOption("campaign-1")).toEqual({
                label: "Campaign One",
                description: "active",
            })
        })

        it("returns undefined for unknown campaign", async () => {
            const provider = createCampaignsProvider(campaigns)
            expect(await provider.getOption("unknown-id")).toBeUndefined()
        })
    })

    describe("search", () => {
        it("returns all campaigns for empty query", async () => {
            const provider = createCampaignsProvider(campaigns)
            expect(await provider.search("")).toEqual(campaigns)
        })

        it("filters by label", async () => {
            const provider = createCampaignsProvider(campaigns)
            expect(await provider.search("one")).toEqual([campaigns[0]])
        })

        it("filters by value", async () => {
            const provider = createCampaignsProvider(campaigns)
            expect(await provider.search("campaign-2")).toEqual([campaigns[1]])
        })

        it("is case-insensitive", async () => {
            const provider = createCampaignsProvider(campaigns)
            expect(await provider.search("THIRD")).toEqual([campaigns[2]])
        })

        it("returns multiple matches", async () => {
            const provider = createCampaignsProvider(campaigns)
            expect(await provider.search("campaign")).toEqual([
                campaigns[0],
                campaigns[1],
                campaigns[2],
            ])
        })

        it("returns empty array when no matches", async () => {
            const provider = createCampaignsProvider(campaigns)
            expect(await provider.search("nonexistent")).toEqual([])
        })
    })
})
