<template>
    <div class="ctool-upload" v-if="mode.includes('button')">
        <Button :size="size" :disabled="disabled" type="primary" @click="fileInput?.click()">
            <Icon name="upload"/>
            <span style="margin-left: 5px" v-if="buttonType === 'text'">{{ $t(`component_upload_${type}`) }}</span>
        </Button>
    </div>
    <div style="display: none">
        <input ref="fileInput" :disabled="disabled" type="file" :accept="accept" @change="handleUpload"/>
    </div>
</template>

<script setup lang="ts">
import {PropType, onMounted, onUnmounted, ref} from "vue";
import {UploadFileType, UploadFileMode, UploadFileButtonType, ComponentSizeType} from "@/types"

const emit = defineEmits<{ (e: 'update:modelValue', value: string | File): void, (e: 'success', content: File): void }>()
const props = defineProps({
    modelValue: {
        type: [String, Object] as PropType<string | File>,
        default: ""
    },
    type: {
        type: String as PropType<UploadFileType>,
        default: "file"
    },
    mode: {
        type: Array as PropType<(UploadFileMode)[]>,
        default: ["button", "paste"]
    },
    buttonType: {
        type: String as PropType<(UploadFileButtonType)>,
        default: "icon"
    },
    size: {
        type: String as PropType<(ComponentSizeType)>,
        default: "default"
    },
    disabled: {
        type: Boolean,
        default: false
    },
})

const fileInput = $ref<HTMLInputElement | null>(null)
// 标记当前组件是否处于激活状态，避免多实例同时响应全局 paste 事件
const isActive = ref(true)

const accept = $computed(() => {
    if (props.type === "image") {
        return "image/*"
    }
    return "*"
})

const success = (file: File) => {
    emit('success', file)
    emit('update:modelValue', file)
}

const handleUpload = () => {
    if (!fileInput || !fileInput.files) {
        return;
    }
    success(fileInput.files[0])
    return false
}
const paste = (_event: Event) => {
    const event = _event as ClipboardEvent
    // 非激活或被禁用时忽略全局 paste 事件
    if (!isActive.value || !event.clipboardData || props.disabled) {
        return;
    }
    let items = event.clipboardData.items;
    if (items && items.length) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const file = item.getAsFile();
            // 严格校验 MIME 类型：图片模式仅接受 image/*
            if (item.kind === 'file' && file) {
                if (props.type === "image") {
                    if (file.type.startsWith('image/') || item.type.startsWith('image/')) {
                        success(file)
                    }
                } else {
                    success(file)
                }
            }
        }
    }
}
onMounted(() => {
    isActive.value = true;
    window.addEventListener("paste", paste);
})
onUnmounted(() => {
    isActive.value = false;
    window.removeEventListener("paste", paste);
})

</script>
<style>
.ctool-upload {
    display: inline-flex;
}
</style>
