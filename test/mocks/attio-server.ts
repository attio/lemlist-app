import {vi} from "vitest"

export const getWorkspaceSettings = vi.fn()

export const Workflows = {
    OutcomeValue: {
        emailAddress: (value: string) => ({type: "email-address", value}),
    },
}
