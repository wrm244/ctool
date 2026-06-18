import {mergeWith} from "lodash";

// 危险键名黑名单，防止原型污染攻击
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * 安全合并对象：拒绝合并危险键名，防止原型污染
 * @param object 目标对象
 * @param sources 一个或多个源对象
 * @returns 合并后的目标对象
 */
export const safeMerge = <T extends Record<string, any>>(object: T, ...sources: any[]): T => {
    return mergeWith(object, ...sources, (objValue: any, _srcValue: any, key: string | number) => {
        if (typeof key === "string" && DANGEROUS_KEYS.has(key)) {
            // 拒绝危险键名，返回目标对象原值
            return objValue;
        }
        // 继续默认合并行为：返回 undefined 让 lodash 处理
        return undefined;
    });
};

/**
 * 安全自定义合并：在 mergeWith 基础上增加危险键名过滤
 * @param object 目标对象
 * @param source 源对象
 * @param customizer 自定义合并函数
 * @returns 合并后的目标对象
 */
export const safeMergeWith = <T extends Record<string, any>>(
    object: T,
    source: any,
    customizer: (objValue: any, srcValue: any, key: string | number, object: any, source: any) => any
): T => {
    return mergeWith(object, source, (objValue: any, srcValue: any, key: string | number, object: any, source: any) => {
        if (typeof key === "string" && DANGEROUS_KEYS.has(key)) {
            return objValue;
        }
        return customizer(objValue, srcValue, key, object, source);
    });
};
