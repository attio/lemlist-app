import type {Mock} from "vitest"

export type LemlistApiMocks = {
    mockLemlistGet: Mock
    mockLemlistPost: Mock
    mockUpsertContact: Mock
    mockLogger: {
        log: Mock
        error: Mock
    }
}
