<template>
    <!-- 外层使用真实 DOM 作为根节点：des/Encrypt.vue 为异步组件且 HeightResize 初始无内容，
         若本组件没有真实根元素，其 vnode.el 会一直为 null，导致 vue-router 的
         vnode.el.getRootNode() 报错 -->
    <div class="ctool-triple-des">
        <Encrypt type="tripleDES" />
    </div>
</template>

<script lang="ts" setup>
import Encrypt from "../des/Encrypt.vue"
</script>

<style scoped>
.ctool-triple-des {
    width: 100%;
    height: 100%;
}
</style>
