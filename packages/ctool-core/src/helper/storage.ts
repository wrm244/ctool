import {StorageInterface, StorageDataStructureInterface, StorageDataStructure} from '@/types'
import {version} from './util'
import platform from './platform'
import {isObject} from "lodash";
import {isProxy, toRaw, unref} from "vue";
import dayjs from "dayjs";

// 使用原始版本字符串作为缓存版本标识，避免 2.5.10 与 2.51.0 等版本号拼接后产生冲突
const cacheVersion = version
const timestamp = () => {
    return dayjs().unix()
}

// 为缓存 key 添加版本前缀，isVersion 为 true 表示使用版本控制
const addKeyVersion = (key: string, isVersion: boolean = true): string => `${isVersion ? `v_${cacheVersion}_` : 'nv_'}${key}`

// 对存储数据进行编码，expiry 为相对秒数，0 表示永不过期
const encode = <T>(value: T, expiry: number = 0): StorageDataStructureInterface<T> => {
    // 校验过期时间，避免负数导致数据立即过期或逻辑异常
    if (expiry < 0) {
        throw new Error('expiry 必须大于等于 0')
    }
    expiry = expiry > 0 ? expiry + timestamp() : 0
    value = unref(value)
    return {
        v: isProxy(value) ? toRaw(value) : value,
        u: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        e: expiry,
        es: expiry ? dayjs(expiry * 1000).format('YYYY-MM-DD HH:mm:ss') : "",
    }
}

// 解码存储数据，格式非法时返回 null
const decode = <T>(data: StorageDataStructure<T>): StorageDataStructure<T> | null => {
    if (
        !data
        || !isObject(data)
        || !("v" in data)
        || !("e" in data)
    ) {
        return null;
    }
    return data
}

class StorageObject {
    private readonly _handle: StorageInterface;

    constructor(handle: StorageInterface) {
        this._handle = handle;
    }

    get handle(): StorageInterface {
        return this._handle;
    }

    get<T>(key: string, def: T | null = null, isVersion: boolean | null = null): T | null {
        let data: StorageDataStructure<T>;
        // 自动判断有无版本号
        if (isVersion === null) {
            // 默认获取有版本号数据
            data = decode<T>(this._handle.get<T>(addKeyVersion(key)))
            if (data === null) {
                // 获取无版本数据
                data = decode<T>(this._handle.get<T>(addKeyVersion(key, false)))
            }
        }
        // 强制指定有无版本号
        else {
            data = decode<T>(this._handle.get<T>(addKeyVersion(key, isVersion)))
        }

        // 不存在/过期
        if (data === null || (data.e !== 0 && data.e < timestamp())) {
            // 移除过期
            if (data !== null) {
                this.remove(key)
            }
            return def
        }
        return data.v
    }

    // 默认有版本号
    set<T>(key: string, value: T, expiry: number = 0, isVersion: boolean = true): void {
        this._handle.set<T>(addKeyVersion(key, isVersion), encode<T>(value, expiry))
    }

    // 不使用版本号
    setNoVersion<T>(key: string, value: T, expiry: number = 0): void {
        this.set<T>(key, value, expiry, false)
    }

    remove(key: string): void {
        this._handle.remove(addKeyVersion(key))
        this._handle.remove(addKeyVersion(key, false))
    }

    // 删除 不添加版本前缀
    delete(key: string) {
        this._handle.remove(key)
    }

    // 移除过期数据：直接读取原始数据并检查过期时间，避免嵌套调用 get 的额外开销
    flushExpired(): void {
        const now = timestamp();
        for (const key of this.getAllKey()) {
            const raw = this._handle.get<StorageDataStructure<any>>(key);
            if (raw && raw.e !== 0 && raw.e < now) {
                this._handle.remove(key);
            }
        }
    }

    getAllKey(): string[] {
        return this._handle.getAllKey();
    }

    clear() {
        this._handle.clear()
    }
}

const storage = new StorageObject(platform.runtime.storage)

// 版本号前缀正则：提取为常量避免循环中重复编译
const VERSION_KEY_RE = /^v_(.+?)_/;

const clearExpireVersion = () => {
    const cacheVersionName = "cache_version";
    if (cacheVersion === storage.get(cacheVersionName)) {
        return;
    }
    storage.setNoVersion(cacheVersionName, cacheVersion)
    for (const key of storage.getAllKey()) {
        const match = VERSION_KEY_RE.exec(key)
        if (match === null) {
            continue;
        }
        // cacheVersion 现在使用原始版本字符串，直接比较
        if (cacheVersion !== match[1]) {
            storage.delete(key)
        }
    }
}
// 清理过期数据
setTimeout(() => {
    // 清理过期数据
    storage.flushExpired();
    // 清理过期版本数据
    clearExpireVersion();
}, 100);


export default storage
