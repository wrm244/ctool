<template>
    <Display
        :position="props.toolbar"
        :right="35"
        class="ctool-code-diff"
        :style="{ height: `${sizeConvert(props.height)}`, width: `100%` }"
        toggle
    >
        <div ref="container" style="height: 100%; width: 100%"></div>
        <template #extra>
            <Align>
                <Input
                    size="small"
                    center
                    :disabled="changes === 0"
                    :model-value="`${changes ? currentChange : 0} / ${changes}`"
                    :width="110"
                >
                    <template #prepend>
                        <Button :disabled="changes === 0 || currentChange === 1" text="<" @click="location('prev')" />
                    </template>
                    <template #append>
                        <Button
                            :disabled="changes === 0 || currentChange === changes"
                            text=">"
                            @click="location('next')"
                        />
                    </template>
                </Input>
                <Bool v-model="inline" :label="$t(`component_editor_inline`)" size="small" border />
                <slot></slot>
            </Align>
        </template>
    </Display>
</template>
<script lang="ts" setup>
// 代码编辑器
import { monacoInit, ContextMenu, monacoInstance, monacoEditor } from "./monaco";
import PlaceholderContentWidget from "./placeholderContentWidget";
import { onUnmounted, onMounted, watch, PropType, ref, shallowRef } from "vue";
import { getEditorLanguage } from "@/helper/code";
import { DisplayPosition } from "@/types";
import { useTheme } from "@/store/setting";
import { sizeConvert } from "../util";
import event from "@/event";

const original = defineModel<string>("original", {
    default: "",
});
const modified = defineModel<string>("modified", {
    default: "",
});

const props = defineProps({
    toolbar: {
        type: String as PropType<DisplayPosition>,
        default: "bottom-right",
    },
    lang: {
        type: String as PropType<string>,
        default: "text",
    },
    height: {
        type: [String, Number],
        default: "100%",
    },
    disableLineWrapping: {
        type: Boolean,
        default: false,
    },
    disableBorder: {
        type: Boolean,
        default: false,
    },
    disableLineNumbers: {
        type: Boolean,
        default: false,
    },
    disableClear: {
        type: Boolean,
        default: false,
    },
});

const storeTheme = useTheme();
const container = ref<HTMLElement | null>(null);
const editorView = shallowRef<monacoEditor.editor.IDiffEditor | null>(null);
// 手动创建的 model 不归 diff editor 所有，需记录并在卸载时释放
const ownedModels: monacoEditor.editor.ITextModel[] = [];
// 组件是否已卸载：避免 monacoInit 异步完成后再创建编辑器造成实例泄漏
let disposed = false;

const lineWrapping = ref(!props.disableLineWrapping);
const lineNumbers = ref(!props.disableLineNumbers);

const changes = ref<number>(0);
const currentChange = ref<number>(1);

const inline = ref(false);

const updateEditorConfig = async () => {
    if (!editorView.value) {
        return;
    }
    [editorView.value.getOriginalEditor(), editorView.value.getModifiedEditor()].forEach(editor => {
        const model = editor.getModel();
        // 设置语言
        model && monacoInstance()?.editor.setModelLanguage(model, getEditorLanguage(props.lang).id);
    });
    
    editorView.value.updateOptions({
        renderSideBySide: !inline.value,
    });
    
    // 主题
    monacoInstance()?.editor.setTheme(storeTheme.theme.raw === "dark" ? "vs-dark" : "vs");
};

