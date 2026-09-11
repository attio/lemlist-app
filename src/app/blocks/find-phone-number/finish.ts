import {Workflows} from "attio/server"
import {parseEnrichmentFinishPayload} from "../../../services/enrichment/parse-enrichment-finish"
import {createLogger} from "../../../common/logger"
import block from "./block"

const logger = createLogger("FindPhoneNumber step - finish")

export default Workflows.defineWorkflowBlockFinish(block, async (req) => {
    const result = await parseEnrichmentFinishPayload(req, logger)

    if (result.type === "error") return result

    if (result.value.status !== "completed") {
        return {type: "error", errorMessage: "lemlist enrichment API Failed"}
    }

    const phone = result.value.data.data?.phone?.phone?.trim()
    if (!phone) return {type: "outcome", id: "not_found", data: null}

    const phoneNumber = Workflows.OutcomeValue.phoneNumber(phone)

    if (!phoneNumber) return {type: "outcome", id: "not_found", data: null}

    return {type: "outcome", id: "found", data: {phone_number: phoneNumber}}
})
