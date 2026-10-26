mod commands;
mod images;
mod models;
mod paths;
mod storage;

pub use models::{Note, Settings, StateFile, StoreData, Task};

use storage::ensure_storage_layout;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            let root = paths::active_storage_root(app.handle())?;
            ensure_storage_layout(&root)
                .map_err(|error| format!("初始化存储目录失败: {error}"))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::storage_root,
            commands::load_data,
            commands::save_data,
            commands::save_image,
            commands::read_image
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
