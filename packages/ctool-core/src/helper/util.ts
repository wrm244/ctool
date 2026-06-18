import {v4 as uuidV4} from 'uuid';
import {InputBase, OutputBase, InputOutputBase, HistorySerializable} from "@/types";
import {isObject} from "lodash";

// 版本号：提供 getter 供需要时获取，避免模块加载时 DOM 尚未就绪的风险
export const getVersion = () =>
    document.querySelector('meta[name="ctool-version"]')?.getAttribute('content') || "dev";

// 版本号常量（保持兼容）
export const version = getVersion();

// 构建时间 getter
export const getBuildTimestamp = () =>
    parseInt(document.querySelector('meta[name="ctool-build-timestamp"]')?.getAttribute('content') || `${Date.parse((new Date()).toString()) / 1000}`);

// 构建时间常量（保持兼容）
export const buildTimestamp = getBuildTimestamp();

// uuid
export const uuid = (): string => {
    return uuidV4().toLowerCase();
}

// 调试日志
export const debug = (value: any) => {
    console.log(value)
}

export const instanceOfInputOutput = (object: any): object is InputOutputBase => {
    return instanceOfInput(object) || instanceOfOutput(object);
}
export const instanceOfInput = (object: any): object is InputBase => {
    // @ts-ignore
    return isObject(object) && object['_'] === '_input_';
}

export const instanceOfOutput = (object: any): object is OutputBase => {
    // @ts-ignore
    return isObject(object) && object['_'] === '_output_';
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
