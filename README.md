# Ctool · 程序开发常用工具

> 一个打开就能用的开发者工具箱：**50 个工具、74 项功能**，绝大多数计算都在你自己的设备上完成。

哈希、加解密、编码转换、格式化、校验、生成 —— 不用装环境、不用开终端，也不用先把数据传到别人的服务器上。

## 它解决的问题

开发的一天里有很多“几十秒的小事”：算个 MD5、看一眼时间戳、格式化一段 JSON、把 SQL 里的 `?` 填上参数、核一个子网掩码……

每件事都很小，但每次都要先“换个地方”：翻收藏夹、开一个临时网站、装个 CLI，或者干脆自己拼一行命令。Ctool 把这些收在一处，并且尽量让你感觉不到它的存在：

- **打开就有** —— 50 个工具按用途分成 6 类，常用的第一屏就点得到，冷门的搜一下就出来
- **本地算完** —— 除 IP 查询、WebSocket 调试、在线运行代码这类本身就要联网的功能外，其余全部在本地完成，断网照常可用
- **不拖电脑** —— 工具页异步加载 + 首屏骨架，进页面不白屏；扩展形态随开随关，不常驻后台
- **一处逻辑，四种形态** —— 同一套代码打包成网页、浏览器扩展、桌面应用和 uTools 插件，走到哪台机器上都是同一套操作

## 怎么拿到

| 形态        | 适用平台                          | 获取方式                                                      |
| ----------- | --------------------------------- | ------------------------------------------------------------- |
| 网页版      | 任意现代浏览器，可安装为 PWA      | 打开 <https://ctool.dev>                                      |
| 浏览器扩展  | Chrome / Edge / Firefox           | Releases 下载对应 zip 后加载，或自行打包到商店安装            |
| 桌面应用    | Windows x64 / macOS arm64 / Linux | Releases 下载 `.exe`、`.dmg`、`.deb` 或 `.AppImage`           |
| uTools 插件 | uTools                            | Releases 下载 uTools 版 zip，或本地打包后装入                 |
| Arch Linux  | Arch / Manjaro                    | 直接用 `.deb` / `.AppImage`，或参考仓库内 `PKGBUILD` 自行构建 |

