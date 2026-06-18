import storage from "@/helper/storage"
import {HistoryItemStructure} from "@/types"
import event from "@/event"
import {toolExists, getTool} from "@/config"
import dayjs from "dayjs"
import {cloneDeep, isEqual} from "lodash";

// 工具缓存数据过期时间(秒)
const TOOL_DATA_EXPIRY: number = 3600 * 24 * 7
// 最大历史条数
const HISTORY_MAX_LENGTH: number = 50
// 历史数据最大长度
const HISTORY_MAX_SIZE: number = 200 * 1024

class History<T = any> {
    lists: HistoryItemStructure<T>[] = []
    name: string
    static instance: Record<string, History> = {};

    static itemFactory<T>(item: T): HistoryItemStructure<T> {
        return {
            t: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            v: item
        }
    }

    static change() {
        event.dispatch('history_change')
    }

    static repository<T = any>(name:string): History<T> {
        if (!(name in History.instance)) {
            History.instance[name] = new History<T>(name)
        }
        return History.instance[name]
    }

    constructor(name: string) {
        this.name = name
        this.lists = storage.get<HistoryItemStructure<T>[]>(this.cacheName(), [], true) || []
    }

    cacheName() {
        return `tool_history_${this.name}`
    }

    // 插入
    push(_item: T): void {
        // 先序列化判断大小，避免对超大无效数据做深拷贝
        let itemLength: number
        try {
            itemLength = JSON.stringify(_item).length;
        } catch (e) {
            console.warn('历史数据序列化失败，跳过保存:', e)
            return;
        }
        if (itemLength > HISTORY_MAX_SIZE) {
            console.log(`skip data too big:${itemLength} > ${HISTORY_MAX_SIZE}`)
            return;
        }

        const item: T = cloneDeep(_item)

        // 与最新一致过滤
        if (
            this.lists.length > 0
            && isEqual(this.lists[0].v, item)
        ) {
            console.log("skip latest")
            return;
        }

        // 删除已有：从后往前遍历删除，避免索引错位导致漏删
        for (let i = this.lists.length - 1; i >= 0; i--) {
            if (isEqual(this.lists[i].v, item)) {
                this.lists.splice(i, 1)
            }
        }

        // 插入
        this.lists.unshift(History.itemFactory(item))

        // 删除多余
        if (this.length() > HISTORY_MAX_LENGTH) {
            this.lists.pop()
        }
        storage.set<HistoryItemStructure<T>[]>(this.cacheName(), this.lists, TOOL_DATA_EXPIRY)
        History.change()
    }

    // 获取
    get(index: number): T | null {
        return index >= 0 && index < this.length() ? cloneDeep(this.lists[index].v) : null
    }

    getWithTime(index: number) {
        return index >= 0 && index < this.length() ? cloneDeep(this.lists[index]) : null
    }

    // 长度
    length(): number {
        return this.lists.length;
    }

    // 清理
    clear() {
        storage.remove(this.cacheName())
        this.lists = []
        History.change()
    }

    all(): HistoryItemStructure<T>[] {
        return cloneDeep(this.lists)
    }

    // 根据条件查找历史数据索引，避免 all() 深拷贝全部数据
    findIndex(predicate: (item: HistoryItemStructure<T>) => boolean): number {
        for (let i = 0; i < this.lists.length; i++) {
            if (predicate(this.lists[i])) {
                return i;
            }
        }
        return -1;
    }
}

let errorInstance: History

export default <T = any>(tool: string, feature: string = "") => {
    if (
        !toolExists(tool)
        || !getTool(tool).existFeature(feature)
    ) {
        errorInstance = errorInstance ? errorInstance : new History('error')
        return errorInstance
    }
    return History.repository<T>(`${tool}_${feature}`)
}
