import {MessageType, MessageOption, MessageMethod} from '@/types'
import {h, render, VNode} from 'vue'
import Message from '@/components/Message.vue'

const containers = new Map<HTMLElement, {
    vNode: VNode,
    attr: {
        type: MessageType,
        info: string,
        offset: number,
        duration: number,
    }
}>();
const destroying = new WeakSet<HTMLElement>();
const durationTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

// 缓存消息挂载容器，避免每次 open 都查询 DOM
let appendContainer: HTMLElement | null = null;
const getAppendContainer = (): HTMLElement | null => {
    if (!appendContainer) {
        appendContainer = document.querySelector('#ctool-append');
    }
    return appendContainer;
};

// 缓存每个消息容器的高度，避免每次计算 offset 都查询 DOM
const containerHeights = new WeakMap<HTMLElement, number>();

const closeAll = () => {
    for (let instance of Array.from(containers.keys())) {
        destroy(instance)
    }
}

const destroy = (container: HTMLElement) => {
    if (!containers.has(container) || destroying.has(container)) {
        return;
    }
    destroying.add(container);
    const durationTimer = durationTimers.get(container);
    if (durationTimer) {
        clearTimeout(durationTimer);
        durationTimers.delete(container);
    }
    // 关闭
    (containers.get(container)?.vNode as VNode).component?.exposed?.exposeClose();
    // 等待关闭动画完成
    setTimeout(() => {
        // 销毁
        render(null, container);
        // 移除dom
        container.remove()
        containers.delete(container)
        containerHeights.delete(container);
        durationTimers.delete(container);
    }, 300)
}

const open = (type: MessageType, info: string, {offset = 16, duration = 3000}: MessageOption = {}) => {
    const container = document.createElement("div") as HTMLElement
    const parent = getAppendContainer();
    if (!parent) {
        console.error('Message 挂载容器 #ctool-append 不存在');
        return;
    }
    parent.appendChild(container)

    // 计算总偏移：累加所有已存在消息的高度与间距。
    let totalOffset = offset;
    for (const [el, item] of containers.entries()) {
        let height = containerHeights.get(el);
        if (height === undefined) {
            height = el.querySelector(".ctool-message")?.clientHeight || 0;
            containerHeights.set(el, height);
        }
        totalOffset += item.attr.offset + height;
    }

    const instance = h(
        Message,
        {
            type,
            info,
            offset: totalOffset,
            duration,
            close: () => {
                destroy(container)
            }
        }
    );

    // 渲染
    render(instance, container);
    // 打开
    instance.component?.exposed?.open();
    // 保存列表
    containers.set(container, {
        vNode: instance,
        attr: {
            type,
            info,
            offset,
            duration
        },
    })
    // 延迟关闭
    if (duration > 0) {
        durationTimers.set(container, setTimeout(() => {
            durationTimers.delete(container);
            destroy(container)
        }, duration))
    }
}

const method: MessageMethod = {
    closeAll,
    success(info: string, options?: MessageOption) {
        open('success', info, options)
    },
    error(info: string, options?: MessageOption) {
        open('error', info, options)
    },
    info(info: string, options?: MessageOption) {
        open('info', info, options)
    }
}


export default method
