import { createRouter, createWebHashHistory, RouteComponent } from "vue-router";
import { ToolRouteConfig, RouteMeta } from "@/types";
import { toolRoutes } from "@/buildDataTemp";
import { getTool } from "@/config";

const routes: {
    name: string,
    path: string,
    component: RouteComponent,
    meta: RouteMeta
}[] = [
    {
        name: "index",
        path: "/",
        component: () => import("@/block/Index.vue"),
        meta: { type: "index" },
    },
    {
        name: "clipboard",
        path: "/clipboard",
        component: () => import("@/block/Clipboard.vue"),
        meta: { type: "other" },
    },
    {
        name: "test",
        path: "/test",
        component: () => import("@/block/Test.vue"),
        meta: { type: "other" },
    },
    ...toolRoutes.map((item: ToolRouteConfig) => {
        // 防御性校验：避免工具或功能不存在时导致路由构建崩溃
        const tool = getTool(item.tool);
        if (!tool) {
            console.error(`路由配置异常: tool=${item.tool}, feature=${item.feature}`);
            return null;
        }
        const feature = tool.getFeature(item.feature);
        if (!feature) {
            console.error(`路由配置异常: tool=${item.tool}, feature=${item.feature}`);
            return null;
        }
        const meta: RouteMeta = { type: "tool", tool: item.tool, feature: item.feature };
        return {
            name: `${item.tool}${item.feature ? `_${item.feature}` : ""}`,
            path: feature.getRouter(),
            meta: meta,
            component: item.component,
        };
    }).filter(Boolean) as any,
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});
router.afterEach((to, from, failure) => {
    if (failure) {
        console.error("路由导航失败:", to, from, failure);
    }
});

export default router;
