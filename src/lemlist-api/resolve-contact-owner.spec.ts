import {complete, errored} from "@attio/fetchable"
import {beforeEach, describe, expect, it, vi} from "vitest"
import {resolveContactOwner} from "./resolve-contact-owner"
import type {LemlistUser} from "./schemas"

const mockGetTeamMembers = vi.hoisted(() => vi.fn())

vi.mock("./team", () => ({
    getTeamMembers: mockGetTeamMembers,
}))

const team: LemlistUser[] = [
    {_id: "usr_alice", email: "alice@example.com", firstName: "Alice"},
    {_id: "usr_bob", email: "bob@example.com"},
]

describe(resolveContactOwner, () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetTeamMembers.mockResolvedValue(complete(team))
    })

    it("returns null when no owner is provided", async () => {
        const expected = complete({userId: null, warning: null})
        await expect(resolveContactOwner({owner: null})).resolves.toEqual(expected)
        await expect(resolveContactOwner({owner: undefined})).resolves.toEqual(expected)
        await expect(resolveContactOwner({owner: "  "})).resolves.toEqual(expected)
        expect(mockGetTeamMembers).not.toHaveBeenCalled()
    })

    it("resolves a Lemlist user ID without depending on email", async () => {
        const result = await resolveContactOwner({owner: "usr_bob"})

        expect(result).toEqual(complete({userId: "usr_bob", warning: null}))
    })

    it("resolves a login email case-insensitively to a user ID", async () => {
        const result = await resolveContactOwner({owner: "Alice@Example.com"})

        expect(result).toEqual(complete({userId: "usr_alice", warning: null}))
    })

    it("reuses a pre-fetched team list and skips the API", async () => {
        const result = await resolveContactOwner({owner: "usr_alice", teamMembers: team})

        expect(result).toEqual(complete({userId: "usr_alice", warning: null}))
        expect(mockGetTeamMembers).not.toHaveBeenCalled()
    })

    it("falls back to null with a warning when no team member matches", async () => {
        const result = await resolveContactOwner({owner: "missing@example.com"})

        expect(result).toEqual(
            complete({
                userId: null,
                warning: expect.stringContaining('No lemlist user matches "missing@example.com"'),
            })
        )
    })

    it("surfaces team-fetch failures", async () => {
        const apiError = {statusCode: 401, errorMessage: "Unauthorized"}
        mockGetTeamMembers.mockResolvedValue(errored(apiError))

        const result = await resolveContactOwner({owner: "alice@example.com"})

        expect(result).toEqual(errored(apiError))
    })
})
