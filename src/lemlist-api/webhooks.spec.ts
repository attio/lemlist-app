import {beforeEach, describe, expect, it, vi} from "vitest"
import type {LemlistApiMocks} from "../../test/utils/create-lemlist-api-mocks"

const lemlistApiMocks = vi.hoisted((): LemlistApiMocks => ({
    mockLemlistGet: vi.fn(),
    mockLemlistPost: vi.fn(),
    mockUpsertContact: vi.fn(),
    mockLogger: {
        log: vi.fn(),
        error: vi.fn(),
    },
}))

vi.mock("./transport/lemlist", () => ({
    lemlistApi: {
        get: lemlistApiMocks.mockLemlistGet,
        post: lemlistApiMocks.mockLemlistPost,
    },
}))
vi.mock("../common/logger", () => ({
    createLogger: () => lemlistApiMocks.mockLogger,
}))

import {isErrored} from "@attio/fetchable"
import {apiSuccess} from "../../test/mocks/lemlist-api-client"
import {resetLemlistApiMocks} from "../../test/utils/reset-lemlist-api-mocks"
import {listWebhooks} from "./webhooks"

const {mockLemlistGet} = lemlistApiMocks

beforeEach(() => {
    resetLemlistApiMocks(lemlistApiMocks)
})

describe("listWebhooks", () => {
    it("still parses webhooks whose type lemlist added after this app knew about it", async () => {
        mockLemlistGet.mockResolvedValue(
            apiSuccess([
                {
                    _id: "1",
                    targetUrl: "https://example.com/enrichment",
                    createdAt: "2026-08-10T00:00:00.000Z",
                    type: "enrichmentDone",
                },
                {
                    _id: "2",
                    targetUrl: "https://customer.example.com/hook",
                    createdAt: "2026-08-10T00:00:00.000Z",
                    type: "someBrandNewEventType",
                },
            ])
        )

        const result = await listWebhooks()

        expect(isErrored(result)).toBe(false)
        if (isErrored(result)) return
        expect(result.value.map((webhook) => webhook._id)).toEqual(["1", "2"])
        expect(result.value[1]?.type).toBe("someBrandNewEventType")
    })
})
