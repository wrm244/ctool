import { TypeLists as RenameType, convent as nameConvent } from "@/helper/nameConvert";
import formatter from "@/tools/code/formatter";
import unicode from "@/tools/unicode/util";
import jsonKeysSort from "json-keys-sort";
import { isArray, isPlainObject } from "lodash";

const beautify = async (code: string, {tab = 4}: any = {}) => {
    return code !== "" ? await (await formatter.load('json')).set(code, {tab}).format('beautify') : ""
}
const compress = async (code: string) => {
    return code !== "" ? await (await formatter.load('json')).set(code).format('compress') : ""
}
const rename = (code: any, type: RenameType): any => {
    if (isArray(code)) {
        return code.map(item => rename(item, type));
    }
    if (isPlainObject(code)) {
        const result: Record<string, any> = {};
        for (const key in code) {
            result[nameConvent(key, type)] = rename(code[key], type);
        }
        return result;
    }
    return code;
}

// unicode2zh
const unicode2zh = (content: string) => {
    return unicode.decode(
        content.replace(/\\U[0-9a-fA-F]{4}/g, (item) => {
            // \Uxxxx=>\uxxxx
            return item.replace("\\U", "\\u");
        })
    )
}

// zh2unicode
const zh2unicode = (content: string) => {
    if (content === "") {
        return content;
    }
    let newStr = '';
    for (const char of content) {
        const code = char.codePointAt(0)!;
        newStr += code >= 0x4e00 && code <= 0x9fa5 ? '\\u' + code.toString(16) : char;
    }
    return newStr;
}

export default {
    beautify,
    compress,
    rename,
    unicode2zh,
    zh2unicode,
    sortAsc(data: object) {
        return jsonKeysSort.sort(data)
    },
    sortDesc(data: object) {
        return jsonKeysSort.sort(data, false)
    },
    escape(content: string) {
        return content.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    },
    clearEscape(content: string) {
        return content.trim().replace(/\\\\/g, '\\').replace(/\\"/g, '"')
    },
}
