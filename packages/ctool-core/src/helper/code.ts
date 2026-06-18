import type { languages } from "monaco-editor/esm/vs/editor/editor.api";

let languageMap: Map<string, languages.ILanguageExtensionPoint> | null = null;
let customLanguages: { name: string; alias: string[]; language: languages.ILanguageExtensionPoint | null }[] | null = null;

type CustomLanguage = { name: string; alias: string[]; language: languages.ILanguageExtensionPoint | null };
let loadPromise: Promise<void> | null = null;
// 自定义语言别名 -> 语言对象的反向索引，实现 O(1) 查找
let customLanguageAliasMap: Map<string, CustomLanguage> | null = null;

const buildLanguageMap = (list: languages.ILanguageExtensionPoint[]) => {
    const map = new Map<string, languages.ILanguageExtensionPoint>();
    for (const lang of list) {
        map.set(lang.id.toLowerCase(), lang);
        for (const alias of lang.aliases || []) {
            map.set(alias.toLowerCase(), lang);
        }
    }
    return map;
};

const buildCustomLanguageAliasMap = (list: CustomLanguage[]) => {
    const map = new Map<string, CustomLanguage>();
    for (const item of list) {
        map.set(item.name.toLowerCase(), item);
        for (const alias of item.alias) {
            map.set(alias.toLowerCase(), item);
        }
    }
    return map;
};

const initCustomLanguages = () => {
    const map = languageMap!;
    const get = (land: string): languages.ILanguageExtensionPoint | null => map.get(land.toLowerCase()) ?? null;

    customLanguages = [
        defineConfig("GraphQL"),
        defineConfig("Vue", get("html")),
        defineConfig("Angular", get("html")),
        defineConfig("HTML Table", get("html"), ["html_table"]),
        defineConfig("PHP Array", get("php"), ["php_array"]),
        defineConfig("Php Serialize", get("php"), ["php_serialize"]),
        defineConfig("Http Query String", null, ["http_query_string"]),
        defineConfig("JSON Schema", get("json")),
        defineConfig("JavaScript PropTypes", get("typescript")),
        defineConfig("Flow", get("typescript")),
        defineConfig("Text"),
        defineConfig("CSV"),
        defineConfig("C-99", get("c"), ["c99"]),
        defineConfig("C++ 14", get("c++"), ["cpp14"]),
        defineConfig("C++ 17", get("c++"), ["cpp17"]),
        defineConfig("Python 2", get("python"), ["python2"]),
        defineConfig("Python 3", get("python"), ["python3"]),
        defineConfig("VB.NET", get("vb.net"), ["vbn"]),
        defineConfig("JavaScript", get("javascript"), ["nodejs"]),
    ];
    customLanguageAliasMap = buildCustomLanguageAliasMap(customLanguages);
};

export const loadLanguages = async () => {
    if (languageMap !== null) {
        return;
    }
    if (loadPromise !== null) {
        return loadPromise;
    }
    loadPromise = (async () => {
        const monaco = await import("monaco-editor/esm/vs/editor/editor.api");
        const list = monaco.languages.getLanguages();
        languageMap = buildLanguageMap(list);
        initCustomLanguages();
    })();
    return loadPromise;
};

// 定义自定义语言
const defineConfig = (name: string, language?: languages.ILanguageExtensionPoint | null, alias?: string[]): CustomLanguage => {
    return {
        name,
        alias: alias || [],
        language: language ?? null,
    };
};

// 获取编辑器编辑语言对象
const getSourceLanguage = (land: string): languages.ILanguageExtensionPoint | null => {
    if (languageMap === null) {
        return null;
    }
    return languageMap.get(land.toLowerCase()) || null;
};

// 获取 编辑器 语言处理对象
export const getEditorLanguage = (land: string): languages.ILanguageExtensionPoint => {
    const language = getSourceLanguage(land);
    if (language) {
        return language;
    }

    if (customLanguageAliasMap !== null) {
        const custom = customLanguageAliasMap.get(land.toLowerCase());
        if (custom?.language) {
            return custom.language;
        }
    }
    return getSourceLanguage("plaintext") || { id: "plaintext" };
};

// 获取程序语言显示名称
export const getDisplayName = (land: string): string => {
    if (customLanguageAliasMap !== null) {
        const custom = customLanguageAliasMap.get(land.toLowerCase());
        if (custom) {
            return custom.name;
        }
    }

    const language = getSourceLanguage(land);
    if (language !== null) {
        return language.aliases ? language.aliases[0] : language.id;
    }

    return land;
};

export const getAllLanguage = (): string[] => {
    const lists: string[] = [];
    if (languageMap !== null) {
        const seen = new Set<string>();
        for (const lang of languageMap.values()) {
            const name = lang.aliases ? lang.aliases[0] : lang.id;
            if (!seen.has(name)) {
                seen.add(name);
                lists.push(name);
            }
        }
    }
    if (customLanguages !== null) {
        for (const item of customLanguages) {
            lists.push(item.name);
        }
    }
    return lists.sort();
};
