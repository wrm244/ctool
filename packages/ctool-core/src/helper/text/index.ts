import filetype from "magic-bytes.js";
// @ts-ignore
import { isText, isBinary } from "istextorbinary";
import dayjs from "dayjs";
import { FormatOptions as hexyFormatOptions, hexy } from "hexy";
import { Base64 } from "js-base64";
import validDataUrl from "valid-data-url";
import { Buffer } from "buffer";
import Uint from "./uint";
import extList from "ext-list";

const _encoding = ["gbk", "utf-8"] as const;
export type Encoding = (typeof _encoding)[number];
export const encodings: string[] = _encoding as any;

const extMimeList: Map<string, string> = extList();

// 通用数据类型
class Text {
    private uint: Uint;
    private fileName: string = "";
    private width?: number;
    private height?: number;
    public imageSizeString: string = "";
    // 是否为错误内容类型
    private _isError: boolean = false;
    // 缓存文件类型分析结果，避免重复调用 filetype()
    private _filetypeCache: ReturnType<typeof filetype> | null = null;
    private _extensionCache: string | null = null;
    private _mimeCache: string | null = null;
    private _isTextCache: boolean | null = null;
    private _isBinaryCache: boolean | null = null;
    private _imageSizeCalculated: boolean = false;

    constructor(uint: Uint) {
        this.uint = uint;
    }

    static empty(): Text {
        return Text.fromString("");
    }

    static fromError(error: string) {
        const instance = Text.fromString(error);
        instance._isError = true;
        return instance;
    }

    static async fromBlob(item: Blob) {
        return new Promise<Text>(resolve => {
            const reader = new FileReader();
            const fail = () => resolve(Text.fromError('file read fail'));
            reader.onloadend = () => {
                if (reader.error) {
                    fail();
                    return;
                }
                resolve(new Text(new Uint(new Uint8Array(reader.result as ArrayBuffer))));
            };
            reader.onerror = fail;
            reader.onabort = fail;
            reader.readAsArrayBuffer(item);
        });
    }

