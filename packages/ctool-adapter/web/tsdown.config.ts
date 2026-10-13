import {defineConfig} from "tsdown";

export default defineConfig({
    entry: ["./src/release.ts"],
    outDir: "./dist/",
    format: ["cjs"],
    platform: "node",
    target: "node16",
    clean: true,
});
