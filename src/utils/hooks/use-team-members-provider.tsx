import type {PlainComboboxOptionsProvider} from "attio/client"
import {useAsyncCache} from "attio/client"
import {useMemo} from "react"
import listTeamMembers from "../list-team-members.server"

/**
 * Returns a memoized options provider for team member combobox inputs.
 */
export function useTeamMembersProvider(): PlainComboboxOptionsProvider {
    const {
        values: {teamMembers},
    } = useAsyncCache({teamMembers: listTeamMembers})

    return useMemo(
        () => ({
            async getOption(value) {
                const member = teamMembers.find((m) => m.value === value)
                return member ? {label: member.label, description: member.description} : undefined
            },

            async search(query) {
                if (!query) return teamMembers
                const q = query.toLowerCase()
                return teamMembers.filter(
                    (m) => m.label.toLowerCase().includes(q) || m.value.toLowerCase().includes(q)
                )
            },
        }),
        [teamMembers]
    )
}
