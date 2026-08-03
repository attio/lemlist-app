import {Settings} from "attio"
export default Settings.defineWorkspaceSchema({
    linkedinEnrichment: Settings.Schema.boolean(),
    verifyEmail: Settings.Schema.boolean(),
    findEmail: Settings.Schema.boolean(),
    findPhone: Settings.Schema.boolean(),
    deduplicate: Settings.Schema.boolean(),
})
