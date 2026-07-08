import type {App} from "attio"
import {useWorkspaceSettingsForm} from "attio/client"
import "./app.settings"

export const workspaceSettings: App.Settings.Workspace = {
    Page,
}

function Page() {
    const {Form, Section, Toggle} = useWorkspaceSettingsForm()

    return (
        <Form>
            <Section
                title="Add to campaign defaults"
                description="Default query parameters when adding a person as a lead in a lemlist campaign."
            >
                <Toggle
                    label="Find email"
                    name="findEmail"
                    description="Find a verified email address when adding a lead."
                />
                <Toggle
                    label="Find phone"
                    name="findPhone"
                    description="Find a phone number when adding a lead."
                />
                <Toggle
                    label="Enable social enrichment"
                    name="linkedinEnrichment"
                    description="Run social enrichment when adding a lead."
                />
                <Toggle
                    label="Verify email"
                    name="verifyEmail"
                    description="Verify the existing email address (debounce)."
                />
                <Toggle
                    label="Deduplicate"
                    name="deduplicate"
                    description="Skip adding the lead if the email already exists in another campaign."
                />
            </Section>
        </Form>
    )
}
