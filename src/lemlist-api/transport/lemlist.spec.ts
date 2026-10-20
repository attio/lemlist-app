import {beforeEach, describe, expect, it, vi} from "vitest"
import {getWorkspaceConnection, type WorkspaceConnection} from "attio/server"

const mocks = vi.hoisted(() => ({
    fetch: vi.fn(),
    logger: {log: vi.fn(), error: vi.fn()},
}))

vi.mock("../../common/logger", () => ({
    createLogger: () => mocks.logger,
}))

import {lemlistApi} from "./lemlist"

const workspaceConnection: WorkspaceConnection = {
    id: "connection-id",
    value: "api-token",
    connection_key: "lemlist",
    createdBy: {type: "user", id: "user-id"},
    ownedBy: {type: "workspace", id: "workspace-id"},
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal("fetch", mocks.fetch)
    vi.mocked(getWorkspaceConnection).mockReturnValue(workspaceConnection)
})

describe("lemlist API request logging", () => {
    it("redacts an email path segment from success and error logs without changing the request", async () => {
        mocks.fetch.mockResolvedValue(new Response(null, {status: 404}))

        await lemlistApi.get("/contacts/person@example.com")

        expect(mocks.fetch).toHaveBeenCalledWith(
            "https://api.lemlist.com/api/contacts/person@example.com",
            expect.any(Object)
        )
        expect(mocks.logger.log).toHaveBeenCalledWith(
            "GET https://api.lemlist.com/api/contacts/[REDACTED] (404)"
        )
        expect(mocks.logger.error).toHaveBeenCalledWith(
            "GET https://api.lemlist.com/api/contacts/[REDACTED] failed (404)"
        )

        const loggedValues = [...mocks.logger.log.mock.calls, ...mocks.logger.error.mock.calls]
            .flat()
            .join(" ")

        expect(loggedValues).not.toContain("person@example.com")
    })

    it("redacts personal query values from a successful request log without changing the request", async () => {
        mocks.fetch.mockResolvedValue(new Response(null, {status: 200}))

        await lemlistApi.post("/enrich", undefined, {
            email: "person@example.com",
            verifyEmail: true,
        })

        expect(mocks.fetch).toHaveBeenCalledWith(
            "https://api.lemlist.com/api/enrich?email=person%40example.com&verifyEmail=true",
            expect.any(Object)
        )
        expect(mocks.logger.log).toHaveBeenCalledWith(
            "POST https://api.lemlist.com/api/enrich?email=[REDACTED]&verifyEmail=true (200)"
        )
        expect(mocks.logger.log).not.toHaveBeenCalledWith(expect.stringContaining("person"))
    })
})

describe("lemlist API rate limiting", () => {
    it("waits the fallback window when Retry-After is not a number of seconds", async () => {
        vi.useFakeTimers({now: new Date("2026-10-21T07:00:00Z")})
        mocks.fetch
            .mockResolvedValueOnce(
                new Response(null, {
                    status: 429,
                    headers: {"Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT"},
                })
            )
            .mockResolvedValueOnce(Response.json({}))

        const resultPromise = lemlistApi.get("/team")

        await vi.advanceTimersByTimeAsync(1999)
        expect(mocks.fetch).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(1)
        await resultPromise
        expect(mocks.fetch).toHaveBeenCalledTimes(2)
        vi.useRealTimers()
    })
})
