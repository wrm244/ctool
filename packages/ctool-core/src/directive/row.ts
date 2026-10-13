/**
 * 网格布局
 * v-row="a:b" a:d布局 间距默认5px a/b 为数字
 * v-row="a-b-c|10" a:d:c布局 间距默认10px a/b/c 为数字
 * v-row="a-100px|10" a:100px布局 间距默认10px a/b 为数字
 */
import {App} from "vue";
const update = (el: HTMLElement, value: string = "") => {
    el.setAttribute('ctool-v-row',value)
    // 项目间距
    if (!value.includes("|")) {
        value = `${value}|5` // 默认值
    }
    let [column, gap] = value.split("|")
    if (column === "") {
        return;
    }
    let columns = column.split("-");
    if (columns.length < 2) {
        return;
    }
    el.style.display = "grid"
    el.style.gridTemplateColumns = columns.map((item) => {
        if (/^\d+$/.test(item)){
            return `minmax(0, ${item}fr)`
        }
        return `${item}`
    }).join(" ");
    el.style.gap = `${gap}px`
}

export default (app: App) => {
    app.directive('row', {
        // 只在插入/更新前执行一次，mounted/updated 重复执行同一逻辑属于无效开销
        beforeMount(el: HTMLElement, binding: { value: string }) {
            update(el, binding.value)
        },
        beforeUpdate(el: HTMLElement, binding: { value: string }) {
            update(el, binding.value)
        },
    })
}
