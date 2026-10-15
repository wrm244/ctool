<template>
    <!-- 同 Encrypt.vue：需要真实 DOM 根节点，避免 vnode.el 为 null -->
    <div class="ctool-triple-des">
        <Decrypt type="tripleDES" />
    </div>
</template>

<script lang="ts" setup>
import Decrypt from "../des/Decrypt.vue"
</script>

<style scoped>
.ctool-triple-des {
    width: 100%;
    height: 100%;
}
</style>
