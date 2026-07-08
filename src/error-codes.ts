export const ErrorCode = {
    EnrichmentWebhookParseFailed: "enrichment_webhook_parse_failed",
    EnrichmentWebhookUnexpected: "enrichment_webhook_unexpected",
    EnrichPhoneInputRequired: "enrich_phone_input_required",
    EnrichEmailInputRequired: "enrich_email_input_required",
    EnrichLinkedinInputRequired: "enrich_linkedin_input_required",
    EnrichVerifyEmailInputRequired: "enrich_verify_email_input_required",
    EnrichmentResponseInvalid: "enrichment_response_invalid",
    CreateTaskInvalidRequest: "create_task_invalid_request",
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

const ERROR_MESSAGES: Record<ErrorCode, string> = {
    [ErrorCode.EnrichmentWebhookParseFailed]: "Failed to parse enrichment webhook from lemlist",
    [ErrorCode.EnrichmentWebhookUnexpected]: "Unexpected enrichment webhook from lemlist",
    [ErrorCode.EnrichPhoneInputRequired]:
        "At least one of email, LinkedIn URL, first name, last name, or company name is required",
    [ErrorCode.EnrichEmailInputRequired]:
        "At least one of LinkedIn URL, first name, last name, or company name is required",
    [ErrorCode.EnrichLinkedinInputRequired]:
        "At least one of email, first name, last name, or company name is required",
    [ErrorCode.EnrichVerifyEmailInputRequired]: "An email address is required to verify",
    [ErrorCode.EnrichmentResponseInvalid]: "Unexpected enrichment response from lemlist",
    [ErrorCode.CreateTaskInvalidRequest]:
        "Assigned To, Type, and Due date are required to create a task",
}

export function errorMessage(code: ErrorCode): string {
    return ERROR_MESSAGES[code]
}