const create = async (element: HTMLElement) => {
    if (editorView.value) {
        editorView.value.dispose();
    }
    monacoInit({
        "vs/nls": { availableLanguages: { "*": $t("main_locale") === "zh_CN" ? "zh-cn" : "en" } },
    }).then(monaco => {
        // 组件已卸载则不再创建编辑器
        if (disposed) {
            return;
        }
        const originalModel = monaco.editor.createModel(original.value);
        const modifiedModel = monaco.editor.createModel(modified.value);
        ownedModels.push(originalModel, modifiedModel);
        
        const diffEditor = monaco.editor.createDiffEditor(element, {
            lineNumbers: lineNumbers.value ? "on" : "off",
            wordWrap: lineWrapping.value ? "on" : "off",
            minimap: { enabled: false },
            // 与 Editor.vue 保持一致：自动监听容器尺寸变化重排，
            // 否则容器在创建后尺寸变化时 original 面板可能宽度为 0（只剩右半边）
            automaticLayout: true,
            originalEditable: true,
            scrollBeyondLastLine: false,
            renderSideBySide: !inline.value,
            // Monaco 默认在容器较窄（< renderSideBySideInlineBreakpoint，默认 900px）时
            // 自动退回内联视图，导致 original 面板被压缩得几乎不可见（看起来只剩一个编辑框）。
            // 这里禁用该自动行为，交由组件的「内联模式」开关显式控制。
            useInlineViewWhenSpaceIsLimited: false,
            // 禁用行内 hunk 菜单（DiffEditorGutter）。该功能在模型内容被清空/大幅收缩时，
            // 会用还未重算的旧 diff 映射去计算行位置，触发 Monaco 内部
            // "Illegal value for lineNumber"（getBottomForLineNumber -> getLineMaxColumn）。
            // 本工具的 UI 未使用该侧边栏菜单，保留 renderMarginRevertIcon 的回退箭头即可。
            renderGutterMenu: false,
            enableSplitViewResizing: false,
            scrollbar: {
                verticalScrollbarSize: 5,
            },
        });

        diffEditor.setModel({
            original: originalModel,
            modified: modifiedModel,
        });
        
        // 内容更新
        diffEditor.getOriginalEditor().onDidChangeModelContent(() => {
            if (diffEditor.getOriginalEditor().getValue() !== original.value) {
                original.value = diffEditor.getOriginalEditor().getValue();
            }
        });
        
        diffEditor.getModifiedEditor().onDidChangeModelContent(() => {
            if (diffEditor.getModifiedEditor().getValue() !== modified.value) {
                modified.value = diffEditor.getModifiedEditor().getValue();
            }
        });
        
        [diffEditor.getOriginalEditor(), diffEditor.getModifiedEditor()].forEach(editor => {
            // placeholder
            new PlaceholderContentWidget($t("main_ui_input"), editor);
            // 右键菜单
            const contextMenu = new ContextMenu(editor);
            contextMenu.setHandle("ctool_line_wrapping", (_ed, _id, result) => (lineWrapping.value = result));
            contextMenu.setHandle("ctool_line_number", (_ed, _id, result) => (lineNumbers.value = result));
        });
        diffEditor.onDidUpdateDiff(() => {
            changes.value = diffEditor.getLineChanges()?.length || 0;
            currentChange.value = 1;
        });
        
        editorView.value = diffEditor;
        // 编辑器配置
        updateEditorConfig();
    });
};

const location = (type: "prev" | "next") => {
    const lineChanges = editorView.value?.getLineChanges() || [];
    let current = type === "prev" ? currentChange.value - 1 : currentChange.value + 1;
    const change = lineChanges.at(current - 1);
    if (!change) {
        return;
    }
    editorView.value?.revealLineInCenter(change.originalEndLineNumber);
    currentChange.value = current;
};

onMounted(async () => {
    if (!props.disableClear) {
        clearContentListener = () => updateEditor();
        event.addListener("content_clear", clearContentListener);
    }
    await create(<HTMLElement>container.value);
});

onUnmounted(() => {
    disposed = true;
    editorView.value?.dispose();
    // 释放手动创建的 model，避免重复挂载/卸载时内存泄漏
    for (const model of ownedModels) {
        if (!model.isDisposed()) {
            model.dispose();
        }
    }
    ownedModels.length = 0;
    // 清理未完成的回写定时器，防止内存泄漏
    if (pendingDiffTimer) {
        clearInterval(pendingDiffTimer);
        pendingDiffTimer = null;
    }
    // 移除 content_clear 监听器
    if (clearContentListener) {
        event.removeListener("content_clear", clearContentListener);
        clearContentListener = null;
    }
});

// content_clear 事件监听器引用，用于卸载时移除防止内存泄漏
let clearContentListener: (() => void) | null = null;

const updateEditor = (original = "", modified = "") => {
    if (!editorView.value) {
        return;
    }
    if (editorView.value.getOriginalEditor().getValue() !== original) {
        editorView.value.getOriginalEditor().setValue(original);
    }
    if (editorView.value.getModifiedEditor().getValue() !== modified) {
        editorView.value.getModifiedEditor().setValue(modified);
    }
};

// 回写内容
let pendingDiffTimer: ReturnType<typeof setInterval> | null = null;

watch(
    () => {
        return {
            original: original.value,
            modified: modified.value,
        };
    },
    value => {
        // 清理旧定时器，避免多次 watch 触发时累积
        if (pendingDiffTimer) {
            clearInterval(pendingDiffTimer);
            pendingDiffTimer = null;
        }
        if (editorView.value) {
            return updateEditor(value.original, value.modified);
        }

        // 防止初始内容变更 编辑器还没有初始化成功
        pendingDiffTimer = setInterval(() => {
            if (editorView.value) {
                updateEditor(value.original, value.modified);
                clearInterval(pendingDiffTimer!);
                pendingDiffTimer = null;
            }
        }, 50);
    },
);

// 初始化重新编辑器
watch(
    () => {
        return {
            color: storeTheme.theme.raw,
            lang: props.lang,
            inline: inline.value,
        };
    },
    () => updateEditorConfig(),
);
</script>
<style>
.ctool-code-diff {
    border-color: var(--ctool-border-color);
    border-style: solid;
    border-width: 1px;
    border-radius: 3px;
    overflow: hidden;
}
</style>
