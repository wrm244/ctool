import { toSimplified, toTraditional } from "chinese-simple2traditional";
import { orderBy, uniq } from "lodash";
import { Buffer } from "buffer";
import { TypeLists as RenameType, convent as nameConvent } from "@/helper/nameConvert";
import { setupEnhance } from "chinese-simple2traditional/enhance";

setupEnhance();

const regExpQuote = function(str: string) {
    return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

// GBK字符集实际长度计算
const getGbkStrLength = (str: string) => {
    let realLength = 0;
    const len = str.length;
    for (let i = 0; i < len; i++) {
        const charCode = str.charCodeAt(i);
        realLength += charCode >= 0 && charCode <= 128 ? 1 : 2;
    }
    return realLength;
};


export const escapeChars = {
    backslash: {
        string: "\\\\",
        char: "\\",
    },
    single_quote: {
        string: "\\'",
        char: "\'",
    },
    double_quote: {
        string: "\\\"",
        char: "\"",
    },
    new_line: {
        string: "\\n",
        char: "\n",
    },
    carriage_return: {
        string: "\\r",
        char: "\r",
    },
    tab: {
        string: "\\t",
        char: "\t",
    },
    vertical_tab: {
        string: "\\v",
        char: "\v",
    },
    backspace: {
        string: "\\b",
        char: "\b",
    },
    form_feed: {
        string: "\\f",
        char: "\f",
    },
};

export type EscapeCharsType = keyof typeof escapeChars


export default class {
    private readonly text: string;

    constructor(text: string) {
        this.text = text;
    }

    // 大写
    upper() {
        return this.text.toUpperCase();
    }

    // 小写
    lower() {
        return this.text.toLowerCase();
    }

    // 行首大写
    upperLineStart() {
        return this.text.split(/\r?\n/).map((str) => {
            if (str.length < 1) {
                return "";
            }
            return str[0].toUpperCase() + str.substr(1);
        }).join("\n");
    }

    // 行首小写
    lowerLineStart() {
        return this.text.split(/\r?\n/).map((str) => {
            if (str.length < 1) {
                return "";
            }
            return str[0].toLowerCase() + str.substr(1);
        }).join("\n");
    }

    // 词首大写
    upperStart() {
        return this.text.replace(/\b\w/g, function(str) {
            return str.toUpperCase();
        });
    }

    // 词首小写
    lowerStart() {
        return this.text.replace(/\b\w/g, function(str) {
            return str.toLowerCase();
        });
    }

    // 简繁转换
    zhTran({ type = "simplified" }: Record<string, any> = {}) {
        if (type === "simplified") {
            return toTraditional(this.text);
        }
        return toSimplified(this.text);
    }

    // 替换
    replace({ search = [], replace = [] }: Record<string, any> = {}) {
        let text = this.text;
        for (let i in search) {
            if (search[i]) {
                text = text.replace(new RegExp(regExpQuote(search[i]), "g"), (i in replace ? replace[i] : ""));
            }
        }
        return text;
    }

    // 替换
    regularReplace({ search = "", replace = "" }: Record<string, any> = {}) {
        let text = this.text;
        if (search) {
            text = text.replace(new RegExp(search, "g"), replace);
        }
        return text;
    }

    // 移除重复行
    lineRemoveRepeat() {
        return uniq(this.text.split("\n")).join("\n");
    }

    // 移除行号
    removeLineIndex() {
        return this.text.replace(new RegExp("^\\s*\\d+\\.?", "gm"), "");
    }

    // 添加行号
    addLineIndex() {
        return this.text.split("\n").map((line, index) => `${index + 1}. ${line}`).join("\n");
    }

    // 排序
    sort({ type = "" }: Record<string, any> = {}) {
        switch (type) {
            // 行反转
            case "reverse_line":
                return this.text.split(/\r?\n/).reverse().join("\n");
            // 行字符串反转
            case "reverse_line_string":
                return this.text.split(/\r?\n/).map(text => {
                    return text.split("").reverse().join("");
                }).join("\n");
            // 字符串反转
            case "reverse_all":
                return this.text.split("").reverse().join("");

            // 行排序
            case "line_asc":
                return orderBy(this.text.split(/\r?\n/), (item) => item, "asc").join("\n");
            case "line_desc":
                return orderBy(this.text.split(/\r?\n/), (item) => item, "desc").join("\n");
        }
        return this.text;
    }

    // trim
    lineTrim() {
        return this.text.split(/\r?\n/).map((item) => item.trim()).join("\n");
    }

    // 移除空行
    filterBlankLine() {
        return this.text.split(/\r?\n/).filter((item) => {
            return item.trim() !== "";
        }).join("\n");
    }

    // 过滤所有换行符
    filterAllBr() {
        return this.text.replace(/\r?\n|\r/g, "");
    }

    // 标点替换：构建字符映射表，一次 replace 完成，避免 O(n*m) 多次正则替换
    replacePunctuation({ type = "zh" }: Record<string, any> = {}) {
        const zh = ["“", "”", "‘", "’", "。", "，", "；", "：", "？", "！", "……", "—", "～", "（", "）", "《", "》"];
        const en = ["\"", "\"", "'", "'", ".", ",", ";", ":", "?", "!", "…", "-", "~", "(", ")", "<", ">"];
        const source = type === "zh" ? en : zh;
        const target = type === "zh" ? zh : en;
        const map = new Map<string, string>();
        for (let i = 0; i < source.length; i++) {
            map.set(source[i], target[i]);
        }
        const pattern = new RegExp(
            Array.from(map.keys()).map(k => regExpQuote(k)).join("|"),
            "g"
        );
        return this.text.replace(pattern, (matched) => map.get(matched) || matched);
    }

    // 转义
    escape({ lists = [] }: { lists: EscapeCharsType[] } | Record<string, any>) {
        let text = this.text;
        for (let item of lists) {
            if (item in escapeChars) {
                text = text.replaceAll(escapeChars[item].string, escapeChars[item].char);
            }
        }
        return text;
    }

    // 反转义
    unescape({ lists = [] }: { lists: EscapeCharsType[] } | Record<string, any>) {
        let text = this.text;
        for (let item of lists) {
            if (item in escapeChars) {
                text = text.replaceAll(escapeChars[item].char, escapeChars[item].string);
            }
        }
        return text;
    }

    // 命名
    rename({ type = "lowerSnakeCase" }) {
        return this.text.replace(/\b[\w\-_]+\b/g, function(str) {
            return nameConvent(str, type as RenameType);
        });
    }

    // 统计：单次字符遍历完成分类计数，避免多次正则扫描
    stat() {
        const content = this.text.replace(/\r?\n/g, "\n");

        let zh_word = 0;
        let zh_punctuation = 0;
        let int_string = 0;
        let en_string = 0;
        let int_word = 0;
        let en_word = 0;
        let en_punctuation = 0;

        // 预编译正则，避免循环中重复创建
        const zhCharRe = /[一-龥]/;
        const zhPunctRe = /[。？！，、；：“”‘’（）《》〈〉【】『』「」﹃﹄〔〕…—～﹏￥]/;
        const enPunctRe = /[~`!@#$%^&*()\-_+=|\\[\]{};:"',<.>/?]/;

        let inNumber = false;
        let inWord = false;

        for (let i = 0; i < content.length; i++) {
            const ch = content[i];
            const code = content.charCodeAt(i);

            if (zhCharRe.test(ch)) {
                zh_word++;
            } else if (zhPunctRe.test(ch)) {
                zh_punctuation++;
            } else if (code >= 48 && code <= 57) {
                int_string++;
                if (!inNumber) {
                    inNumber = true;
                    int_word++;
                }
            } else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
                en_string++;
                if (!inWord) {
                    inWord = true;
                    en_word++;
                }
            } else if (enPunctRe.test(ch)) {
                en_punctuation++;
            }

            // 单词边界判断：非字母数字下划线视为边界
            if (!(code >= 48 && code <= 57) && !((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) && ch !== '_') {
                inNumber = false;
                inWord = false;
            }
        }

        return {
            // 字节数(utf8)
            byte_utf8_length: Buffer.byteLength(this.text, "utf8"),
            // 字节数(gbk)
            byte_gbk_length: getGbkStrLength(this.text),
            // 字符数
            string_length: content.replace(/\n/g, "").length,
            // 字数
            word_length: zh_word + en_word + zh_punctuation + int_word + en_punctuation,
            // 中文字数
            zh_word,
            // 中文标点
            zh_punctuation,
            // 英文字母
            en_string,
            // 英文单词
            en_word,
            // 英文标点
            en_punctuation,
            // 数字字符
            int_string,
            // 数字单词
            int_word,
            // 行数
            line_length: this.text ? (content.match(/\n/g) || []).length + 1 : 0,
        };
    }
}
