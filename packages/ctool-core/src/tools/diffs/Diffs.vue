<template>
    <HeightResize v-slot="{ height }">
        <Diff
            v-model:original="action.current.original"
            v-model:modified="action.current.modified"
            :lang="action.current.option.lang"
            :height="`${height}px`"
        >
            <Select size="small" v-model="action.current.option.lang" :options="allLanguage" />
        </Diff>
    </HeightResize>
</template>
<script lang="ts" setup>
import { ref, watch } from "vue";
import { initialize, useAction } from "@/store/action";
import { getAllLanguage, loadLanguages } from "@/helper/code";
import Diff from "@/components/editor/Diff.vue";

// 语言列表依赖 Monaco 加载完成：不阻塞页面渲染，加载完成后响应式更新下拉选项
const allLanguage = ref<string[]>(getAllLanguage());
loadLanguages().then(() => {
    allLanguage.value = getAllLanguage();
});

type DataType = {
    original: string;
    modified: string;
    option: {
        lang: string;
    };
};
const action = useAction(
    await initialize<DataType>(
        {
            original: "",
            modified: "",
            option: {
                lang: "Text",
            },
        },
        { paste: false },
    ),
);

// 数据保存
watch(
    () => action.current,
    () => {
        if (action.current.original === "" || action.current.modified === "") {
            return;
        }
        action.save();
    },
    { deep: true },
);
</script>
<style></style>
