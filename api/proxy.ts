import type {VercelRequest, VercelResponse} from '@vercel/node';
import {IncomingMessage, ServerResponse, ClientRequest} from "http";
import httpProxy from "http-proxy";
import {proxy as proxyConfig} from "ctool-config";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Ctool-Proxy-Url,Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since, X-CSRF-TOKEN, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
}

// 复用代理实例，避免每个请求都创建一组代理连接监听器和内部状态。
const proxy = httpProxy.createProxyServer({
    changeOrigin: true,
    proxyTimeout: 30_000,
    timeout: 30_000,
})

proxy.on('error', function (error, _request, response) {
    console.error('proxy error', error)
    if (!response || !('writeHead' in response)) {
        return
    }
    if (response.headersSent) {
        response.destroy(error)
        return
    }
    response.writeHead(502, CORS_HEADERS)
    response.end('502')
})

proxy.on('proxyReq', (proxyReq: ClientRequest, request: IncomingMessage) => {
    const proxyUrl = (request.headers['ctool-proxy-url'] || "").toString()
    try {
        const parsed = new URL(proxyUrl)
        proxyReq.path = `${parsed.pathname}${parsed.search}`
    } catch {
        // 请求已经经过白名单校验，这里仅处理极端并发下的异常数据。
    }
    proxyReq.removeHeader('ctool-proxy-url')
})

proxy.on('proxyRes', (proxyRes: IncomingMessage) => {
    Object.keys(CORS_HEADERS).forEach(name => {
        proxyRes.headers[name.toLowerCase()] = CORS_HEADERS[name]
    })
})

export default function (request: VercelRequest | IncomingMessage, response: VercelResponse | ServerResponse) {
    // option 请求
    if (request.method?.toLowerCase() === "options") {
        response.writeHead(200, CORS_HEADERS)
        response.end("")
        return
    }
    const proxyUrl = (request.headers['ctool-proxy-url'] || "").toString()
    if (!proxyConfig.is(proxyUrl)) {
        response.writeHead(400, CORS_HEADERS)
        return response.end("400")
    }

    const target = new URL(proxyUrl).origin
    proxy.web(request, response, {target})
}

