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
    worker: {
        // bcryptjs 会 import Node 的 crypto 作为 WebCrypto 的兜底（包内已声明 browser.crypto=false）。
        // 主构建里该 polyfill 依赖注入的 global/Buffer/process shim 才能运行，但 worker 构建不会
        // 继承这些注入，导致 bcrypt worker 启动即抛 `global is not defined`，且体积膨胀到数百 KB。
        // 这里只在 worker 环境把 crypto 置空，让 bcryptjs 走浏览器原生 crypto.getRandomValues。
        plugins: () => [
            {
                name: "ctool-worker-crypto-stub",
                enforce: "pre",
                resolveId(source) {
                    // vite-plugin-node-polyfills 的 resolve.alias 会先把 `crypto` 改写为
                    // crypto-browserify 的绝对路径，因此这里要同时匹配原始名与改写后的目标。
                    if (
                        source === "crypto"
                        || source === "node:crypto"
                        || source === "crypto/promises"
                        || source.includes("/crypto-browserify")
                    ) {
                        return "\0ctool-empty-crypto";
                    }
                    return null;
                },
                load(id) {
                    if (id === "\0ctool-empty-crypto") {
                        return "export default {};";
                    }
                    return null;
                },
            },
        ],
    },
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
            // cron-parser 的 CronFileParser 引用 fs/promises（浏览器端不会执行），
            // node-stdlib-browser 对其映射有缺陷，用空 stub 替代
            "fs/promises": resolve(__dirname, "./src/statics/fsPromisesStub.ts"),
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
                            includeDependenciesRecursively: false,
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
                            includeDependenciesRecursively: false,
                        },
                        {
                            name: "jsrsasign",
                            test: /[\\/]node_modules[\\/]jsrsasign[\\/]/,
                            priority: 20,
                            includeDependenciesRecursively: false,
                        },
                        {
                            name: "quicktype",
                            test: /[\\/]node_modules[\\/]quicktype-core[\\/]/,
                            priority: 20,
                            includeDependenciesRecursively: false,
                        },
                        {
                            name: "httpsnippet",
                            test: /[\\/]node_modules[\\/]@readme[\\/]httpsnippet[\\/]/,
                            priority: 20,
                            includeDependenciesRecursively: false,
                        },
                        {
                            name: "mathjs",
                            test: /[\\/]node_modules[\\/]mathjs[\\/]/,
                            priority: 20,
                            includeDependenciesRecursively: false,
                        },
                        {
                            name: "qrcode",
                            test: /[\\/]node_modules[\\/]qr-code-styling[\\/]/,
                            priority: 20,
                            includeDependenciesRecursively: false,
                        },
                        {
                            name: "code-formatter",
                            test: /[\\/]node_modules[\\/](prettier(?:-plugin-java)?|@prettier[\\/]plugin-php|html-minifier-terser|uglify-js-export|sql-formatter|csso)[\\/]/,
                            priority: 15,
                            includeDependenciesRecursively: false,
                        },
                        {
                            name: "tool-libs",
                            test: /[\\/]node_modules[\\/](a-color-picker|composerize-ts|cronstrue|crc|jsbarcode|nzh|netmask|ip6|qrcode-parser|pinyin-pro|xlsx|web-tree-sitter|marked|diff|jsonpath-plus|jmespath|ajv|ajv-i18n)[\\/]/,
                            priority: 20,
                            includeDependenciesRecursively: false,
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
                // vm-browserify 与 web-tree-sitter 的 EVAL 警告均来自第三方包内部
                // （node-stdlib-browser 的 VM 模拟 / emscripten 生成代码的常量表求值），
                // 项目代码自身不存在 eval，仅对这两个包做精准过滤
                if (
                    warning.code === "EVAL"
                    && (
                        warning.message?.includes("vm-browserify")
                        || warning.id?.includes("web-tree-sitter")
                    )
                ) {
                    return;
                }
                defaultHandler(warning);
            },
        },
        reportCompressedSize: false,
        chunkSizeWarningLimit: 5000,
    },
});
