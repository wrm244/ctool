// HTML 内容安全处理：基于 DOMPurify 对用户输入的 HTML 进行消毒，防御 XSS
import DOMPurify from "dompurify";

// 允许的基础标签和属性，尽量严格以减少攻击面
const defaultConfig = {
    ALLOWED_TAGS: [
        "p", "br", "hr", "b", "i", "em", "strong", "u", "s", "strike", "del",
        "span", "a", "code", "pre", "table", "thead", "tbody", "tr", "th", "td",
        "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"
    ] as string[],
    ALLOWED_ATTR: ["href", "title", "target", "class", "style"] as string[],
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true,
};

/**
 * 对用户提供的 HTML 字符串进行消毒
 * @param html 原始 HTML 字符串
 * @returns 消毒后的安全 HTML 字符串
 */
export const sanitizeHtml = (html: string): string => {
    if (typeof html !== "string") {
        return "";
    }
    // DOMPurify.sanitize 默认返回 string，TrustedTypes 环境下可能返回 TrustedHTML，这里统一转 string
    return String(DOMPurify.sanitize(html, defaultConfig));
};

export default sanitizeHtml;
