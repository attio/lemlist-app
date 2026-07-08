import type {PlainComboboxOption} from "attio/client"

// @TODO: clarify with lemlist how we can add more tasks because their API is not accepting other types
export const TASK_TYPE_OPTIONS: Array<PlainComboboxOption> = [
    {value: "manual", label: "Manual task"},
]

export const PRIORITY_OPTIONS: Array<PlainComboboxOption> = [
    {value: "", label: "None"},
    {value: "0", label: "Low"},
    {value: "1", label: "Medium"},
    {value: "2", label: "High"},
]
