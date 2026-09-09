/** The attribute slugs below are either mapped to lemlist known fields or system attributes to ignore. */
export const ATTIO_IGNORE_SLUGS: ReadonlySet<string> = new Set([
    "record_id", // not an attribute to send to lemlist

    // Known mapped to lemlist fields:
    "name",
    "email_addresses",
    "description",
    "company",
    "job_title",
    "linkedin",
    "avatar_url",
    "phone_numbers",
    "primary_location",

    // System attributes to ignore
    "list_entries",
    "first_calendar_interaction",
    "last_calendar_interaction",
    "next_calendar_interaction",
    "first_email_interaction",
    "last_email_interaction",
    "first_interaction",
    "last_interaction",
    "next_interaction",
    "strongest_connection_strength_legacy",
    "strongest_connection_strength",
    "strongest_connection_user",
    "next_due_task",
    "associated_deals",
    "created_at",
    "created_by",
])
