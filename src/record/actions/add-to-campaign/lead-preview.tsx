import {isErrored} from "@attio/fetchable"
import {Banner, DescriptionList, Link, LoadingState, useAsyncCache} from "attio/client"
import {Suspense} from "react"
import getLeadPreview from "./get-lead-preview.server"

type Props = {
    /** Attio record ID of the person whose lemlist payload should be previewed. */
    recordId: string
    /**
     * Optional display name/email used only to make the loading state nicer ("Loading preview data
     * for Jane Doe…"). Falls back to a generic message when neither is provided.
     */
    fullName?: string | null
    email?: string | null
}

/** Friendly labels for known lemlist fields. Unknown keys (custom variables) fall back to the key. */
const FIELD_LABELS: Record<string, string> = {
    email: "Email",
    additionalEmails: "Additional emails",
    firstName: "First name",
    lastName: "Last name",
    companyName: "Company",
    jobTitle: "Job title",
    phone: "Phone",
    linkedinUrl: "LinkedIn",
    companyDomain: "Company domain",
    picture: "Picture",
    contactOwner: "Contact owner",
}

/** Fields whose value is a URL and should be rendered as a link. */
const LINK_FIELDS = new Set(["linkedinUrl", "picture"])

function formatValue(value: unknown): string {
    return Array.isArray(value) ? value.join(", ") : String(value)
}

function LeadPreviewContent({recordId}: {recordId: string}) {
    const {
        values: {preview},
    } = useAsyncCache({preview: [getLeadPreview, recordId]})

    if (isErrored(preview)) {
        return <Banner variant="error">{preview.error.errorMessage}</Banner>
    }

    const value = preview.value
    if (!value || Object.keys(value).length === 0) {
        return (
            <Banner variant="warning">There is no data to send to lemlist for this person.</Banner>
        )
    }

    return (
        <DescriptionList title="Data sent to lemlist">
            {Object.entries(value).map(([key, raw]) => {
                const text = formatValue(raw)
                return (
                    <DescriptionList.Item key={key} label={FIELD_LABELS[key] ?? key}>
                        {LINK_FIELDS.has(key) ? <Link href={text}>{text}</Link> : text}
                    </DescriptionList.Item>
                )
            })}
        </DescriptionList>
    )
}

/**
 * Shows a preview of the exact data that will be sent to lemlist for a person, fetched server-side
 * from their Attio record. Renders its own loading and error states so it can be dropped into any
 * dialog by passing a `recordId`.
 */
export default function LeadPreview({recordId, fullName, email}: Props) {
    const subject = fullName?.trim() || email?.trim() || null

    return (
        <Suspense
            fallback={
                <LoadingState>
                    {subject ? `Loading preview data for ${subject}…` : "Loading preview data…"}
                </LoadingState>
            }
        >
            <LeadPreviewContent recordId={recordId} />
        </Suspense>
    )
}
