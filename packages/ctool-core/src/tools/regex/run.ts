// 正则执行的核心逻辑，单独抽出来以便 worker 与主线程（worker 不可用时）共用
export type RegexTask = {
    pattern: string
    flags: string
    content: string
    // null 表示只匹配不替换
    replace: string | null
}

export type RegexResult = {
    // 仅匹配模式下有值
    matches: string[] | null
    // 仅替换模式下有值
    output: string | null
}

export const runRegex = ({pattern, flags, content, replace}: RegexTask): RegexResult => {
    const reg = new RegExp(pattern, flags)
    if (replace === null) {
        const found = content.match(reg)
        return {
            matches: found === null ? [] : Array.from(found, (item) => `${item}`),
            output: null,
        }
    }
    return {matches: null, output: content.replace(reg, replace)}
}

export default runRegex
