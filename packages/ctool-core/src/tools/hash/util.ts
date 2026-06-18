import CryptoJS from "crypto-js"
import sm from "sm-crypto"
import Text from "@/helper/text"

export const methods = ['md5', 'sha1', 'sha256', 'sha512', 'sm3'] as const
export type methodType = typeof methods[number]

const hashMethod = {
    md5: (message: Text): string => {
        // 直接通过 Uint8Array 构建 WordArray，避免 Base64 编解码往返
        return CryptoJS.MD5(CryptoJS.lib.WordArray.create(message.toUint8Array())).toString();
    },
    sha1: (message: Text): string => {
        return CryptoJS.SHA1(CryptoJS.lib.WordArray.create(message.toUint8Array())).toString();
    },
    sha256: (message: Text): string => {
        return CryptoJS.SHA256(CryptoJS.lib.WordArray.create(message.toUint8Array())).toString();
    },
    sha512: (message: Text): string => {
        return CryptoJS.SHA512(CryptoJS.lib.WordArray.create(message.toUint8Array())).toString();
    },
    sm3: (message: Text): string => {
        const leftPad = (input: string, num: number) => {
            if (input.length >= num) return input;
            // 使用原生 padStart 替代 Array.join，减少内存分配
            return input.padStart(num, '0');
        }

        let hexStr = message.toHex({ type: "hex" });

        const words: number[] = [];
        let hexStrLength = hexStr.length;

        if (hexStrLength % 2 !== 0) {
            hexStr = leftPad(hexStr, hexStrLength + 1);
        }

        hexStrLength = hexStr.length;

        for (let i = 0; i < hexStrLength; i += 2) {
            words.push(parseInt(hexStr.substr(i, 2), 16));
        }

        return sm.sm3(words as any);
    }
}

class Expression {
    parameter: Expression[] = [];
    flag: string = "";

    constructor(flag = "root") {
        if (!['hash', '$input', '$salt', 'root'].includes(flag)) {
            throw new Error(`Expression Error (${flag})`);
        }
        this.flag = flag;
    }

    add(item: Expression) {
        this.parameter.push(item);
    }

    toString() {
        if (this.flag === "root") {
            let str = "";
            for (let i = 0; i < this.parameter.length; i++) {
                const item = this.parameter[i].toString();
                str += `${i > 0 ? '.' : ""}${item}`;
            }
            return str;
        }
        if (this.flag === "hash") {
            let str = "";
            for (let i = 0; i < this.parameter.length; i++) {
                const item = this.parameter[i].toString();
                str += `${i > 0 ? '.' : ""}${item}`;
            }
            return `hash(${str})`;
        }
        return this.flag;
    }

    getResult(input: string, salt: string, hashFunc: (str: Text) => string): string {
        if (this.flag === "$input") {
            return input;
        }
        if (this.flag === "$salt") {
            return salt;
        }
        const result: string[] = [];
        for (let i = 0; i < this.parameter.length; i++) {
            result.push(this.parameter[i].getResult(input, salt, hashFunc));
        }
        if (this.flag === "root") {
            return result.join("");
        }
        return hashFunc(Text.fromString(result.join("")));
    }
}

const expressionParse = (str = "") => {
    // 使用正则一次性分词，减少多次 replace 创建中间字符串
    const items = str.split(/([().])/).filter((item) => item !== "");
    if (!['hash', '$input', '$salt'].includes(items[0])) {
        throw new Error(`Expression Error ${items[0]}`);
    }
    const root = new Expression();
    const stack: Expression[] = [root];
    let prev: Expression | null = null;

    for (let item of items) {
        const current = stack[stack.length - 1];
        let itemExp: Expression | null = null;
        switch (item) {
            case ".":
                break;
            case "hash":
            case "$input":
            case "$salt":
                itemExp = new Expression(item);
                current.add(itemExp);
                prev = itemExp;
                break;
            case "(":
                stack.push((prev as Expression));
                break;
            case ")":
                if (stack.length === 1) {
                    throw new Error(`Expression Error invalid ")"`);
                }
                stack.pop();
                break;
            default:
                throw new Error(`Expression Error invalid "${item}"`);
        }
    }
    if (stack.length > 1) {
        throw new Error(`Expression Error invalid "("`);
    }
    return root;
};
// exp hash(hash($input.$salt).$salt)
export default (type: methodType, input: Text, salt: string = "", exp: string = ""): string => {
    if (!methods.includes(type)) {
        throw new Error(`hash method 不存在: ${type}`);
    }
    const hashFunc = (str: Text) => hashMethod[type](str);
    if (exp === "") {
        return hashFunc(input);
    }
    return expressionParse(exp).getResult(input.toString(), salt, hashFunc);
};
