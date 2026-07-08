import {complete} from "@attio/fetchable"
import {vi} from "vitest"
import {apiSuccess} from "../mocks/lemlist-api-client"
import type {LemlistApiMocks} from "./create-lemlist-api-mocks"
import {defaultContactId, sampleLeadResponse} from "./fixtures"

export function resetLemlistApiMocks(mocks: LemlistApiMocks) {
    vi.resetAllMocks()
    mocks.mockUpsertContact.mockResolvedValue(complete(defaultContactId))
    mocks.mockLemlistPost.mockResolvedValue(apiSuccess(sampleLeadResponse))
}
