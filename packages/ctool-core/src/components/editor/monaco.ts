import loader from "@monaco-editor/loader";
import * as monaco from "monaco-editor";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import ContextMenu from "./contextMenu";
import lineInfo from "./lineInfo";
import { loadLanguages } from "@/helper/code";
import "./style.css";

self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === "json") {
            return new jsonWorker();
        }
        if (label === "css" || label === "scss" || label === "less") {
            return new cssWorker();
        }
        if (label === "html" || label === "handlebars" || label === "razor") {
            return new htmlWorker();
        }
        if (label === "typescript" || label === "javascript") {
            return new tsWorker();
        }
        return new editorWorker();
    },
};

const monacoInstance = () => {
    return loader.__getMonacoInstance();
};

const monacoInit = (params: Parameters<typeof loader.config>[0] = {}) => {
    // 暂时无法设置 i18n
    // https://github.com/suren-atoyan/monaco-loader/issues/40
    loader.config({
        monaco,
        ...params
    });
    // 同时等待 monaco 实例与语言映射就绪再返回：
    // 若只等 loader.init()，编辑器创建时 languageMap 可能尚未构建，
    // getEditorLanguage 会把 json 等语言降级为 plaintext，导致语法高亮丢失
    return Promise.all([loader.init(), loadLanguages()]).then(([monaco]) => monaco);
};

export { ContextMenu, lineInfo, monacoEditor, monacoInit, monacoInstance };

