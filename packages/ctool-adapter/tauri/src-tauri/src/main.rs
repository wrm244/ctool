#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use dirs;
use reqwest::blocking::Client;
use std::path::PathBuf;
use std::time::Duration;

fn check_file_exists_in_home_dir(file_path: &str) -> bool {
    let home_dir = match dirs::home_dir() {
        Some(path) => path,
        None => return false,
    };

    let file_path = PathBuf::from(&home_dir).join(file_path);

    if let Err(_) = file_path.metadata() {
        return false;
    }

    file_path.exists()
}

fn is_url_accessible(url: &str) -> bool {
    let client = Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .unwrap();
    match client.head(url).send() {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

#[tauri::command]
fn toggle_dev_tools(window: tauri::WebviewWindow) {
    if !window.is_devtools_open() {
        window.open_devtools();
    } else {
        window.close_devtools();
    }
}

#[tauri::command]
fn ctool_is_use_offline() -> bool {
    if check_file_exists_in_home_dir(".ctool.tauri_use_local_file.lock") {
        return true;
    }
    return !is_url_accessible("https://ctool.dev/_status.html");
}

fn main() {
    tauri::Builder::new()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            toggle_dev_tools,
            ctool_is_use_offline
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
