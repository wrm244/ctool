import {release} from "ctool-adapter-base";
import {parse, join} from "path";
import {readdirSync, statSync, existsSync, rmSync, mkdirSync, cpSync} from "fs";
import os from 'os';

const platform = ["win32", "darwin"].includes(os.platform()) ? os.platform() : "linux";

const getWinExe = () => {
    const path = join(__dirname, "../src-tauri/target/release")
    const files = readdirSync(path)
        .map(item => join(path, item))
        .filter(item => statSync(item).isFile())
        .filter(item => {
            const fileInfo = parse(item)
            return fileInfo.ext === ".exe" && !/setup|install/i.test(fileInfo.name)
        })
    const hit = files.find(item => parse(item).name.includes("ctool"))
    return hit || files[0] || ""
}

const getTauriReleaseFile = (dir: string, name: string, extension: string) => {
    const path = join(__dirname, "../src-tauri/target/release", dir)
    const files = readdirSync(path).map(item => join(path, item)).filter(item => {
        return statSync(item).isFile()
    }) || []
    for (let file of files) {
        const fileInfo = parse(file)
        if (fileInfo.name.includes(name) && extension === fileInfo.ext) {
            return file
        }
    }
    return "";
}

(async () => {
    const files: { path: string, name: string }[] = []

    const filesPush = (path: string, name: string) => {
        if (path === "") {
            return;
        }
        files.push({path, name: `tauri_${name}`})
    }

    if (platform === "win32") {
        // Windows 只发布编译出来的可执行文件，不发 msi / nsis 安装包（安装包已在 tauri.conf 的 targets 里去掉）
        // 注意 tauri build 产出的二进制名不一定等于 productName（当前 Cargo 包名是 tauri-app），
        // 所以按 .exe 扫描 target/release，而不是硬编码文件名。
        filesPush(getWinExe(), "win.exe")
    }
    if (platform === "darwin") {
        filesPush(getTauriReleaseFile("bundle/dmg", 'ctool', '.dmg'), "mac.dmg")
        // mac app 程序 特殊处理
        const appFile = join(__dirname, "../src-tauri/target/release/bundle/macos/ctool.app")
        if (existsSync(appFile)) {
            const appTempDir1 = join(__dirname, "../src-tauri/target/release/bundle/macos/ctool")
            const appTempDir2 = join(appTempDir1, "ctool.app")
            rmSync(appTempDir1, {recursive: true, force: true});
            mkdirSync(appTempDir2, {recursive: true});
            cpSync(appFile, appTempDir2, {recursive: true})
            filesPush(appTempDir1, "mac_app")
        }
    }
    if (platform === "linux") {
        filesPush(getTauriReleaseFile("bundle/deb", 'ctool', '.deb'), "linux.deb")
        filesPush(getTauriReleaseFile("bundle/appimage", 'ctool', '.AppImage'), "linux.AppImage")
    }
    for (let file of files) {
        await release(file.path, file.name)
    }
})()