所有产物都在 [GitHub Releases](https://github.com/wrm244/ctool/releases) 里，版本号跟随根目录 `package.json`。

## 先睹为快

<img src="./images/v2.0.0.png" alt="Ctool 界面预览" width="100%">

## 功能一览

| 类别       | 包含                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 加密与哈希 | 哈希（MD5 / SHA1 / SHA256 / SHA512 / SM3，支持文件与批量）、HMAC、AES、DES、Triple DES、RC4、Rabbit、SM4、SM2、RSA、签名验签、Bcrypt                                                                                |
| 编码解码   | Base64、URL、Unicode（含 emoji、HTML / CSS 实体）、JWT、Hex / String、GZIP、ASN.1、域名编码（Punycode）、HTML 编码                                                                                                  |
| 格式转换   | JSON 工具、序列化（JSON / XML / YAML / TOML / Properties / PHP array / PHP serialize / CSV / HTTP Query）、进制转换、单位换算、时间日期、汉字转拼音、中文数字、颜色、Url 解析、Docker run 转 Compose、Http 请求代码 |
| 校验与比对 | 正则表达式（匹配 / 查找 / 替换）、文本差异比对、Crontab 规则校验、BCC / CRC / LRC 校验、Bcrypt 验证                                                                                                                 |
| 生成器     | 二维码（生成 / 解析）、条形码、UUID、随机字符、原码反码补码、IP 网络计算器（IPv4 / IPv6）、SQL 参数填充                                                                                                             |
| 其他       | IP 地址查询、代码格式化（JS / TS / HTML / CSS / Less / SCSS / Vue / Angular / GraphQL / Markdown / XML / YAML / SQL 等）、WebSocket 调试、文本处理、变量名格式转换、ASCII、ARM / HEX                                |

<details>
<summary>关于联网功能</summary>

只有少数功能需要访问网络，其余全部离线可用：

- **IP 地址查询** —— 请求 <https://geojs.io> 获取归属地
- **WebSocket 调试** —— 需要连到你的目标地址
- **代码在线运行** —— 通过代理转发到 jsdoodle
- **ARM / HEX 互转** —— 通过代理转发到 armconverter

网页版受同源策略限制时，会走仓库里的代理路由（`api/proxy.ts` / `cloudflare/index.ts`），可访问域名白名单在 `packages/ctool-config/src/proxy.ts` 维护。

</details>

## 开发

### 环境要求

- Node.js 24 及以上
- pnpm（`packageManager` 已锁定版本，启用 corepack 即可）

### 常用命令

```bash
# 安装依赖
pnpm install

# 开发调试（先初始化配置、生成路由与 i18n 类型，再启动 Vite）
pnpm run dev

# 生成配置 + 类型检查
pnpm run check

# 构建核心应用，产物在 packages/ctool-core/dist
pnpm run build

# 清理生成的 dist / _release
pnpm run clear
```

### 打包发布

```bash
# 所有平台，产物统一输出到 _release
pnpm run release

# 单个平台
pnpm --filter ctool-adapter-chrome   run platform-release
pnpm --filter ctool-adapter-edge     run platform-release
pnpm --filter ctool-adapter-firefox  run platform-release
pnpm --filter ctool-adapter-utools   run platform-release
pnpm --filter ctool-adapter-web      run platform-release

# 桌面端：Tauri 无法交叉编译，需在目标系统上执行
pnpm --filter ctool-adapter-tauri    run platform-release
```

桌面端安装包也可以交给 CI：打一个 `v*.*.*` tag 就会触发 `.github/workflows/release-desktop.yml`，先校验 tag 与 `package.json` 版本一致，再构建 Windows / macOS 产物并发布 Release。

### 部署站点

站点是带 Service Worker 的 PWA，构建产物由 `packages/ctool-site/dist` 提供：

```bash
# 构建核心应用 + 站点
pnpm run vercel-build

# 部署到 Cloudflare Workers（先执行 pnpm exec wrangler login）
pnpm run deploy:cloudflare
```

Cloudflare 侧配置见根目录 `wrangler.jsonc`，动态路由（`/api/proxy`、`/privacy`）在 `cloudflare/index.ts`。Vercel 部署可直接使用 `vercel.json` 与 `api/proxy.ts`。

### 目录结构

| 路径                                                                 | 作用                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/ctool-config`                                              | 工具注册表、分类、i18n key、代理白名单，以及生成脚本           |
| `packages/ctool-core`                                                | Vue 3 应用本体，所有工具实现都在 `src/tools` 下                |
| `packages/ctool-adapter/{chrome,edge,firefox,utools,tauri,web,base}` | 各平台打包适配与发布脚本                                       |
| `packages/ctool-site`                                                | PWA 站点外壳、manifest 与 Service Worker                       |
| `api/proxy.ts`、`cloudflare/`                                        | 联网功能的转发代理，分别是 Vercel 与 Cloudflare Workers 的入口 |

构建核心应用前会先执行 `pnpm run initialize`：编译 `ctool-config` 并扫描 `packages/ctool-core/src`，生成 `buildDataTemp.ts`（路由表）、`buildTypeTemp.d.ts`（i18n 类型）和 `public/ctool.addition.json`（运行时元数据）。

### 新增一个工具

1. 在 `packages/ctool-config/src/config.ts` 注册工具（`_tools`）、指定分类（`_categoryTool`），需要的话加入首页常用（`_common`）。
2. 在 `packages/ctool-core/src/tools/<目录>/` 下按功能名创建组件，例如 `aes` 的 `encrypt` 功能对应 `tools/encrypt/aes/Encrypt.vue`。
3. 在同目录的 `i18n/zh_CN.json5`、`i18n/en.json5` 补上文案，中英 key 必须一致。
4. 执行 `pnpm run initialize` 重新生成路由与类型。

## 关于本项目

本项目来自 [baiy/Ctool](https://github.com/baiy/Ctool)，原作者 [baiy](https://github.com/baiy)。上游已停止更新，本仓库从上游拉取后继续维护，方向是让它**更好用、更稳定、更省资源**。

相对上游目前已完成的工作：

- **构建与依赖** —— 迁移到 rolldown / tsdown 构建链，依赖持续升级，桌面端同步到 Tauri 2
- **启动体验** —— 新增首屏加载骨架，减少白屏等待；Monaco 编辑器改为按需加载，序列化与代码类工具打开更快
- **稳定性** —— 修复文本比对、Bcrypt、3DES、RC4 等工具的异常，处理资源泄漏、竞态与参数校验缺失
- **桌面端** —— 直接加载 `tool.html`，修复 CSP 拦截编辑器样式的问题，收敛权限声明
- **自动化** —— 新增 Windows / macOS 桌面端 Release 工作流，补齐 Cloudflare Workers 部署配置

代码依旧遵循 MIT 协议，上游署名与贡献记录完整保留。隐私说明见 [PRIVACY](./PRIVACY)。

## 反馈

- 用着不对、或者想要新工具，欢迎开 [Issue](https://github.com/wrm244/ctool/issues)，附上复现步骤或截图更快定位
- 能拿出实现代码的 PR 尤其欢迎，照着上面“新增一个工具”的步骤走就行
- 如果你更习惯用上游的版本，也请继续支持 [baiy/Ctool](https://github.com/baiy/Ctool)
