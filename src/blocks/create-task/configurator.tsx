import type {PlainComboboxOption, PlainComboboxOptionsProvider} from "attio/client"
import {useAsyncCache, Workflows} from "attio/client"
import block from "./block"
import {PRIORITY_OPTIONS, TASK_TYPE_OPTIONS} from "./const"
import listRecordsForBlock from "./list-records.server"
import listTeamMembersForBlock from "./list-team-members.server"

type CategorizedPlainComboboxOption = PlainComboboxOption & {categoryLabel: string}

const taskTypeOptionsProvider: PlainComboboxOptionsProvider = {
    getOption: async (value) => {
        const option = TASK_TYPE_OPTIONS.find((o) => o.value === value)
        return option ? {label: option.label} : undefined
    },
    search: async (query) => {
        if (!query) return TASK_TYPE_OPTIONS
        const q = query.toLowerCase()
        return TASK_TYPE_OPTIONS.filter(
            (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
        )
    },
}

export default Workflows.defineConfigurator(block, (workflowBlock) => {
    const {ComboboxInput, DateInput, TextInput, Outcome} = Workflows.useConfigurator(
        workflowBlock.configSchema
    )

    const {
        values: {teamMembers, records},
    } = useAsyncCache({teamMembers: listTeamMembersForBlock, records: listRecordsForBlock})

    const teamOptions = teamMembers.map((m) => ({
        value: m.value,
        label: m.label,
        description: m.description,
    }))

    const recordOptions: Array<CategorizedPlainComboboxOption> = records.map((r) => ({
        value: r.value,
        label: r.label,
        description: r.description,
        categoryLabel: r.categoryLabel,
    }))

    return (
        <>
            <ComboboxInput
                name="assignedTo"
                label="Assign to"
                placeholder="Select a team member"
                disableVariables
                options={teamOptions}
            />
            <ComboboxInput
                name="type"
                label="Type"
                placeholder="Select a task type"
                disableVariables
                options={taskTypeOptionsProvider}
            />
            <ComboboxInput
                name="recordId"
                label="Record"
                placeholder="Select a contact or company"
                disableVariables
                options={recordOptions}
            />
            <DateInput name="dueDate" label="Due date" />
            <ComboboxInput
                name="priority"
                label="Priority"
                placeholder="Select a priority"
                disableVariables
                options={PRIORITY_OPTIONS}
            />
            <TextInput name="title" label="Title" />
            <TextInput name="description" label="Description" />
            <Outcome
                id="created"
                schema={Workflows.OutcomeSchema.struct({
                    task_id: Workflows.OutcomeSchema.string().title("Task ID"),
                    type: Workflows.OutcomeSchema.string().title("Type"),
                    due_date: Workflows.OutcomeSchema.string().title("Due date"),
                    user_id: Workflows.OutcomeSchema.string().title("User ID"),
                    contact_id: Workflows.OutcomeSchema.string().title("Contact ID"),
                })}
            />
        </>
    )
})
