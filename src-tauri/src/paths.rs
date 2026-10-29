#[cfg(debug_assertions)]
use std::path::Path;
use std::path::PathBuf;
use tauri::AppHandle;
#[cfg(not(debug_assertions))]
use tauri::Manager;

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

pub fn active_storage_root(app: &AppHandle) -> Result<PathBuf, String> {
    default_storage_root(app)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(debug_assertions)]
    #[test]
    fn development_root_is_crate_data_dir() {
        let root = development_data_root(Path::new("/tmp/checkout/src-tauri"));
        assert_eq!(root, Path::new("/tmp/checkout/src-tauri/data"));
    }
}
