// worker 构建不会继承主构建里 node polyfill 注入的 global/Buffer/process shim
// （见 vite.config.ts 的 worker 配置），只要 worker 依赖图里出现任何一处 `global` 引用，
// worker 一启动就会抛 `Uncaught ReferenceError: global is not defined`。
// 这里把 global 指向 globalThis 做兜底，让这一整类问题在 worker 里不可能再出现。
//
// 单独放一个模块是为了保证求值顺序：ESM 的 import 一定先于导入方的正文执行，
// 直接写在 worker.ts 顶部的话，bcryptjs 求值时兜底还没生效。
(globalThis as unknown as { global?: typeof globalThis }).global ??= globalThis;

export {};
