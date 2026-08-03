import {isErrored} from "@attio/fetchable"
import {listCompanies} from "../../../lemlist-api/companies"
import {createLogger} from "../../../utils/logger"

const logger = createLogger("create-task-block list-records")

type RecordOption = {value: string; label: string; description?: string; categoryLabel: string}

// Returns Promise<T> (not AsyncResult) because useAsyncCache expects plain promises.
// Errors are logged and swallowed an empty list is a safe fallback in the configurator UI.
export default async function listRecordsForBlock(): Promise<RecordOption[]> {
    // @TODO: Also list contacts once the lemlist API correctly handles the documented query params.
    const result = await listCompanies()

    if (isErrored(result)) {
        logger.error(`Failed to list companies: ${result.error.errorMessage}`)
        return []
    }

    return result.value.map((company) => ({
        value: company._id,
        label: company.name ?? company.domain ?? company._id,
        description: company.domain,
        categoryLabel: "Companies",
    }))
}
