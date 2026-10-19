use crate::models::{Note, Settings, StateFile, StoreData, Task, SCHEMA_VERSION};
use serde::Deserialize;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

pub const STATE_FILE: &str = "state.json";
pub const TASKS_FILE: &str = "tasks.json";
pub const NOTES_FILE: &str = "notes.json";
const BACKUP_DIR: &str = "backups";
const BACKUP_KEEP: usize = 20;

pub fn ensure_storage_layout(root: &Path) -> Result<(), String> {
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

pub fn load_from_root(root: &Path) -> Result<Option<StoreData>, String> {
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

pub fn save_to_root(root: &Path, data: &StoreData) -> Result<(), String> {
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

#[cfg(test)]
mod tests {
    use super::*;

    use std::path::PathBuf;

    fn temp_root(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "daynote-test-{tag}-{}-{}",
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
                begin_date: Some("2026-10-13".to_string()),
                end_date: Some("2026-10-15".to_string()),
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
        assert_eq!(loaded.tasks[0].begin_date.as_deref(), Some("2026-10-13"));
        assert_eq!(loaded.tasks[0].end_date.as_deref(), Some("2026-10-15"));
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
}
