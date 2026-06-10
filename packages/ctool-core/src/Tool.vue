<template>
    <Suspense>
        <div class="ctool-global">
            <SimpleHeader v-if="storeSetting.items.layout === `simple`" />
            <ComplexHeader v-else />
            <Content />
            <SimpleBottom v-if="storeSetting.items.layout === `simple`" />
            <ComplexBottom v-else />
        </div>
        <template #fallback>
            <div class="ctool-skeleton">
                <div class="ctool-skeleton-header" />
                <div class="ctool-skeleton-content" />
                <div class="ctool-skeleton-bottom" />
            </div>
        </template>
    </Suspense>
</template>

<script setup lang="ts">
import Content from "@/block/Content.vue";
import Message from "@/helper/message";

import ComplexBottom from "@/block/layout/complex/Bottom.vue";
import ComplexHeader from "@/block/layout/complex/Header.vue";
import SimpleBottom from "@/block/layout/simple/Bottom.vue";
import SimpleHeader from "@/block/layout/simple/Header.vue";
import { loadLanguages } from "@/helper/code";
import platform from "@/helper/platform";
import storage from "@/helper/storage";
import useSetting, { useTheme } from "@/store/setting";
import { isObject } from "lodash";
import { nextTick, onErrorCaptured, onMounted, watch } from "vue";
import { useRouter } from "vue-router";

// 初始化配置
const storeSetting = useSetting();
const router = useRouter();
// 初始化主题
useTheme();

// 预加载 Monaco 语言列表，避免后续工具页面使用时阻塞
loadLanguages();

watch(
    () => {
        return {
            layout: storeSetting.items.layout,
        };
    },
    async () => {
        await nextTick();
        window.dispatchEvent(new Event("resize"));
    },
);

// 全局错误提示
const globalErrorMessage = (err: any) => {
    console.log("error:", err);
    const message: string = (isObject(err) && "message" in err ? err.message : err).toString();
    Message.closeAll();
    if (message.includes("\n")) {
        Message.error(`${message}`, { duration: 0 });
    } else {
        Message.error(message, { duration: 5000 });
    }
};

// Uncaught Promise Error
window.addEventListener("unhandledrejection", function(event) {
    event.preventDefault();
    globalErrorMessage(event.reason);
});

// Uncaught Error
window.addEventListener("error", event => {
    event.preventDefault();
    globalErrorMessage(event.error);
});

onErrorCaptured(err => {
    globalErrorMessage(err);
    return false;
});

onMounted(() => {
    platform.runtime.initialize(storage, router);
});
</script>
<style>
.ctool-global {
    height: 100vh;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0px, 1fr) auto;
}

.ctool-skeleton {
    height: 100vh;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0px, 1fr) auto;
    background-color: var(--background-color);
}

.ctool-skeleton-header {
    height: 33px;
    background-color: var(--ctool-block-title-bg-color);
    border-bottom: solid 1px var(--ctool-border-color);
}

.ctool-skeleton-content {
    background-color: var(--background-color);
}

.ctool-skeleton-bottom {
    height: 33px;
    background-color: var(--ctool-block-title-bg-color);
    border-top: solid 1px var(--ctool-border-color);
}
</style>
