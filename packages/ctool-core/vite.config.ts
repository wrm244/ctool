import vue from "@vitejs/plugin-vue";
import ReactivityTransform from "@vue-macros/reactivity-transform/vite";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { defineConfig } from "vite";
import HtmlConfig from "vite-plugin-html-config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
    base: "./",
    plugins: [
        nodePolyfills(),
        HtmlConfig({
            metas: [
                {
                    name: "ctool-version",
                    content: JSON.parse(readFileSync(join(__dirname, "../../package.json")).toString())["version"],
                },
                {
                    name: "ctool-build-timestamp",
                    content: `${Date.parse(new Date().toString()) / 1000}`,
                },
            ],
        }),
        vue(),
        ReactivityTransform(),
    ],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
        },
    },
    build: {
        emptyOutDir: true,
        sourcemap: false,
        rollupOptions: {
            input: {
                index: resolve(__dirname, "index.html"),
                tool: resolve(__dirname, "tool.html"),
            },
        },
        reportCompressedSize: false,
        chunkSizeWarningLimit: 5000,
        minify: "terser",
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ["console.log", "console.info", "console.debug"],
            },
            format: {
                comments: false,
            },
        },
    },
});
