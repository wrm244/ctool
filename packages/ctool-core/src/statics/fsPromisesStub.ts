// cron-parser 的 CronFileParser 在浏览器端不会被执行，但其 require('fs/promises')
// 会被 node-stdlib-browser 错误地映射为 mock/empty.js/promises，导致 rolldown 构建失败。
// 这里提供空 stub 阻止 polyfill 映射。
export default {};
