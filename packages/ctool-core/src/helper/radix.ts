import BigNumber from "bignumber.js";

export const defaultAlphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_@"

export default (base: string | number, source: number, target: number, alphabet: string = "") => {
    alphabet = alphabet || defaultAlphabet

    const BN = BigNumber.clone({ALPHABET: alphabet,EXPONENTIAL_AT: 1e+9})
    // base 统一转为字符串，匹配 bignumber.js 11 的 (n: string, base: number) 构造签名
    return (new BN(`${base}`, source)).toString(target);
}
