import { createApp, nextTick } from "vue";
import { pinia } from "@/helper/pinia";
import platform from "@/helper/platform";
import ctool from "@/helper/plugin";
import router from "@/helper/router";
import "@/statics/style.css";
// 启动骨架样式由 tool.html 以 <link rel="stylesheet"> 引入（不能内联，见 boot.css 顶部说明），
// 这里不再 import，避免同一份样式被重复打包。
import Tool from "@/Tool.vue";
import { initPermission as initClipboardPermission } from "@/helper/clipboard";

// 首屏启动骨架（tool.html 里的 #ctool-boot）
// 最短展示时长：避免快网下骨架一闪而过
const BOOT_MIN_VISIBLE = 320;
// 与 boot.css 中 .ctool-boot--done 的 transition 时长保持一致
const BOOT_FADE = 200;
// 等待首屏内容出现的上限，超时也撤下骨架
const BOOT_READY_TIMEOUT = 1200;

// 本模块执行时骨架已经可见，用 navigation timing 的 responseEnd 近似骨架出现的时刻
const bootStartTime = (() => {
    const [navigation] = performance.getEntriesByType
        ? (performance.getEntriesByType("navigation") as PerformanceNavigationTiming[])
        : [];
    return navigation?.responseEnd || performance.now();
})();

// 等待一帧（两帧更稳）确保真实界面已经上屏。
// requestAnimationFrame 在后台标签页/被遮挡窗口里会被暂停，所以不能只靠它，
// 必须与超时竞争，否则骨架可能一直留在页面上。
const waitPainted = () => new Promise<void>(resolve => {
    const done = () => resolve();
    const timer = setTimeout(done, 150);
    requestAnimationFrame(() => requestAnimationFrame(() => {
        clearTimeout(timer);
        done();
    }));
});

// 等真实界面先出现：首屏路由组件是懒加载的，mount 完成时内容区还是空的。
// 内容区如果挂着 <Suspense> 的骨架（#app .ctool-boot），视觉上和首屏骨架一致，也可以直接交接。
const waitAppContent = () =>
    new Promise<void>(resolve => {
        const app = document.getElementById("app");
        const ready = () =>
            !!document.querySelector("#app .ctool-main-tool > *") || !!document.querySelector("#app .ctool-boot");
        if (!app || ready()) {
            resolve();
            return;
        }
        const done = () => {
            clearTimeout(timer);
            observer.disconnect();
            resolve();
        };
        const observer = new MutationObserver(() => {
            if (ready()) {
                done();
            }
        });
        observer.observe(app, { childList: true, subtree: true });
        // 路由异常/内容永远不会出现时的兜底，避免骨架一直盖住页面
        const timer = setTimeout(done, BOOT_READY_TIMEOUT);
    });

const removeBoot = (() => {
    let removed = false;
    return () => {
        if (removed) {
            return;
        }
        removed = true;
        document.getElementById("ctool-boot")?.remove();
        // 骨架样式是外链文件，保留即可：<Suspense> 的 fallback（Boot.vue）还要用
    };
})();

const hideBoot = () => {
    const boot = document.getElementById("ctool-boot");
    if (!boot) {
        return;
    }
    const fade = () => {
        boot.classList.add("ctool-boot--done");
        boot.addEventListener("transitionend", removeBoot, { once: true });
        // transitionend 不触发时（reduced-motion / 元素已不可见）的兜底
        setTimeout(removeBoot, BOOT_FADE + 100);
    };
    const wait = BOOT_MIN_VISIBLE - (performance.now() - bootStartTime);
    if (wait > 0) {
        setTimeout(fade, wait);
    } else {
        fade();
    }
};

(async () => {
    try {
        await initClipboardPermission();
    } catch (e) {
        console.error('剪贴板权限初始化失败:', e);
    }
    if (typeof document !== 'undefined' && (document.body.clientWidth > 850 || platform.isUtools() || platform.isWeb() || platform.isDesktop())) {
        const page = document.getElementById("ctool");
        if (page) {
            page.style.width = "auto";
            page.style.height = "auto";
        }
    }
    const app = createApp(Tool);
    app.use(pinia).use(router).use(ctool).mount("#app");
    // 首屏路由组件是懒加载的，mount 完成时 router-view 还是空的，
    // 所以要等路由就绪 + 两帧渲染，确保真实界面已经上屏，再撤下骨架
    router
        .isReady()
        .catch(e => {
            console.error('路由初始化失败:', e);
        })
        .then(() => nextTick())
        .then(waitAppContent)
        .then(waitPainted)
        .finally(hideBoot);
})();
