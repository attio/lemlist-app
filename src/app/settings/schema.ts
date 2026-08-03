import {experimental_Settings} from "attio"
export default experimental_Settings.defineWorkspaceSchema({
    linkedinEnrichment: experimental_Settings.Schema.boolean(),
    verifyEmail: experimental_Settings.Schema.boolean(),
    findEmail: experimental_Settings.Schema.boolean(),
    findPhone: experimental_Settings.Schema.boolean(),
    deduplicate: experimental_Settings.Schema.boolean(),
})
