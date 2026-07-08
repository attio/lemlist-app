import path from "node:path"
import {fileURLToPath} from "node:url"
import {defineConfig} from "vitest/config"

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    resolve: {
        alias: {
            "attio/client": path.resolve(dirname, "test/mocks/attio-client.ts"),
            "attio/server": path.resolve(dirname, "test/mocks/attio-server.ts"),
        },
    },
    test: {
        environment: "node",
        include: ["src/**/*.spec.ts"],
    },
})
