<template>
    <div style="display: inline-flex;">
        <Input
            size="small"
            :width="150"
            :placeholder="$t(`main_search_placeholder`)"
            v-model="input"
            @load="load"
            @keyup.enter="keyupEnter"
            @keyup.up="keyupUp"
            @keyup.down="keyupDown"
            @keyup.esc="close"
        >
            <template #suffix>
                <span class="ctool-search-shortcut" v-if="input === ''">{{ shortcutLabel }}</span>
                <Icon name="search" :size="12"/>
            </template>
        </Input>
        <ul class="ctool-search-block" v-if="isInput" ref="container">
            <li
                v-for="(item,index) in items"
                :class="index === selectIndex ? `ctool-search-active` : ''"
                @click="select(index)"
                :key="`${item.tool}-${item.feature}`"
                @mouseover="selectIndex = index"
            >{{ item.label }}
            </li>
        </ul>
    </div>
</template>
<script setup lang="ts">
import {toolKeywords} from "@/buildDataTemp";
import {getTool, FeatureInterface} from "@/config";
import useOperate from "@/store/operate";
import useSetting from "@/store/setting";
import {nextTick, onMounted, onUnmounted, watch} from "vue";

const setting = useSetting()
const operate = useOperate()
let container = $ref<HTMLElement | null>(null);
let input = $ref("")
let inputElement = $ref<HTMLInputElement | null>(null);
let isInput = $ref(false);
let selectIndex = $ref(0)

// 搜索索引：关键字表是构建期产物，运行期不会变化，预先转小写避免每次输入重复 join/toLowerCase
const searchIndex = toolKeywords.map((item) => ({
    item,
    terms: item.search.map((term) => term.toLowerCase()),
}))

// 快捷键提示：macOS 显示 ⌘K，其余平台显示 Ctrl+K
const shortcutLabel = /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl+K"

const items = $computed(() => {
    let lists: FeatureInterface[]
    if (input === "") {
        lists = [
            ...(new Set(
                    [
                        ...operate.getRecently(),
                        ...setting.items.common.map(name => {
                            return getTool(name).firstFeature()
                        })
                    ]
                )
            )
        ]
    } else {
        // 逐个关键字匹配，避免 join 后跨关键字边界的误匹配（例如输入 "h,md"）
        const query = input.toLowerCase()
        lists = searchIndex
            .filter(({terms}) => terms.some((term) => term.includes(query)))
            .map(({item}) => getTool(item.name).getFeature(item.feature))
    }
    if (lists.length === 0) {
        return [{label: $t(`main_ui_null`), tool: "", feature: ""}]
    }
    return lists.slice(0, 15).map(feature => {
        const tool = feature.tool
        return {
            label: `${$t(`tool_${tool.name}`)}${tool.isSimple() ? `` : ` - ${$t(`tool_${tool.name}_${feature.name}`)}`}`,
            tool: tool.name,
            feature: feature.name
        }
    })
})

const open = () => {
    isInput = true
    selectIndex = 0
}

const close = () => {
    input = ""
    isInput = false
    selectIndex = 0
}

const focusHandler = () => open();
const documentClickHandler = (e: MouseEvent) => {
    if (
        inputElement?.contains(e.target as any)
        || container?.contains(e.target as any)
    ) {
        return;
    }
    close()
};

const load = (element: HTMLInputElement) => {
    inputElement = element
    element.addEventListener("focus", focusHandler);
    document.addEventListener("click", documentClickHandler);
}

// 判断焦点是否在可输入元素内：在输入框里按 "/" 应该输入字符而不是唤起搜索
const isTypingTarget = (target: EventTarget | null): boolean => {
    const element = target as HTMLElement | null
    if (!element || !element.tagName) {
        return false
    }
    const tagName = element.tagName.toLowerCase()
    return tagName === "input" || tagName === "textarea" || tagName === "select" || element.isContentEditable
}

// 快捷键唤起搜索：⌘K / Ctrl+K 全局可用，"/" 仅在非输入状态下生效
const shortcutHandler = (e: KeyboardEvent) => {
    if (e.altKey || e.isComposing) {
        return
    }
    const isSearchKey = (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "k"
    const isSlashKey = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !isTypingTarget(e.target)
    if (!isSearchKey && !isSlashKey) {
        return
    }
    // 已经聚焦在搜索框内，交给浏览器默认行为
    if (e.target === inputElement) {
        return
    }
    e.preventDefault()
    open()
    // 首次按键时输入框可能还没完成挂载，下一帧再聚焦
    nextTick(() => {
        inputElement?.focus()
        inputElement?.select()
    })
}

onMounted(() => {
    document.addEventListener("keydown", shortcutHandler);
});

onUnmounted(() => {
    document.removeEventListener("keydown", shortcutHandler);
    inputElement?.removeEventListener("focus", focusHandler);
    document.removeEventListener("click", documentClickHandler);
});

const select = (index: number) => {
    if (items.length === 0 || items.length - 1 < index) {
        return;
    }
    const {tool, feature} = items[index]
    const keyword = input
    if (tool !== "") {
        operate.redirectTool(tool, feature, '', '', keyword)
    }
    inputElement?.blur();
    close();
}

const keyupEnter = () => {
    select(selectIndex)
}
const keyupUp = () => {
    if (items.length === 0) {
        return;
    }
    selectIndex = selectIndex === 0 ? items.length - 1 : selectIndex - 1
}
const keyupDown = () => {
    if (items.length === 0) {
        return;
    }
    selectIndex = selectIndex === items.length - 1 ? 0 : selectIndex + 1
}

watch(() => input, () => selectIndex = 0, {immediate: true})
</script>

<style>
.ctool-search-shortcut {
    font-size: 11px;
    line-height: 1;
    color: var(--form-element-placeholder-color);
    border: 1px solid var(--ctool-border-color);
    border-radius: 3px;
    padding: 1px 3px;
    white-space: nowrap;
}

.ctool-search-block {
    z-index: 99;
    position: fixed;
    top: 28px;
    font-size: .875rem;
    width: 165px;
    display: flex;
    flex-direction: column;
    border: var(--border-width) solid var(--dropdown-border-color);
    border-radius: var(--border-radius);
    background-color: var(--dropdown-background-color);
    box-shadow: var(--card-box-shadow);
    color: var(--dropdown-color);
    white-space: nowrap;
    font-style: normal;
    margin-bottom: 0px;
    padding: 5px 0 0;
}

.ctool-search-block li {
    cursor: pointer;
    list-style: none;
    width: 100%;
    color: var(--dropdown-color);
    padding-left: 10px;
    line-height: 1.9rem;
    margin-bottom: 0;
}

.ctool-search-block li.ctool-search-active {
    background-color: var(--dropdown-hover-background-color);
}
</style>
