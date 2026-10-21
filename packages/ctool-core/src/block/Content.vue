<template>
    <div class="ctool-content">
        <div class="ctool-main-tool">
            <router-view v-if="is"/>
        </div>
    </div>
    <ExtendPage v-model="openSetting">
        <Setting/>
    </ExtendPage>
    <Modal :title="$t('main_ui_prompt')" v-model="pwaUpdate" width="500">
        <Align :horizontal="'center'" top="15" bottom="15">
            {{ $t(`main_new_version_found`) }}
        </Align>
        <template #footer>
            <Button type="primary" long @click="pwaUpdate = false;pwaUpdater?.()" :text="$t(`main_ui_reload`)"/>
        </template>
    </Modal>
</template>

<script setup lang="ts">
import {useRouter} from 'vue-router'
import {onMounted, onUnmounted} from 'vue'
import {report} from '@/helper/stat'
import {RouteMeta} from '@/types'
import {categoryExists, getTool} from '@/config'
import useOperate from '@/store/operate'
import event from "@/event";
import Setting from "@/block/Setting.vue"

const operate = useOperate()
const router = useRouter()
let pwaUpdate = $ref(false)
let pwaUpdater = $ref<(() => void) | null>(null)
let is = $ref(true)
let openSetting = $ref(false)
let serviceWorkerUpdateListener: ((event: Event) => void) | null = null

const openSettingListener = () => {
    openSetting = !openSetting
}

onMounted(() => {
    window.dispatchEvent(new Event('resize'));
    // pwa 更新检测事件
    serviceWorkerUpdateListener = (event: Event) => {
        const updateEvent = event as CustomEvent<{update: () => void}>
        pwaUpdate = true
        pwaUpdater = updateEvent.detail.update
    }
    window.addEventListener('ctool_service_worker_update', serviceWorkerUpdateListener)
    event.addListener('open_setting', openSettingListener)
})

onUnmounted(() => {
    if (serviceWorkerUpdateListener) {
        window.removeEventListener('ctool_service_worker_update', serviceWorkerUpdateListener)
        serviceWorkerUpdateListener = null
    }
    event.removeListener('open_setting', openSettingListener)
})

router.beforeResolve((to) => {
    const meta = to.meta as RouteMeta
    if (meta.type === "tool") {
        const queryCategory = to.query.category?.toString() || ""
        const category = categoryExists(queryCategory) ? queryCategory : getTool(meta.tool).firstCategory().name
        if (!operate.access(meta.tool, meta.feature, category)) {
            return false
        }
        report({_t: meta.type, _c: category, _n: meta.tool, _f: meta.feature, _p: to.name || ""})
    } else {
        report({_t: meta.type, _p: to.name || ""})
    }
})

</script>
<style>
.ctool-content {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 5px;
    overflow: hidden;
}

.ctool-main-tool {
    width: 100%;
    height: 100%;
}
</style>
