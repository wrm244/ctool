import {debug} from "@/helper/util"
import {throttle, isArray} from "lodash"

const events = [
    // 显示主题变化
    'theme_change',
    // 切换显示语言
    'locale_change',
    // 窗口高度调整
    'window_height_resize',
    // 组件尺寸更新
    'component_resize',
    // 关闭非当前需要打开扩展页面
    'extend_page_close',
    // 历史变更
    'history_change',
    // 工具切换
    'tool_change',
    // 打开设置页面
    'open_setting',
    // 页面内容一建清空
    'content_clear'
] as const

type EventName = typeof events[number]
const eventName = (name: EventName) => `ctool_${name}`

// 事件监听器类型：接收原生 DOM Event，detail 可通过 event.detail 获取
type Listener = (event: Event) => void

const event = {
    dispatch(name: EventName, option: any = "") {
        debug(`dispatch event:${name}${option ? ` option ${option}` : ""}`)
        // 通过 CustomEvent.detail 传递事件数据，便于监听器消费
        window.dispatchEvent(new CustomEvent(eventName(name), { detail: option }))
    },
    addListener(name: EventName | EventName[], listener: Listener) {
        if (isArray(name)) {
            for (let item of name) {
                this.addListener(item, listener)
            }
            return;
        }
        window.addEventListener(eventName(name), listener)
    },
    removeListener(name: EventName | EventName[], listener: Listener) {
        if (isArray(name)) {
            for (let item of name) {
                this.removeListener(item, listener)
            }
            return;
        }
        window.removeEventListener(eventName(name), listener)
    }
}

// 获取操作区域高度：缓存 padding 值，减少 getComputedStyle 调用
let cachedPadding: number | null = null;
const getMainOperateHeight = () => {
    const el = document.querySelector<HTMLElement>('.ctool-main-tool')
    if (!el) {
        return window.innerHeight;
    }
    if (cachedPadding === null) {
        const styles = window.getComputedStyle(el);
        cachedPadding = parseFloat(styles['paddingTop']) + parseFloat(styles['paddingBottom']);
    }
    return Math.ceil(el.clientHeight - cachedPadding);
}

// 当窗口尺寸发生显著变化时，清除 padding 缓存（实际 padding 变化频率很低）
// const clearPaddingCache = () => {
//     cachedPadding = null;
// };

export let mainToolHeight = getMainOperateHeight()
export const heightResizeDispatch = throttle(function () {
    event.dispatch('window_height_resize')
    // 高度变化时已经触发 component_resize，避免重复派发
}, 500)

export const componentResizeDispatch = throttle(function () {
    event.dispatch('component_resize')
}, 500)

window.addEventListener("resize", () => {
    const temp = getMainOperateHeight();
    if (mainToolHeight !== temp) {
        mainToolHeight = temp
        heightResizeDispatch()
    }
    // 无论主操作区高度是否变化，都需要通知组件重新布局
    componentResizeDispatch()
});

export default event




