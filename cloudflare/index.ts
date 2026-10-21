// Cloudflare Workers 入口：静态资源 + 动态路由
//
// 对应 Vercel 版本的 api/proxy.ts：
//   - /api/proxy  ：网络工具（web 端受同源策略限制）走这里转发，白名单来自 ctool-config
//   - /privacy    ：等同 vercel.json 里的 302 跳转
//   - 其余请求    ：交给静态资源（packages/ctool-site/dist）
//
// 注意：静态资源命中时默认不会进这个 fetch（见 wrangler.jsonc 的 assets.run_worker_first）。
import proxyConfig from "../packages/ctool-config/src/proxy";

interface Env {
    ASSETS: {
        fetch(request: Request): Promise<Response>;
    };
}

const CORS_HEADERS: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Ctool-Proxy-Url,Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since, X-CSRF-TOKEN, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
};

const PRIVACY_URL = "https://github.com/baiy/Ctool/blob/master/PRIVACY";

// 透传代理：与 api/proxy.ts 的语义保持一致
const handleProxy = async (request: Request): Promise<Response> => {
    if (request.method.toUpperCase() === "OPTIONS") {
        return new Response("", {status: 200, headers: CORS_HEADERS});
    }
    const proxyUrl = request.headers.get("Ctool-Proxy-Url") || "";
    if (!proxyConfig.is(proxyUrl)) {
        return new Response("400", {status: 400, headers: CORS_HEADERS});
    }
    const target = new URL(proxyUrl);
    const headers = new Headers(request.headers);
    headers.delete("Ctool-Proxy-Url");
    // 让上游按自己的域名处理
    headers.delete("host");
    try {
        const upstream = await fetch(`${target.origin}${target.pathname}${target.search}`, {
            method: request.method,
            headers,
            // GET/HEAD 不能带 body
            body: ["GET", "HEAD"].includes(request.method.toUpperCase()) ? undefined : request.body,
            redirect: "follow",
        });
        const responseHeaders = new Headers(upstream.headers);
        Object.entries(CORS_HEADERS).forEach(([name, value]) => responseHeaders.set(name, value));
        return new Response(upstream.body, {status: upstream.status, headers: responseHeaders});
    } catch {
        return new Response("502", {status: 502, headers: CORS_HEADERS});
    }
};

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const {pathname} = new URL(request.url);
        if (pathname === "/api/proxy") {
            return handleProxy(request);
        }
        if (pathname === "/privacy") {
            return Response.redirect(PRIVACY_URL, 302);
        }
        return env.ASSETS.fetch(request);
    },
};
