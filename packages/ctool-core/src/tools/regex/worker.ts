import {runRegex, RegexTask} from "./run";

// 正则匹配可能触发灾难性回溯（如 (a+)+$ 匹配 aaaa…b），放在 worker 里执行，
// 主线程可以按超时直接 terminate，不会把整个页面卡死。
self.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.method !== "run") {
        return;
    }
    const {id, task} = data as { id: number, task: RegexTask };
    try {
        self.postMessage({method: "result", id, ok: true, data: runRegex(task)});
    } catch (e) {
        self.postMessage({method: "result", id, ok: false, message: (e as Error)?.message || `${e}`});
    }
}, false);
