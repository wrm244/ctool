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
    return loader.init();
};

export { ContextMenu, lineInfo, monacoEditor, monacoInit, monacoInstance };

