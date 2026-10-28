<template>
    <HeightResize v-slot="{height}" v-row="'1-1'">
        <Textarea v-model="action.current.input" :placeholder="$t(`main_ui_input`)" :height="height" />
        <Textarea :model-value="output" :placeholder="$t(`main_ui_output`)" :height="height" @success="action.save()" />
    </HeightResize>
</template>

<script lang="ts" setup>
import {initialize, useAction} from "@/store/action";
import {watch} from "vue";
import { composerize } from 'composerize-ts';

const action = useAction(await initialize({
    input: "docker run -p 80:80 -v /var/run/docker.sock:/tmp/docker.sock:ro --restart always --log-opt max-size=1g nginx",
}, {paste: false}))

const output = $computed(() => {
    const input = action.current.input.trim()
    if (input === "") {
        return ""
    }
    try {
        return composerize(input).yaml
    } catch (e) {
        return $error(e)
    }
})

// 只要输入不为空就写入历史（之前误用了 UrlParse 的 URL 校验，
// docker run 命令永远不是合法 URL，保存逻辑从来不会执行）
watch(() => action.current.input, (input) => {
    if ((input || "").trim() !== "") {
        action.save()
    }
}, {immediate: true})
</script>
