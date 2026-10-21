import platform from "./platform";
import { onMounted, onUnmounted, ref } from "vue";

// 剪贴板权限
let permission: PermissionState = "denied";

// 初始化剪贴板权限
export const initPermission = async () => {
    return new Promise(resolve => {
        if (platform.isUtools() || platform.isDesktop()) {
            permission = "granted";
            return resolve("");
        }

        // https://github.com/nolanlawson/pinafore/pull/618/files
        if (!navigator.permissions || !navigator.permissions.query) {
            return resolve("");
        }

        navigator.permissions
            //@ts-ignore
            .query({ name: "clipboard-read" })
            .then(result => {
                permission = result.state;
                resolve("");
            })
            .catch(() => {
                resolve("");
            });
    });
};

// 复制文本
export const copy = (data: string, successCallback?: () => void) => {
    try {
        if (data === "") {
            return;
        }
        navigator.clipboard.writeText(data).then(
            () => {
                successCallback && successCallback();
            },
            function (e) {
                console.log("copy failed", e);
            },
        );
    } catch (e) {
        console.log("copy error", e);
    }
};
// 获取剪贴板数据
export const paste = async (force: boolean = false): Promise<string> => {
    return new Promise(resolve => {
        try {
            if (!force && permission !== "granted") {
                return resolve("");
            }
            navigator.clipboard
                .readText()
                .then(text => {
                    // 空内容或无权限统一返回空字符串，避免与有效内容混淆
                    return resolve(text || "");
                })
                .catch(e => {
                    console.error(e);
                    return resolve("");
                });
        } catch {
            resolve("");
        }
    });
};

// 复制图片到剪贴板
export const copyImage = (imageBase64: string, successCallback?: () => void) => {
    if (!imageBase64) {
        console.error("copyImage: 图片数据为空");
        return;
    }
    if (permission !== "granted") {
        console.error("copyImage: 剪贴板权限不足");
        return;
    }
    // 验证 Base64 图片基本格式
    if (!imageBase64.includes(",")) {
        console.error("copyImage: 图片格式错误，缺少 data URL 分隔符");
        return;
    }

    const inputImage = new Image();
    inputImage.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = inputImage.width;
        canvas.height = inputImage.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            console.error("copyImage: Canvas 获取 2D 上下文失败");
            return;
        }
        ctx.drawImage(inputImage, 0, 0, inputImage.width, inputImage.height);

        canvas.toBlob(blob => {
            if (!blob) {
                console.error("copyImage: Canvas 转换为 Blob 失败");
                return;
            }
            const data = [new window.ClipboardItem({ [blob.type]: blob })];
            navigator.clipboard.write(data).then(
                () => successCallback && successCallback(),
                e => console.error("copyImage: 写入剪贴板失败", e),
            );
        }, "image/png");
    };
    inputImage.onerror = () => {
        console.error("copyImage: 图片加载失败");
    };
    inputImage.src = imageBase64;
};

export const useClipboardPermission = () => {
    const state = ref(permission);
    let status: PermissionStatus | null = null;
    let disposed = false;

    const update = () => {
        if (status) {
            permission = status.state;
        }
        state.value = permission;
    };

    onMounted(async () => {
        if (platform.isUtools() || platform.isDesktop()) {
            permission = "granted";
            state.value = permission;
            return;
        }
        if (!navigator.permissions || !navigator.permissions.query) {
            return;
        }
        try {
            // @ts-ignore clipboard-read 尚未包含在部分 TypeScript DOM 定义中
            status = await navigator.permissions.query({name: "clipboard-read"});
            if (disposed) {
                status = null;
                return;
            }
            update();
            status.addEventListener("change", update);
        } catch {
            state.value = permission;
        }
    });

    onUnmounted(() => {
        disposed = true;
        status?.removeEventListener("change", update);
        status = null;
    });
    return { state };
};

export default {
    copy,
    paste,
    copyImage,
};
