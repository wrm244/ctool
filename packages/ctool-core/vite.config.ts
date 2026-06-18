import vue from "@vitejs/plugin-vue";
import ReactivityTransform from "@vue-macros/reactivity-transform/vite";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import HtmlConfig from "vite-plugin-html-config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

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
        rolldownOptions: {
            input: {
                index: resolve(__dirname, "index.html"),
                tool: resolve(__dirname, "tool.html"),
            },
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: "monaco-editor",
                            test: /monaco-editor/,
                            priority: 30,
                        },
                        {
                            name: "vue-vendor",
                            test: /[\\/]node_modules[\\/](vue|vue-router|pinia)[\\/]/,
                            priority: 25,
                        },
                        {
                            name: "crypto",
                            test: /[\\/]node_modules[\\/](crypto-js|sm-crypto)[\\/]/,
                            priority: 20,
                        },
                        {
                            name: "jsrsasign",
                            test: /[\\/]node_modules[\\/]jsrsasign[\\/]/,
                            priority: 20,
                        },
                        {
                            name: "quicktype",
                            test: /[\\/]node_modules[\\/]quicktype-core[\\/]/,
                            priority: 20,
                        },
                        {
                            name: "httpsnippet",
                            test: /[\\/]node_modules[\\/]@readme[\\/]httpsnippet[\\/]/,
                            priority: 20,
                        },
                        {
                            name: "mathjs",
                            test: /[\\/]node_modules[\\/]mathjs[\\/]/,
                            priority: 20,
                        },
                        {
                            name: "qrcode",
                            test: /[\\/]node_modules[\\/]qr-code-styling[\\/]/,
                            priority: 20,
                        },
                        {
                            name: "code-formatter",
                            test: /[\\/]node_modules[\\/](prettier|html-minifier-terser|uglify-js-export|sql-formatter|csso)[\\/]/,
                            priority: 15,
                        },
                        {
                            name: "vendor",
                            test: /[\\/]node_modules[\\/]/,
                            priority: 10,
                        },
                    ],
                },
                minify: {
                    compress: {
                        dropConsole: true,
                        dropDebugger: true,
                    },
                    mangle: {
                        keepNames: true,
                    },
                },
            },
            onwarn(warning, defaultHandler) {
                if (warning.code === "EVAL" && warning.message?.includes("vm-browserify")) {
                    return;
                }
                defaultHandler(warning);
            },
        },
        reportCompressedSize: false,
        chunkSizeWarningLimit: 5000,
    },
});
