// 文本编码类型
import chardet from "chardet";
import {Buffer} from "buffer";
import {Encoding} from "@/helper/text/index";
import {TextEncoder as CustomTextEncoder} from 'text-decoding'

export default class Uint {
    private readonly _uint8Array: Uint8Array
    private readonly _encoding: Encoding; // 编码标示[参考]
    // localUint8Array 的缓存（非 utf-8 时需要重新编码整个 buffer）
    private _localCache: Uint8Array | null = null;

    constructor(uint8Array: Uint8Array, encoding: Encoding = "utf-8") {
        this._encoding = encoding;
        this._uint8Array = uint8Array;
    }

    get length() {
        return this.uint8Array.length
    }

    get uint8Array(): Uint8Array {
        return this._uint8Array;
    }

    get encoding(): Encoding {
        return this._encoding;
    }

    analyseEncoding(): Encoding {
        const analyseEncodings = chardet.analyse(Buffer.from(this.uint8Array)).map(item => item.name)
        if (analyseEncodings.length === 0) {
            return this.encoding
        }

        const Map: Record<string, Encoding> = {
            "GB18030": "gbk",
            "UTF-8": "utf-8"
        }

        for (let item of analyseEncodings) {
            if (item in Map) {
                return Map[item]
            }
        }
        return "utf-8"
    }

    static fromString(str: string) {
        return new Uint((new TextEncoder()).encode(str))
    }

    toString(encoding?: Encoding) {
        return (new TextDecoder(encoding === undefined ? this.encoding : encoding)).decode(this.uint8Array)
    }

    // 编码转换
    to(encoding: Encoding) {
        if (encoding === this.encoding) {
            return this
        }
        const encoder: TextEncoder = encoding === 'utf-8' ? new TextEncoder() : new CustomTextEncoder(encoding, {NONSTANDARD_allowLegacyEncoding: true})
        return new Uint(encoder.encode(this.toString()), encoding)
    }

    localUint8Array() {
        // getFiletype / isText / isBinary 都会调用，非 utf-8 文本每次都要解码再编码一遍整个 buffer，
        // 这里缓存一次即可（Uint 的 buffer 是只读的，不会失效）
        if (this.encoding === 'utf-8') {
            return this.uint8Array
        }
        if (this._localCache === null) {
            this._localCache = this.to('utf-8').uint8Array
        }
        return this._localCache
    }
}
