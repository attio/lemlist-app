import {Settings, type SettingsSchema} from "attio"

const settingsSchema = {
    workspace: {
        linkedinEnrichment: Settings.boolean(),
        verifyEmail: Settings.boolean(),
        findEmail: Settings.boolean(),
        findPhone: Settings.boolean(),
        deduplicate: Settings.boolean(),
    },
} satisfies SettingsSchema

export default settingsSchema
