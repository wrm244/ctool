import {Locale, LocaleLists} from "@/types";
import platform from "@/helper/platform";
import {locales} from "@/buildDataTemp";
import event from "@/event";

export const LOCALE_DETAIL = locales.detail
// 默认语言
export const DEFAULT_LOCALE = platform.getLocale()
// 运行时当前语言
let currentLocale: Locale = "_default"

const getMessage = (code: Locale, key: string) => {
    let locale: LocaleLists = code === "_default" ? DEFAULT_LOCALE : code;
    let text = key;
    if ((locale in LOCALE_DETAIL) && (key in LOCALE_DETAIL[locale])) {
        text = LOCALE_DETAIL[locale][key]['message']
    }
    return text;
}

// 占位符正则，提取为常量避免每次翻译时重新创建
const PLACEHOLDER_RE = new RegExp('{.+?}', 'g')

const translate = (code: Locale, key: string, values: Record<string, any> = {}): string => {
    if (!key) return '';

    const text = getMessage(code, key);
    // 单次遍历文本完成占位符替换，避免多次 match/forEach/replace
    return text.replace(PLACEHOLDER_RE, (wildcard) => {
        const placeholderKey = wildcard.slice(1, -1); // 去掉首尾 { }
        return placeholderKey in values ? String(values[placeholderKey]) : wildcard;
    });
}

export const $t = (key: string, values?: Record<string, any> | [], locale?: Locale) => {
    if (!locale) {
        locale = currentLocale
    }
    if (!values) {
        values = []
    }
    if (Array.isArray(values)) {
        // 数组转对象表示法
        let temp: Record<string, any> = {}
        for (let i = 0; i < values.length; i++) {
            temp[i] = values[i]
        }
        values = temp
    }

    // values 必须是对象
    return translate(locale, key, values)
}

// 设置当前语言：同步更新 html 标签的 data-locale 属性
export const setCurrentLocale = (value: Locale) => {
    currentLocale = value
    document.documentElement.dataset.locale = value === "_default" ? DEFAULT_LOCALE : value
    event.dispatch("locale_change", value)
}

// 获取当前语言
export const getCurrentLocale = () => {
    return $t('main_locale')
}

export const getLocaleName = (code: string): null | string => {
    for (let l of locales.lists) {
        if (l.code === code) {
            return l.name
        }
    }
    return null
}
