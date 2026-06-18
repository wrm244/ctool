# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Ctool is a collection of developer utilities distributed as a web app, browser extension (Chrome/Edge/Firefox), uTools plugin, and Tauri desktop app. The project is a Chinese-first application with English translations.

## Monorepo structure

This is a pnpm workspace monorepo defined by `pnpm-workspace.yaml`.

- `packages/ctool-config` — Central registry for tools, categories, features, i18n keys, proxy allowlist, and generated artifacts. Builds first in every workflow.
- `packages/ctool-core` — Vue 3 SPA containing every tool implementation. Consumes `ctool-config` and is built into `packages/ctool-core/dist`.
- `packages/ctool-adapter-*` — Platform-specific wrappers. Each copies `ctool-core/dist` and produces a release bundle in `_release/`.
  - `base` — Shared release utilities (`copyCoreDist`, `release`, `version`).
  - `chrome`, `edge`, `firefox`, `utools`, `tauri`, `web` — Platform adapters.
- `packages/ctool-site` — PWA landing page that embeds the core app and registers shortcuts in `manifest.webmanifest.json`.
- `api/proxy.ts` — Vercel serverless proxy used by network-dependent tools (e.g., IP lookup) to work around CORS.

## Common commands

Install dependencies:

```bash
pnpm install
```

Generate config/adapter builds and type-check the core app:

```bash
pnpm run check
```

Start the development server for `ctool-core`:

```bash
pnpm run dev
```

This runs `initialize` first, type-checks with `vue-tsc`, then starts Vite on `--host`.

Build the core app:

```bash
pnpm run build
```

Build everything and create release bundles for every platform:

```bash
pnpm run release
```

Release bundles are written to `_release/`.

Build a single platform release (example: Chrome):

```bash
pnpm --filter ctool-adapter-chrome run platform-release
```

Other platform filters: `ctool-adapter-edge`, `ctool-adapter-firefox`, `ctool-adapter-utools`, `ctool-adapter-tauri`, `ctool-adapter-web`.

Build the Vercel/PWA site:

```bash
pnpm run vercel-build
```

Clear generated dist/release artifacts:

```bash
pnpm run clear
```

## Build pipeline details

`pnpm run initialize` is the first step of almost every top-level script. It:

1. Builds `ctool-config` (`pnpm --filter ctool-config run build`).
2. Builds `ctool-adapter-base`.
3. Runs `adapter-build` in every adapter package.

Building `ctool-config` executes `tsup-node` and then `node dist/generate.js`. The generator scans `packages/ctool-core/src` and writes three generated files:

- `packages/ctool-core/src/buildDataTemp.ts` — Tool route table and locale data.
- `packages/ctool-core/src/buildTypeTemp.d.ts` — TypeScript types for i18n keys and locales.
- `packages/ctool-core/public/ctool.addition.json` — Runtime metadata (i18n, keywords, icons).

`packages/ctool-core` then type-checks with `vue-tsc -b` and bundles with Vite. The Vite config (`packages/ctool-core/vite.config.ts`) builds two entry points: `index.html` (redirects to `tool.html`) and `tool.html` (the actual app).

## Tool architecture

Tools are defined centrally in `packages/ctool-config/src/config.ts`.

- `_tools` maps a tool name to its features and optional `parent_directory`.
- `_categoryTool` assigns tools to categories (`encryption`, `conversion`, `encoder_decoder`, `check`, `generate`, `other`).
- `_common` lists the default "common" tools shown on the index page.

Each feature expects a Vue component at:

```
packages/ctool-core/src/tools/<tool_directory>/<FeatureName>.vue
```

`tool_directory` is either the tool name or `parent_directory/tool_name`. Feature component file names use `upperFirst(feature_name)`. For example, the `encrypt` feature of `aes` resolves to `tools/encrypt/aes/Encrypt.vue`.

To add a new tool:

1. Register it in `packages/ctool-config/src/config.ts` (tool entry + category assignment + feature list).
2. Create the feature component(s) under `packages/ctool-core/src/tools/<directory>/`.
3. Add i18n strings in `packages/ctool-core/src/tools/<directory>/i18n/{zh_CN,en}.json5`.
4. Run `pnpm run initialize` to regenerate routes and types.

## i18n

Translations are JSON5 files. Global strings live in `packages/ctool-core/src/i18n/locales/{zh_CN,en}/`. Per-tool strings live in `packages/ctool-core/src/tools/<tool>/i18n/{zh_CN,en}.json5`.

The generator merges these, validates that Chinese and English keys match, and produces strongly typed i18n keys in `buildTypeTemp.d.ts`. The runtime `$t` helper is exposed on the Vue app global properties and on `window`.

## State and data flow

- `packages/ctool-core/src/store/action.ts` provides `initialize()` and `useAction()` for tool pages. `initialize()` resolves starting data from URL params, history, clipboard, or defaults. `useAction()` exposes a reactive `current` object and a debounced `save()` that writes to the history store.
- `packages/ctool-core/src/helper/storage.ts` wraps platform storage with versioned keys and expiry.
- `packages/ctool-core/src/helper/platform/runtime.ts` selects the active platform runtime by probing the environment and falls back to the web runtime.

## Platform adapters

Each adapter exports a `PlatformRuntime` implementation and a release script. `packages/ctool-core/src/helper/platform/runtime.ts` imports all non-web runtimes (`edge`, `chrome`, `firefox`, `utools`, `tauri`) and picks the first one whose `is()` returns true.

Adapter release scripts typically:

1. Copy `packages/ctool-core/dist` into a temp directory.
2. Copy platform resources (manifests, icons, Tauri configs).
3. Replace placeholder strings such as `##version##`.
4. Zip or copy the result into `_release/`.

Tauri cannot be cross-compiled; build the Tauri release on the target operating system.

## Type checking and formatting

- Type checking uses `vue-tsc -b` in `ctool-core` and `ctool-site`.
- There is no test suite in this repository.
- Prettier configuration is in `.prettierrc.json`. There is no top-level `format` script; run `pnpm exec prettier --write <path>` if you need to format files.

## Notes from README.md

- Online version: https://ctool.dev
- Development install: `pnpm install`, then `pnpm run dev`.
- Release packages are placed in `/_release`.
