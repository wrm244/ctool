import {v4 as uuidV4} from 'uuid';
import {InputBase, HistorySerializable} from "@/types";
import {isObject} from "lodash";

// 版本号
export const version = document.querySelector('meta[name="ctool-version"]')?.getAttribute('content') || "dev";

// 构建时间
export const buildTimestamp = parseInt(
    document.querySelector('meta[name="ctool-build-timestamp"]')?.getAttribute('content')
    || `${Date.parse((new Date()).toString()) / 1000}`,
);

// uuid
export const uuid = (): string => {
    return uuidV4().toLowerCase();
}

// 调试日志（仅开发环境输出，避免生产环境控制台噪音与字符串拼接开销）
export const debug = (value: any) => {
    if (import.meta.env.DEV) {
        console.log(value)
    }
}

export const instanceOfInput = (object: any): object is InputBase => {
    // @ts-ignore
    return isObject(object) && object['_'] === '_input_';
}

export const instanceOfHistorySerializable = (object: any): object is HistorySerializable => {
    // @ts-ignore
    return isObject(object) && object['__'] === '_history_serializable_';
}

// 判断对象 A 是否为对象 B 的子集：使用递归提前返回，避免生成完整差异数组
export const objectInObject = (A: any, B: any): boolean => {
    if (A === B) return true;
    if (!isObject(A) || !isObject(B)) return false;
    for (const key in A) {
        if (!(key in B)) return false;
        if (!objectInObject(A[key], B[key])) return false;
    }
    return true;
}

export const getInArrayOnlyOneItem = (value: string, lists: string[]) => {
    const exist = lists.filter(item => item.includes(value))
    return exist.length === 1 ? exist[0] : ""
}
