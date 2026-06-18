import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import svgLoader from "vite-svg-loader";
import ctoolPlugin from "./vitePlugin";
import { readFileSync } from "fs";
import HtmlConfig from "vite-plugin-html-config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
    base: "./",
    plugins: [
        ctoolPlugin(),
        HtmlConfig({
            metas: [
                {
                    name: "ctool-version",
                    content: JSON.parse(readFileSync(join(__dirname, "../../package.json")).toString())["version"],
                },
                {
                    name: "ctool-build-timestamp",
                    content: `${Date.parse((new Date()).toString()) / 1000}`,
                },
            ],
        }),
        vue(),
        svgLoader({
            defaultImport: "component",
        }),
        VitePWA({
            injectRegister: null,
            registerType: "prompt",
            manifest: false,
            workbox: {
                navigateFallbackDenylist: [
                    /^\/api/,
                    /^\/privacy/,
                ],
                globPatterns: ["**\/*.{js,css,html,png,jpg,ico,svg,json}"],
                cleanupOutdatedCaches: true,
                maximumFileSizeToCacheInBytes: 15728640,
            },
        }),
    ],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
        },
    },
    build: {
        assetsDir: "_assets",
        emptyOutDir: true,
        rolldownOptions: {
            input: {
                index: resolve(__dirname, "index.html"),
            },
        },
        reportCompressedSize: false,
    },
});
