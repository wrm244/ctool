<template>
    <HeightResize v-slot="{height,small,large}" :reduce="5" ignore v-row="`1-300px`">
        <Align direction="vertical">
            <TextInput
                :allow="['base64','hex','upload','url']"
                v-model="action.current.input"
                :height="small"
                upload="image"
            />
            <Textarea :model-value="output" :placeholder="$t(`main_ui_output`)" :height="large"/>
        </Align>
        <Card :height="height+5">
            <Align horizontal="center" vertical="center">
                <img v-if="action.current.input.text.isImage()" style="max-width: 90%;max-height: 90%;" :src="action.current.input.text.toDataUrl()"/>
                <Exception v-else/>
            </Align>
        </Card>
    </HeightResize>
</template>

<script lang="ts" setup>
import {initialize, useAction} from "@/store/action";
import {createTextInput} from "@/components/text";
import {parser} from './util'
import {watch} from "vue";
import {debounce} from "lodash";

const action = useAction(await initialize({
    input: createTextInput('upload'),
}, {paste: false}))

let output = $ref("")
// 解码是异步且可能重叠的，用递增版本号丢弃过期结果，避免旧结果覆盖新结果
let parseVersion = 0

const parse = (text) => {
    const version = ++parseVersion
    parser(text).then((data) => {
        if (version !== parseVersion) {
            return
        }
        output = data
        action.save()
    }).catch((e) => {
        if (version !== parseVersion) {
            return
        }
        output = $error(e)
    })
}

// 输入框每次提交都会换一个 Text 实例，防抖一下避免每敲一个字符就整图解码一次
const parseDebounce = debounce(parse, 200)

watch(() => action.current.input.text, (text) => {
    if (text.isEmpty() || text.isError()) {
        parseVersion++
        return output = text.toString()
    }
    if (!text.isImage()) {
        parseVersion++
        return output = $t('qrCode_reader_parsing_failure')
    }
    parseDebounce(text)
}, {immediate: true, deep: true})
</script>
