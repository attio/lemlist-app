import {Workflows} from "attio/client"
import block from "./block"

export default Workflows.defineConfigurator(block, (workflowBlock) => {
    const {EmailAddressInput, Outcome} = Workflows.useConfigurator(workflowBlock.configSchema)

    return (
        <>
            <EmailAddressInput name="email" label="Email" />
            <Outcome id="valid" label="Valid" schema={null} />
            <Outcome id="invalid" label="Invalid" schema={null} />
        </>
    )
})
