import {unescape, isArray} from "lodash";
import {sanitizeHtml} from "@/helper/sanitize";

const createTempElement = (innerHTML = "", type = "div", id = "") => {
    const el = document.createElement(type);
    el.id = id ? id : `ctool-temp-${Math.ceil(Math.random() * 99999)}`
    el.style.cssText = "display:none;"
    // 先消毒 HTML 再写入 DOM，防御 XSS（移除 script、事件处理器等）
    el.innerHTML = sanitizeHtml(innerHTML)
    // 不再把临时节点挂到 body 上：解析不需要节点在文档里，
    // 挂上去只会让每次解析都残留一份 DOM（SerializeInput 每次输入都会解析一次）
    return el;
}

// HTML 特殊字符转义，避免单元格内容里的 & < > 破坏表格结构
const escapeHtml = (value: any): string => `${value ?? ""}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const nodeFilter = (item: string): string => {
    if (item === null) {
        return "";
    }
    const re = new RegExp("</?\\w+((\\s+\\w+(\\s*=\\s*(?:\".*?\"|'.*?'|[^'\">\\s]+))?)+\\s*|\\s*)/?>", 'igm');
    item = item.replace(/\r\n|\r|\n/gmi, ' ');
    item = item.replace(/\n|<br>|<br\/>|<br \/>/gmi, '\n');
    item = item.replace(re, '');
    item = unescape(item);
    item = item.replace(/&nbsp;/gmi, " ");
    return item.trim();
}

const jsonOutputFormat = (json, type = "json", keyed_key = 0) => {
    if (type === "keyed") {
        const keys = Object.keys(json[0])
        let result = {}
        for (let item of json) {
            let item_key = keys[keyed_key]
            result[item[item_key]] = item
        }
        return result
    }
    if (type === "row_array") {
        let result = json.map((item) => {
            return Object.values(item)
        })
        if (result.length > 0) {
            result = [
                Object.keys(json[0]),
                ...result
            ]
        }
        return result
    }
    if (type === "column_array") {
        const keys = Object.keys(json[0])
        let result = {}
        for (let key of keys) {
            result[key] = json.map((item) => {
                return item[key]
            })
        }
        return result
    }
    return json
}


const tableKeysFromElement = (tableElement?: HTMLTableElement): string[] => {
    const firstRow = tableElement?.getElementsByTagName('tr')[0];
    if (!firstRow) {
        return [];
    }
    const cells = firstRow.querySelectorAll('td,th');
    const result: string[] = [];
    for (let n = 0; n < cells.length; n++) {
        result.push(nodeFilter(cells[n].innerHTML))
    }
    return result;
}

export const tableKeys = (table) => {
    table = table.trim();
    if (!table) {
        return [];
    }
    return tableKeysFromElement(createTempElement(table).getElementsByTagName('table')[0]);
}

export const parse = (table = "", {
    keyed_key = 0,
    type = "row_object"
} = {}) => {
    table = table.trim();
    if (!table) {
        return "";
    }
    // 只创建一次临时节点：表头与数据行共用同一份 DOM，避免重复解析整张表
    const tableElement = createTempElement(table).getElementsByTagName('table')[0]
    if (!tableElement) {
        return "";
    }
    const keys = tableKeysFromElement(tableElement)
    const rows = tableElement.getElementsByTagName('tr')
    let result: any[] = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i].querySelectorAll('td');
        let resultRow = {}
        for (let k = 0; k < keys.length; k++) {
            resultRow[keys[k]] = nodeFilter(k in row ? row[k].innerHTML : "")
        }
        result.push(resultRow)
    }
    return jsonOutputFormat(
        result,
        type,
        keyed_key
    )
}


const stringify = (json:any, {header = true} = {}) => {
    if (!isArray(json) || json.length < 1) {
        throw new Error("records is not iterable")
    }
    let html = ["<table>"];
    let keys = Object.keys(json[0])
    if (header) {
        html.push(
            '<thead>',
            '<tr>',
            ...keys.map((item) => {
                return `<th>${escapeHtml(item)}</th>`
            }),
            '</tr>',
            '</thead>'
        )
    }
    html.push("<tbody>")
    for (let row of json) {
        html.push("<tr>", ...keys.map((item) => {
            return `<td>${escapeHtml(item in row ? row[item] : "")}</td>`
        }), '</tr>');
    }
    html.push("</tbody></table>")
    return html.join("")
}

export default {
    parse, stringify
}
