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
import platform from "@/helper/platform";
import storage from "@/helper/storage";
import useSetting, { useTheme } from "@/store/setting";
import { nextTick, onErrorCaptured, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";

// 初始化配置
const storeSetting = useSetting();
const router = useRouter();
// 初始化主题
useTheme();

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

// 全局错误提示：安全提取错误信息，避免 null/undefined 导致崩溃
const globalErrorMessage = (err: any) => {
    console.log("error:", err);
    // 优先使用 Error 实例的 message，其他情况安全转换为字符串
    const message: string = err instanceof Error ? err.message : String(err ?? '');
    Message.closeAll();
    if (message.includes("\n")) {
        Message.error(`${message}`, { duration: 0 });
    } else {
        Message.error(message, { duration: 5000 });
    }
};

// Uncaught Promise Error
const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    event.preventDefault();
    globalErrorMessage(event.reason);
};

// Uncaught Error
const handleError = (event: ErrorEvent) => {
    event.preventDefault();
    globalErrorMessage(event.error);
};

window.addEventListener("unhandledrejection", handleUnhandledRejection);
window.addEventListener("error", handleError);

onErrorCaptured(err => {
    globalErrorMessage(err);
    // 开发环境保留错误冒泡，便于调试；生产环境阻止继续传播
    return import.meta.env.DEV;
});

onMounted(() => {
    platform.runtime.initialize(storage, router);
});

onUnmounted(() => {
    // 组件卸载时移除全局事件监听，防止内存泄漏和重复处理
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    window.removeEventListener("error", handleError);
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
