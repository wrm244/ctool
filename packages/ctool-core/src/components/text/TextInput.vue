<template>
    <Display :position="useInput ? 'right-center' : 'top-right'" :toggle="!useInput" :style="style">
        <template v-if="current.type !== 'upload'">
            <Textarea v-if="!useInput" v-model="current.value" :disabled="disabled" :placeholder="placeholder" />
            <Input
                v-else
                v-model="current.value"
                :placeholder="placeholder"
                :disabled="disabled"
                :label="useInput !== true ? useInput : ''"
            />
        </template>
        <Card v-else style="height: 100%">
            <Align direction="vertical" horizontal="center" vertical="center">
                <UploadFile v-model="current.value" buttonType="text" :type="upload" />
                <div
                    style="
                        font-size: 0.75rem;
                        color: var(--ctool-placeholder-text-color);
                        display: inline-flex;
                        align-items: center;
                        gap: 5px;
                    "
                >
                    <template v-if="current.type === `upload` && !current.text.isEmpty()">
                        <Icon name="right" :size="14" />
                        {{ current.text.name() || "" }}
                        <template v-if="current.text.isImage()">
                            {{ current.text.imageSizeString ? `(${current.text.imageSizeString})` : "" }}
                        </template>
                    </template>
                    <template v-else>
                        {{ $t(`component_upload_support_paste`) }}
                    </template>
                </div>
            </Align>
        </Card>
        <template #extra>
            <Align>
                <Select
                    size="small"
                    :disabled="disabled"
                    :options="encodings"
                    v-model="current.option.text.encoding"
                    v-if="encoding && current.type === 'text'"
                />
                <Bool
                    size="small"
                    v-model="current.option.hex.preserve_line_breaks"
                    :label="$t('component_content_type_hex_preserve_line_breaks')"
                    v-if="current.type === 'hex' && isString(current.value) && current.value.includes('\n')"
                />
                <Select
                    size="small"
                    :disabled="disabled"
                    :model-value="current.type"
                    @change="
                        value => {
                            current.type = value;
                            current.value = ``;
                            current.text = Text.empty();
                        }
                    "
                    v-if="typeLists.length > 1"
                    :options="
                        typeLists.map(item => {
                            return {
                                value: item,
                                label: $t(`component_content_type_${item}`),
                            };
                        })
                    "
                />
                <slot />
            </Align>
        </template>
    </Display>
</template>

<script setup lang="ts">
import { TextInput, createTextInput } from "./index";
import { nextTick, PropType, watch, toRaw, StyleValue, onScopeDispose } from "vue";
import Text, { encodings } from "@/helper/text";
import { TextInputUpload, textInputEncoderLists, TextInputEncoderType } from "@/types";
import { debounce, isString } from "lodash";
import { sizeConvert } from "@/components/util";
import Bool from "@/components/ui/Bool.vue";

const props = defineProps({
    modelValue: {
        type: Object as PropType<TextInput>,
        default: () => createTextInput(),
    },
    height: {
        type: [Number, String],
        default: "",
    },
    placeholder: {
        type: String,
        default: () => {
            return $t("main_ui_input");
        },
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    allow: {
        type: Array as PropType<TextInputEncoderType[]>,
        default: () => textInputEncoderLists,
    },
    upload: {
        type: String as PropType<TextInputUpload>,
        default: "none",
    },
    encoding: {
        // 输入编码选项框
        type: Boolean,
        default: false,
    },
    useInput: {
        // 非上传使用input框
        type: [Boolean, String],
        default: false,
    },
});

const typeLists = $computed(() => {
    return textInputEncoderLists.filter(item => {
        return ![...(props.upload === "none" ? ["upload"] : [])].includes(item) && props.allow.includes(item);
    });
});

const emit = defineEmits<{ (e: "update:modelValue", modelValue: TextInput): void }>();

let current = $ref(toRaw(props.modelValue));

let transformVersion = 0;

// 更新
const transform = debounce(async (version: number) => {
    if (version !== transformVersion) {
        return;
    }
    const value = current.value;
    const type = current.type;
    const commit = (text: Text) => {
        if (version === transformVersion && current.type === type && current.value === value) {
            current.text = text;
        }
    }

    if (value === "") {
        commit(Text.empty());
        return;
    }
    try {
        if (type === "upload") {
            if (value instanceof File) {
                const text = (await Text.fromBlob(value)).setFileName(value.name);
                await text.calculateImageSize();
                commit(text);
                return;
            }
            throw new Error("error data");
        }

        if (!isString(value)) {
            throw new Error("error data");
        }

        switch (type) {
            case "text":
                commit(Text.fromString(value, current.option.text.encoding));
                return;
            case "base64":
                commit(Text.fromBase64(value));
                return;
            case "hex":
                commit(Text.fromHex(value, {
                    preserve_line_breaks: current.option.hex.preserve_line_breaks,
                }));
                return;
            case "url":
                commit(await Text.fromUrl(value));
                return;
        }
        throw new Error("error type");
    } catch (e) {
        commit(Text.fromError($error(e)));
    }
}, 200);

onScopeDispose(() => {
    transformVersion++;
    transform.cancel();
});

watch(
    () => {
        return {
            type: current.type,
            value: current.value,
            option: current.option,
        };
    },
    () => {
        transformVersion++;
        transform(transformVersion);
    },
    { immediate: true, deep: true },
);

watch(
    () => current.text,
    () => emit("update:modelValue", toRaw(current) as TextInput),
    { immediate: true, deep: true },
);

watch(
    () => {
        return {
            type: props.modelValue.type,
            value: props.modelValue.value,
            option: props.modelValue.option,
        };
    },
    async () => {
        await nextTick();
        current = toRaw(props.modelValue);
    },
    { deep: true },
);

const style = $computed(() => {
    let css: StyleValue = {};
    if (props.height) {
        css.height = sizeConvert(props.height);
    }
    return css;
});
</script>
