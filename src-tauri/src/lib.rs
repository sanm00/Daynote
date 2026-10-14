use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;
#[cfg(not(debug_assertions))]
use tauri::Manager;

const STATE_FILE: &str = "state.json";
const TASKS_FILE: &str = "tasks.json";
const NOTES_FILE: &str = "notes.json";
const BACKUP_DIR: &str = "backups";
const BACKUP_KEEP: usize = 20;
const DATA_DIR_ENV: &str = "DAYNOTE_DATA_DIR";
const SCHEMA_VERSION: u32 = 1;

fn default_version() -> u32 {
    SCHEMA_VERSION
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub theme: String,
    pub default_tag: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub tag: String,
    pub prio: String,
    pub date: Option<String>,
    pub done: bool,
    pub done_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parsed_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: i64,
    pub title: String,
    #[serde(default)]
    pub content: String,
    pub tag: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StateFile {
    #[serde(default = "default_version")]
    pub version: u32,
    pub settings: Settings,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoreData {
    pub version: u32,
    pub settings: Settings,
    pub tasks: Vec<Task>,
    pub notes: Vec<Note>,
}

/// Scratch directory that relocates everything the app writes. Trusted as-is,
/// so tests can point it at a temp folder instead of faking `HOME`.
fn data_dir_override() -> Option<PathBuf> {
    match std::env::var_os(DATA_DIR_ENV) {
        Some(raw) if !raw.to_string_lossy().trim().is_empty() => Some(PathBuf::from(raw)),
        _ => None,
    }
}

/// Development builds keep their data in `<crate>/data` so a fresh clone
/// never writes into the user's home directory. The path is derived from the
/// crate directory at compile time because a debug build launched from Finder
/// runs with `/` as its working directory. Living inside the crate also keeps
/// the directory out of Vite's watch scope, since that side of the checkout is
/// already ignored by the dev server.
#[cfg(debug_assertions)]
fn development_data_root(crate_dir: &Path) -> PathBuf {
    crate_dir.join("data")
}

#[cfg(debug_assertions)]
fn default_storage_root(_app: &AppHandle) -> Result<PathBuf, String> {
    Ok(development_data_root(Path::new(env!("CARGO_MANIFEST_DIR"))))
}

/// Release builds live in `~/.daynote`, independent of the working directory.
#[cfg(not(debug_assertions))]
fn default_storage_root(app: &AppHandle) -> Result<PathBuf, String> {
    match std::env::var_os("HOME") {
        Some(home) if !home.to_string_lossy().trim().is_empty() => {
            Ok(PathBuf::from(home).join(".daynote"))
        }
        _ => app
            .path()
            .app_data_dir()
            .map(|dir| dir.join(".daynote"))
            .map_err(|error| error.to_string()),
    }
}

fn active_storage_root(app: &AppHandle) -> Result<PathBuf, String> {
    if let Some(root) = data_dir_override() {
        return Ok(root);
    }
    default_storage_root(app)
}

fn ensure_storage_layout(root: &Path) -> Result<(), String> {
    fs::create_dir_all(root).map_err(|error| error.to_string())?;
    fs::create_dir_all(root.join(BACKUP_DIR)).map_err(|error| error.to_string())?;
    Ok(())
}

fn timestamp() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}-{:03}", now.as_secs(), now.subsec_millis())
}

fn backup_file(root: &Path, path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    let dir = root.join(BACKUP_DIR).join(timestamp());
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    if let Some(name) = path.file_name() {
        fs::copy(path, dir.join(name)).map_err(|error| error.to_string())?;
    }
    prune_backups(root)?;
    Ok(())
}

/// Keep only the newest `BACKUP_KEEP` backup folders; the timestamp prefix is
/// zero-padded so a plain name comparison orders them chronologically.
fn prune_backups(root: &Path) -> Result<(), String> {
    let dir = root.join(BACKUP_DIR);
    let entries = match fs::read_dir(&dir) {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };
    let mut names: Vec<String> = entries
        .flatten()
        .filter_map(|entry| entry.file_name().into_string().ok())
        .collect();
    if names.len() <= BACKUP_KEEP {
        return Ok(());
    }
    names.sort();
    for name in &names[..names.len() - BACKUP_KEEP] {
        let _ = fs::remove_dir_all(dir.join(name));
    }
    Ok(())
}

fn write_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let tmp = path.with_extension("tmp");
    {
        let mut file = fs::File::create(&tmp).map_err(|error| error.to_string())?;
        file.write_all(bytes).map_err(|error| error.to_string())?;
        file.sync_all().map_err(|error| error.to_string())?;
    }
    fs::rename(&tmp, path).map_err(|error| error.to_string())?;
    Ok(())
}

/// Skips identical content so a debounced save that changes nothing neither
/// rewrites the file nor spawns a backup.
fn write_if_changed(root: &Path, name: &str, bytes: &[u8]) -> Result<(), String> {
    let path = root.join(name);
    if let Ok(existing) = fs::read(&path) {
        if existing == bytes {
            return Ok(());
        }
        backup_file(root, &path)?;
    }
    write_atomic(&path, bytes)
}

