import {vi} from "vitest"

export const getWorkspaceSettings = vi.fn()
export const getWorkspaceConnection = vi.fn()
export const kv = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
}
export const createWebhookHandler = vi.fn()
export const deleteWebhookHandler = vi.fn()
export const updateWebhookHandler = vi.fn()
export const listWebhookHandlers = vi.fn()

export const Workflows = {
    OutcomeValue: {
        emailAddress: (value: string) => ({type: "email-address", value}),
    },
}
