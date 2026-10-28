<template>
    <div class="ctool-page-option" style="margin-bottom: 5px" v-row="`1-1`">
        <Display>
            <Textarea :height="80" v-model="action.current.input" :placeholder="$t('regex_expression')" />
            <template #extra>
                <Align>
                    <Dropdown
                        :size="'small'"
                        :options="getCommonExpression()"
                        :placeholder="$t('regex_common')"
                        @select="value => (action.current.input = value)"
                    />
                    <Button
                        :size="'small'"
                        :type="'primary'"
                        @click="showReference = !showReference"
                        :text="$t(`main_ui_reference`)"
                    />
                </Align>
            </template>
        </Display>
        <Display>
            <Textarea
                :disabled="action.current.is_delete"
                :height="80"
                v-model="action.current.replace"
                :placeholder="$t('regex_replace_content')"
            />
            <template #extra>
                <Bool border :size="'small'" v-model="action.current.is_delete" :label="$t('regex_delete')" />
            </template>
        </Display>
    </div>
    <HeightResize v-slot="{ height }" :append="['.ctool-page-option']" v-row="`1-1`">
        <Display>
            <Editor :height="height" v-model="action.current.content" :placeholder="$t('regex_input')" />
            <template #extra>
                <Align>
                    <Bool border :size="'small'" v-model="action.current.is_global" :label="$t('regex_global')" />
                    <Bool
                        border
                        :size="'small'"
                        v-model="action.current.is_ignore_case"
                        :label="$t('regex_ignore_case')"
                    />
                </Align>
            </template>
        </Display>
        <Editor :height="height" :model-value="output" :placeholder="$t('main_ui_output')" />
    </HeightResize>
    <ExtendPage v-model="showReference">
        <Reference />
    </ExtendPage>
</template>

<script lang="ts" setup>
import Editor from "@/components/editor/Editor.vue";
import { initialize, useAction } from "@/store/action";
import { getCommonExpression } from "@/tools/regex/util";
import { debounce } from "lodash";
import { onUnmounted, watch } from "vue";
import Reference from "./Reference.vue";
import { RegexResult, RegexTask, runRegex } from "./run";

const action = useAction(
    await initialize(
        {
            input: "[\\dheo]",
            content: new Date().getFullYear() + " hello WORLD 你好世界",
            replace: "",
            is_global: true,
            is_ignore_case: true,
            is_delete: false,
        },
        { paste: false },
    ),
);

let output = $ref("");
let showReference = $ref(false);

// 单个任务的最长执行时间，超时基本就是出现了灾难性回溯
const RUN_TIMEOUT = 2000;

let requestId = 0;
let runTimer: ReturnType<typeof setTimeout> | null = null;
let worker: Worker | null = null;

const formatResult = (result: RegexResult): string => {
    // 替换模式直接返回结果
    if (result.output !== null) {
        return result.output;
    }
    const matches = result.matches ?? [];
    if (matches.length < 1) {
        return $t("regex_output_empty");
    }
    let string = `${$t("regex_output_count", [matches.length])}`;
    for (const item of matches) {
        string += `\n${item}`;
    }
    return string;
};

const clearRunTimer = () => {
    if (runTimer !== null) {
        clearTimeout(runTimer);
        runTimer = null;
    }
};

const onWorkerMessage = (event: MessageEvent) => {
    const data = event.data;
    // 丢弃过期结果（输入已经变化）
    if (!data || data.id !== requestId) {
        return;
    }
    clearRunTimer();
    if (!data.ok) {
        output = $error(data.message || "regex error");
        return;
    }
    output = formatResult(data.data);
};

const createWorker = () => {
    const instance = new Worker(new URL("./worker", import.meta.url), { type: "module" });
    instance.onmessage = onWorkerMessage;
    instance.onerror = (event) => {
        clearRunTimer();
        output = $error(event.message || "regex worker error");
    };
    return instance;
};

try {
    worker = createWorker();
} catch (e) {
    // 部分 WebView 不支持 worker，退化为同步执行
    worker = null;
}

onUnmounted(() => {
    clearRunTimer();
    worker?.terminate();
    worker = null;
});

const run = (task: RegexTask) => {
    requestId++;
    const id = requestId;
    clearRunTimer();
    if (worker === null) {
        try {
            output = formatResult(runRegex(task));
        } catch (e) {
            output = $error(e);
        }
        return;
    }
    runTimer = setTimeout(() => {
        runTimer = null;
        // 卡住的 worker 无法取消，只能终止后重建
        worker?.terminate();
        worker = createWorker();
        if (id === requestId) {
            output = $t("regex_output_timeout");
        }
    }, RUN_TIMEOUT);
    worker.postMessage({ method: "run", id, task });
};

// 输入变化很频繁，合并一下再执行，避免每次按键都跑一遍正则
const runDebounce = debounce((task: RegexTask) => run(task), 150);

watch(
    () => action.current,
    current => {
        output = "";
        if (!current.input || !current.content) {
            return;
        }
        action.save();
        const replace =
            !current.is_delete && current.replace === "" ? null : current.is_delete ? "" : current.replace;
        runDebounce({
            pattern: current.input,
            flags: (current.is_ignore_case ? "i" : "") + (current.is_global ? "g" : ""),
            content: current.content,
            replace,
        });
    },
    { immediate: true, deep: true },
);
</script>
