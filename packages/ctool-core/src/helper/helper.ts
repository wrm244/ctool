import platform from "./platform"

// 允许通过 openUrl 打开的 URL 协议白名单
const ALLOWED_URL_PROTOCOLS = ["http:", "https:", "mailto:", "tel:"];

export const openUrl = (url: string = window.location.href) => {
    // 校验 URL 协议，防止 javascript: 等伪协议导致的 XSS 或代码执行
    try {
        const parsed = new URL(url, window.location.href);
        if (!ALLOWED_URL_PROTOCOLS.includes(parsed.protocol)) {
            console.error(`openUrl 拒绝不安全的协议: ${parsed.protocol}`);
            return;
        }
    } catch (e) {
        console.error(`openUrl 无效的 URL: ${url}`, e);
        return;
    }
    platform.runtime.openUrl(url)
}

export const optionMap = (items: string[] | number[], prefix = "") => {
    return items.map((item: string | number) => {
        return {value: item, label: $t(`${prefix}${item}`)}
    })
}

