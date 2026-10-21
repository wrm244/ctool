import CryptoJS from "crypto-js";
import sm from "sm-crypto";
import Text from "@/helper/text";

export const methods = ["md5", "sha1", "sha256", "sha512", "sm3", "ripemd160"] as const;

export type methodType = typeof methods[number]

const toWordArray = (message: Text) => CryptoJS.lib.WordArray.create(message.toUint8Array())

const hmacMethod = {
    md5: (message: Text, secret: Text): string => {
        return CryptoJS.HmacMD5(toWordArray(message), toWordArray(secret)).toString();
    },
    sha1: (message: Text, secret: Text): string => {
        return CryptoJS.HmacSHA1(toWordArray(message), toWordArray(secret)).toString();
    },
    sha256: (message: Text, secret: Text): string => {
        return CryptoJS.HmacSHA256(toWordArray(message), toWordArray(secret)).toString();
    },
    sha512: (message: Text, secret: Text): string => {
        return CryptoJS.HmacSHA512(toWordArray(message), toWordArray(secret)).toString();
    },
    sm3: (message: Text, secret: Text): string => {
        let hexStr = message.toHexString();

        const words: number[] = [];
        let hexStrLength = hexStr.length;

        if (hexStrLength % 2 !== 0) {
            hexStr = hexStr.padStart(hexStrLength + 1, "0");
        }

        hexStrLength = hexStr.length;

        for (let i = 0; i < hexStrLength; i += 2) {
            words.push(parseInt(hexStr.substr(i, 2), 16));
        }
        // @ts-ignore
        return sm.sm3(words as any, { key: secret.toHexString() });
    },
    ripemd160: (message: Text, secret: Text): string => {
        return CryptoJS.HmacRIPEMD160(toWordArray(message), toWordArray(secret)).toString();
    },
};


export default (type: methodType, input: Text, secret: Text): string => {
    if (!Object.keys(hmacMethod).includes(type)) {
        throw new Error(`hmac method 不存在: ${type}`);
    }
    return hmacMethod[type](input, secret);
}
