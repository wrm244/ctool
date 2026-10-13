import {defineConfig} from "tsdown";

export default defineConfig({
    entry: ["./src/index.ts", "./src/init.ts", "./src/release.ts"],
    outDir: "./dist/",
    format: ["cjs", "esm"],
    platform: "node",
    target: "node16",
    dts: true,
    clean: true,
});