    static async fromUrl(url: string) {
        return new Promise<Text>(resolve => {
            // 仅允许 http/https 协议，防止 file:// 等危险协议
            let parsedUrl: URL;
            try {
                parsedUrl = new URL(url, window.location.href);
            } catch (e) {
                resolve(Text.fromError(`[${url}] URL 格式错误`));
                return;
            }
            if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
                resolve(Text.fromError(`[${url}] 不支持的协议: ${parsedUrl.protocol}`));
                return;
            }
            const xhr = new XMLHttpRequest();
            xhr.open("GET", parsedUrl.href);
            xhr.responseType = "blob";
            xhr.timeout = 30_000;
            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(await Text.fromBlob(xhr.response));
                } else {
                    resolve(Text.fromError(`[${url}] load fail, status code:${xhr.status}`));
                }
            };
            xhr.onerror = () => {
                resolve(Text.fromError(`[${url}] load fail`));
            };
            xhr.ontimeout = () => {
                resolve(Text.fromError(`[${url}] load timeout`));
            };
            xhr.onabort = () => {
                resolve(Text.fromError(`[${url}] load aborted`));
            };
            xhr.send();
        });
    }

    static fromUint8Array(item: Uint8Array, encoding: Encoding = "utf-8") {
        return new Text(new Uint(item, encoding));
    }

    static fromString(str: string, toEncoding: Encoding = "utf-8"): Text {
        return new Text(Uint.fromString(str).to(toEncoding));
    }

    static fromHex(str: string, { preserve_line_breaks = false }: { preserve_line_breaks?: boolean } = {}): Text {
        const normalized = str
            .replaceAll(/\\x/g, '') // 兼容 Unicode Escape 格式
            .replaceAll(/[ \t\f\v]/g, '') // 过滤空白字符
            .replaceAll("\r", "")
            .replaceAll("\n", preserve_line_breaks ? "0a" : "")
            .trim();
        if (normalized !== "" && (normalized.length % 2 !== 0 || /[^0-9a-f]/i.test(normalized))) {
            throw new Error("Hex 输入格式错误")
        }
        return Text.fromBuffer(
            Buffer.from(normalized, "hex"),
        );
    }
    static fromBuffer(item: Buffer): Text {
        return Text.fromUint8Array(Uint8Array.from(item));
    }

    static fromArray(item: number[]): Text {
        return Text.fromUint8Array(Uint8Array.from(item));
    }

    static fromBase64(str: string): Text {
        let item = str.trim();
        // 兼容DataUrl
        if (validDataUrl(item)) {
            item = item.split(",")?.pop() || "";
        }
        if (item === "") {
            return Text.empty();
        }
        const buffer = Base64.toUint8Array(item);
        if (buffer.length < 1) {
            throw new Error("Base64 Decode Is Empty");
        }
        return Text.fromUint8Array(buffer);
    }

    toString(encoding?: Encoding) {
        return this.isEmpty() ? "" : this.uint.toString(encoding);
    }

    toBase64(isUrlSafe: boolean = false, dataUrlShow = false) {
        if (!dataUrlShow) {
            return Base64.fromUint8Array(this.uint.uint8Array, isUrlSafe);
        }
        return `data:${this.mime()};base64,${Base64.fromUint8Array(this.uint.uint8Array)}`;
    }

    toHexString() {
        return this.toHex({ type: "hex" });
    }

    toHexArray() {
        return (
            this.toArray().map(item => {
                return Number(item).toString(16);
            }) || []
        );
    }

    toHex(options: hexyFormatOptions & { type: "hex" | "dump" }) {
        if (options.type === "dump") {
            return hexy(Buffer.from(this.uint.uint8Array), options);
        }
        return Buffer.from(this.uint.uint8Array)
            .toString("hex")
            [options.caps === "upper" ? "toUpperCase" : "toLowerCase"]();
    }

    toUint8Array() {
        return this.uint.uint8Array;
    }

    toBuffer() {
        return Buffer.from(this.uint.uint8Array);
    }

    toArray() {
        return Array.from(this.uint.uint8Array);
    }

    toDown() {
        const bytes = new Uint8Array(this.uint.uint8Array);
        const objectUrl = window.URL.createObjectURL(new Blob([bytes], { type: this.mime() }));
        const aEle = document.createElement("a");
        // 清理文件名中的路径遍历字符，防止下载到非预期位置
        aEle.download = this.name().replace(/[\\/]/g, "_");
        aEle.href = objectUrl;
        aEle.style.display = "none";
        document.body.appendChild(aEle);
        aEle.click();
        aEle.remove();
        // 延迟释放，避免部分浏览器尚未开始下载就撤销 URL。
        setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
    }

    toDataUrl() {
        return this.toBase64(false, true);
    }

    name() {
        if (this.fileName) {
            return this.fileName;
        }
        return `ctool-${dayjs().format("YYYY-MM-DD-HH-mm-ss")}${this.extension()}`;
    }

    extension(): string {
        if (this._extensionCache !== null) {
            return this._extensionCache;
        }
        let temp = (this.fileName.split(".")?.pop() || "").toLowerCase();
        if (temp) {
            this._extensionCache = `.${temp}`;
            return this._extensionCache;
        }
        if (this.isText()) {
            this._extensionCache = ".txt";
            return this._extensionCache;
        }
        const type = this.getFiletype().filter(item => !!item.extension);
        this._extensionCache = type.length > 0 ? `.${type[0].extension}` : "";
        return this._extensionCache;
    }

    // 缓存 filetype() 调用结果
    private getFiletype() {
        if (this._filetypeCache === null) {
            this._filetypeCache = filetype(this.uint.localUint8Array());
        }
        return this._filetypeCache;
    }

    mime() {
        if (this._mimeCache !== null) {
            return this._mimeCache;
        }
        if (this.fileName) {
            const ext = (this.fileName.split(".")?.pop() || "").toLowerCase();
            if (ext && extMimeList.has(ext)) {
                this._mimeCache = extMimeList.get(ext) || "application/octet-stream";
                return this._mimeCache;
            }
        }
        const type = this.getFiletype().filter(item => !!item.mime);
        if (type.length > 0 && type[0].mime) {
            this._mimeCache = type[0].mime;
            return this._mimeCache;
        }
        this._mimeCache = this.isText() ? "text/plain" : "application/octet-stream";
        return this._mimeCache;
    }

    isImage(): boolean {
        return !this.isEmpty() && [".jpg", ".jpeg", ".png", ".gif", ".webp", ".ico", ".bmp"].includes(this.extension());
    }

    isText() {
        if (this._isTextCache !== null) {
            return this._isTextCache;
        }
        this._isTextCache = !this.isEmpty() && isText("", Buffer.from(this.uint.localUint8Array()));
        return this._isTextCache;
    }

    isBinary() {
        if (this._isBinaryCache !== null) {
            return this._isBinaryCache;
        }
        this._isBinaryCache = !this.isEmpty() && isBinary("", Buffer.from(this.uint.localUint8Array()));
        return this._isBinaryCache;
    }

    isAscii() {
        if (this.isEmpty()) {
            return false;
        }
        for (let n of this.toArray()) {
            if (n > 127) {
                return false;
            }
        }
        return true;
    }

    isEmpty() {
        return this.uint.length < 1;
    }

    isError() {
        return this._isError;
    }

    setExtension(extension: string) {
        this.fileName = `ctool-${dayjs().format("YYYY-MM-DD-HH-mm-ss")}${extension}`;
        // 文件名变化后清除依赖缓存
        this._extensionCache = null;
        this._mimeCache = null;
        return this;
    }

    setFileName(name: string) {
        this.fileName = name;
        this._extensionCache = null;
        this._mimeCache = null;
        return this;
    }

    encoding() {
        return this.uint.encoding;
    }

    analyseEncoding() {
        return this.uint.analyseEncoding();
    }

    async calculateImageSize() {
        return new Promise<boolean>(resolve => {
            // 已计算过尺寸直接返回，避免重复创建 Image 和 base64 编码
            if (this._imageSizeCalculated && this.width !== undefined && this.height !== undefined) {
                return resolve(true);
            }
            if (!this.isImage()) {
                return resolve(false);
            }
            const img = new Image();
            img.onload = () => {
                if (this.width === undefined && this.height === undefined) {
                    this.width = Math.ceil(img.width);
                    this.height = Math.ceil(img.height);
                    this.imageSizeString = `${this.width} x ${this.height}`;
                }
                this._imageSizeCalculated = true;
                resolve(true);
            };
            img.onerror = () => resolve(false);
            img.src = this.toDataUrl();
        });
    }
}

export default Text;