fn read_optional<T: for<'de> Deserialize<'de>>(path: &Path) -> Result<Option<T>, String> {
    match fs::read(path) {
        Ok(bytes) => serde_json::from_slice(&bytes)
            .map(Some)
            .map_err(|error| format!("{} 解析失败: {error}", path.display())),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

fn load_from_root(root: &Path) -> Result<Option<StoreData>, String> {
    let state: Option<StateFile> = read_optional(&root.join(STATE_FILE))?;
    let tasks: Option<Vec<Task>> = read_optional(&root.join(TASKS_FILE))?;
    let notes: Option<Vec<Note>> = read_optional(&root.join(NOTES_FILE))?;

    if state.is_none() && tasks.is_none() && notes.is_none() {
        return Ok(None);
    }

    let state = state.unwrap_or(StateFile {
        version: SCHEMA_VERSION,
        settings: Settings {
            theme: "light".to_string(),
            default_tag: "工作".to_string(),
        },
    });

    Ok(Some(StoreData {
        version: state.version,
        settings: state.settings,
        tasks: tasks.unwrap_or_default(),
        notes: notes.unwrap_or_default(),
    }))
}

fn save_to_root(root: &Path, data: &StoreData) -> Result<(), String> {
    ensure_storage_layout(root)?;

    let state = StateFile {
        version: SCHEMA_VERSION,
        settings: data.settings.clone(),
    };

    let state_bytes = serde_json::to_vec_pretty(&state).map_err(|error| error.to_string())?;
    let tasks_bytes = serde_json::to_vec_pretty(&data.tasks).map_err(|error| error.to_string())?;
    let notes_bytes = serde_json::to_vec_pretty(&data.notes).map_err(|error| error.to_string())?;

    write_if_changed(root, STATE_FILE, &state_bytes)?;
    write_if_changed(root, TASKS_FILE, &tasks_bytes)?;
    write_if_changed(root, NOTES_FILE, &notes_bytes)?;

    Ok(())
}

#[tauri::command]
fn storage_root(app: AppHandle) -> Result<String, String> {
    Ok(active_storage_root(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
fn load_data(app: AppHandle) -> Result<Option<StoreData>, String> {
    load_from_root(&active_storage_root(&app)?)
}

#[tauri::command]
fn save_data(app: AppHandle, data: StoreData) -> Result<(), String> {
    save_to_root(&active_storage_root(&app)?, &data)
}

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
            let root = active_storage_root(app.handle())?;
            ensure_storage_layout(&root)
                .map_err(|error| format!("初始化存储目录失败: {error}"))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![storage_root, load_data, save_data])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_root(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "daynote-test-{tag}-{}-{:?}",
            timestamp(),
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    fn sample() -> StoreData {
        StoreData {
            version: SCHEMA_VERSION,
            settings: Settings {
                theme: "dark".to_string(),
                default_tag: "学习".to_string(),
            },
            tasks: vec![Task {
                id: 1,
                title: "写周报".to_string(),
                tag: "工作".to_string(),
                prio: "high".to_string(),
                date: Some("2026-10-13".to_string()),
                done: false,
                done_at: None,
                source: Some("quick".to_string()),
                parsed_at: None,
            }],
            notes: vec![Note {
                id: 7,
                title: "灵感".to_string(),
                content: "# 标题\n正文".to_string(),
                tag: "生活".to_string(),
                created_at: "2026-10-13T00:00:00.000Z".to_string(),
                updated_at: "2026-10-13T00:00:00.000Z".to_string(),
            }],
        }
    }

    fn backup_count(root: &Path) -> usize {
        fs::read_dir(root.join(BACKUP_DIR))
            .map(|entries| entries.flatten().count())
            .unwrap_or(0)
    }

    #[test]
    fn load_returns_none_for_empty_root() {
        let root = temp_root("empty");
        assert!(load_from_root(&root).unwrap().is_none());
    }

    #[test]
    fn save_then_load_roundtrips() {
        let root = temp_root("roundtrip");
        save_to_root(&root, &sample()).unwrap();

        let loaded = load_from_root(&root).unwrap().expect("data");
        assert_eq!(loaded.settings.theme, "dark");
        assert_eq!(loaded.settings.default_tag, "学习");
        assert_eq!(loaded.tasks.len(), 1);
        assert_eq!(loaded.tasks[0].title, "写周报");
        assert_eq!(loaded.tasks[0].source.as_deref(), Some("quick"));
        assert_eq!(loaded.notes.len(), 1);
        assert_eq!(loaded.notes[0].content, "# 标题\n正文");

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn writing_identical_data_creates_no_backup() {
        let root = temp_root("identical");
        save_to_root(&root, &sample()).unwrap();
        save_to_root(&root, &sample()).unwrap();
        assert_eq!(backup_count(&root), 0);
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn changing_data_creates_a_backup() {
        let root = temp_root("backup");
        save_to_root(&root, &sample()).unwrap();

        let mut next = sample();
        next.tasks[0].done = true;
        save_to_root(&root, &next).unwrap();

        assert_eq!(backup_count(&root), 1);
        let entry = fs::read_dir(root.join(BACKUP_DIR))
            .unwrap()
            .flatten()
            .next()
            .expect("one backup folder");
        assert!(entry.path().join(TASKS_FILE).exists());
        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn prune_keeps_only_the_newest_backups() {
        let root = temp_root("prune");
        ensure_storage_layout(&root).unwrap();
        for i in 0..(BACKUP_KEEP + 5) {
            let dir = root.join(BACKUP_DIR).join(format!("{i:010}"));
            fs::create_dir_all(&dir).unwrap();
            fs::write(dir.join("f"), b"x").unwrap();
        }
        prune_backups(&root).unwrap();

        assert_eq!(backup_count(&root), BACKUP_KEEP);
        // The five oldest (0000000000..0000000004) are gone.
        assert!(!root.join(BACKUP_DIR).join("0000000000").exists());
        assert!(root.join(BACKUP_DIR).join(format!("{:010}", BACKUP_KEEP + 4)).exists());
        let _ = fs::remove_dir_all(&root);
    }

    #[cfg(debug_assertions)]
    #[test]
    fn development_root_is_crate_data_dir() {
        let root = development_data_root(Path::new("/tmp/checkout/src-tauri"));
        assert_eq!(root, Path::new("/tmp/checkout/src-tauri/data"));
    }
}
