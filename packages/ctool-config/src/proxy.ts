// 在平台 platform.runtime.webSecurity() === true 时 需要配置代理访问的域名
const domains: string[] = [
    "api.jdoodle.com",
    "armconverter.com"
]

const normalizeHostname = (hostname: string) => hostname.toLowerCase().replace(/\.$/, "")

export default {
    defaultProxyUrl: "https://ctool.dev/api/proxy",
    is(url: string) {
        if (url === "") {
            return false
        }
        try {
            const parsed = new URL(url)
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                return false
            }
            const hostname = normalizeHostname(parsed.hostname)
            return domains.some(domain => {
                const allowed = normalizeHostname(domain)
                return hostname === allowed || hostname.endsWith(`.${allowed}`)
            })
        } catch {
            return false
        }
    },
    getDomains() {
        return domains
    },
    // chrome / edge / firefox 浏览器扩展  manifest.json permissions
    getManifestPermissions() {
        return domains.map(domain => {
            domain = domain.trim();
            const lists = domain.split('.')
            if (lists.length < 2) {
                return "";
            }
            if (lists.length === 2) {
                return [`*.${domain}`, domain]
            }
            return lists.join(".");
        }).flat().filter(str => str !== "").map(str => `*://${str}/*`)
    }
}
