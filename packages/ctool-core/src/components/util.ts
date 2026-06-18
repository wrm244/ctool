import { isNumber } from "lodash";

/**
 * 尺寸转换 适用于 width height 等
 * @param size
 * @param lists
 */
export const sizeConvert = (size: string | number, lists: Record<string, any> = {}): string => {
    if (Object.keys(lists).includes(`${size}`)) {
        return lists[`${size}`];
    }
    return (isNumber(size) || /^[\d.]+$/.test(`${size}`)) ? `${size}px` : `${size}`;
};

// 文本宽度测量元素单例，避免每次测量都创建/销毁 DOM
let measureEl: HTMLDivElement | null = null;
const getMeasureEl = () => {
    if (!measureEl) {
        measureEl = document.createElement("div");
        measureEl.style.position = "absolute";
        measureEl.style.left = "-10000px";
        measureEl.style.top = "-10000px";
        measureEl.style.visibility = "hidden";
        measureEl.style.whiteSpace = "nowrap";
        document.body.appendChild(measureEl);
    }
    return measureEl;
};

export const measureTextMaxWidth = (texts: string[], fontSize: string) => {
    const el = getMeasureEl();
    el.style.fontSize = fontSize;
    let max = 0;
    for (const text of texts) {
        el.textContent = text;
        max = Math.max(max, el.clientWidth);
    }
    el.textContent = ""; // 清理，避免内存中保留长文本
    return max;
};
