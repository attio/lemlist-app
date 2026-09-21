import {beforeEach, describe, expect, it, vi} from "vitest"
import type {UserConnection, WorkspaceConnection} from "attio/server"

const mocks = vi.hoisted(() => ({
    ensureEnrichmentWebhooks: vi.fn(),
    logger: {log: vi.fn(), error: vi.fn()},
}))

vi.mock("../../services/enrichment/register-webhooks", () => ({
    ensureEnrichmentWebhooks: mocks.ensureEnrichmentWebhooks,
}))

vi.mock("../../common/logger", () => ({
    createLogger: () => mocks.logger,
}))

import {complete, errored} from "@attio/fetchable"
import connectionAdded from "./connection-added.event"

const workspaceConnection: WorkspaceConnection = {
    id: "connection-id",
    value: "api-token",
    connection_key: "lemlist",
    createdBy: {type: "user", id: "user-id"},
    ownedBy: {type: "workspace", id: "workspace-id"},
}

const userConnection: UserConnection = {
    ...workspaceConnection,
    ownedBy: {type: "user", id: "user-id"},
}

beforeEach(() => {
    vi.resetAllMocks()
    mocks.ensureEnrichmentWebhooks.mockResolvedValue(complete(undefined))
})

describe(connectionAdded, () => {
    it("registers the enrichment webhooks for a workspace connection", async () => {
        await expect(connectionAdded({connection: workspaceConnection})).resolves.toBeUndefined()

        expect(mocks.ensureEnrichmentWebhooks).toHaveBeenCalledWith(workspaceConnection)
    })

    it("skips a user connection, which has no enrichment blocks", async () => {
        await connectionAdded({connection: userConnection})

        expect(mocks.ensureEnrichmentWebhooks).not.toHaveBeenCalled()
    })

    it("saves the connection when registration fails, so the other blocks still work", async () => {
        mocks.ensureEnrichmentWebhooks.mockResolvedValue(
            errored({code: "PLAN_LIMITED", detail: null})
        )

        await expect(connectionAdded({connection: workspaceConnection})).resolves.toBeUndefined()

        expect(mocks.logger.error).toHaveBeenCalledWith(expect.any(String), {
            code: "PLAN_LIMITED",
            detail: null,
        })
    })

    it("saves the connection when registration throws", async () => {
        mocks.ensureEnrichmentWebhooks.mockRejectedValue(new Error("Egress Rate limit exceeded"))

        await expect(connectionAdded({connection: workspaceConnection})).resolves.toBeUndefined()

        expect(mocks.logger.error).toHaveBeenCalled()
    })
})
