use crate::models::StoreData;
use crate::paths::active_storage_root;
use crate::storage::{load_from_root, save_to_root};
use tauri::AppHandle;

#[tauri::command]
pub fn storage_root(app: AppHandle) -> Result<String, String> {
    Ok(active_storage_root(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
pub fn load_data(app: AppHandle) -> Result<Option<StoreData>, String> {
    load_from_root(&active_storage_root(&app)?)
}

#[tauri::command]
pub fn save_data(app: AppHandle, data: StoreData) -> Result<(), String> {
    save_to_root(&active_storage_root(&app)?, &data)
}
