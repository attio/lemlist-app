import type {App} from "attio"
import "./app.settings"
import {addToCampaignAction} from "./record/actions/add-to-campaign/add-to-campaign.action"
import {openInLemlistAction} from "./record/actions/open-in-lemlist/open-in-lemlist.action"
import {addToCampaignBulkAction} from "./record/bulk-actions/add-to-campaign/bulk-add-to-campaign.action"
import {workspaceSettings} from "./workspace-settings"

export const app: App = {
    record: {
        actions: [openInLemlistAction, addToCampaignAction],
        bulkActions: [addToCampaignBulkAction],
        widgets: [],
    },
    callRecording: {
        insight: {
            textActions: [],
        },
        summary: {
            textActions: [],
        },
        transcript: {
            textActions: [],
        },
    },
    settings: {
        workspace: workspaceSettings,
    },
}
