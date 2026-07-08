import {type AttioApiError, attioApiErrorMessage} from "../../../attio/error"

export type AddPersonToCampaignError = AttioApiError | {code: "NO_EMAIL"}

export function addPersonToCampaignErrorMessage(error: AddPersonToCampaignError): string {
    switch (error.code) {
        case "NO_EMAIL":
            return "This person has no email address. Add an email before adding them to a campaign."
        default:
            return attioApiErrorMessage(error)
    }
}
