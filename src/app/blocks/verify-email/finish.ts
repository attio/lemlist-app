import {Workflows} from "attio/server"
import {parseEnrichmentFinishPayload} from "../../../services/enrichment/parse-enrichment-finish"
import {createLogger} from "../../../common/logger"
import block from "./block"

const logger = createLogger("VerifyEmail step - finish")

export default Workflows.defineWorkflowBlockFinish(block, async (req) => {
    const result = await parseEnrichmentFinishPayload(req, logger)

    if (result.type === "error") return result

    if (result.value.status !== "completed") {
        return {type: "error", errorMessage: "lemlist enrichment API Failed"}
    }

    const isDeliverable = result.value.data.data?.email?.status === "deliverable"

    if (isDeliverable) {
        return {type: "outcome", id: "valid", data: null}
    }

    return {type: "outcome", id: "invalid", data: null}
})
