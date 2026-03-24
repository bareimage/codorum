use crate::error::CodorumError;
use crate::models::*;
use crate::registry::read_file_info;
use crate::snapshot::{initial_snapshot, random_placeholder};
use crate::AppState;
use std::collections::HashSet;
use std::path::PathBuf;
use std::process::Command;
use tauri::State;

#[tauri::command]
pub fn get_files(state: State<AppState>) -> Result<Vec<WatchedFile>, CodorumError> {
    state.registry.get_all()
}

#[tauri::command]
pub fn select_file(id: String, state: State<AppState>) -> Result<Option<WatchedFile>, CodorumError> {
    match state.registry.get_by_id(&id)? {
        Some(mut f) => {
            if let Ok(content) = std::fs::read_to_string(&f.path) {
                f.content = content;
            }
            Ok(Some(f))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub fn save_file(
    id: String,
    content: String,
    state: State<AppState>,
) -> Result<WatchedFile, CodorumError> {
    state.registry.save_file(&id, &content, &state.db)
}

#[tauri::command]
pub fn refresh_file(path: String) -> Option<RefreshResult> {
    let pb = PathBuf::from(&path);
    let content = std::fs::read_to_string(&pb).ok()?;
    let meta = std::fs::metadata(&pb).ok()?;
    let modified = meta
        .modified()
        .ok()?
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();
    Some(RefreshResult { content, modified })
}

#[tauri::command]
pub fn create_file(
    dir: String,
    name: String,
    state: State<AppState>,
) -> Result<WatchedFile, CodorumError> {
    let dir_path = PathBuf::from(&dir);
    let file_path = dir_path.join(&name);
    if file_path.exists() {
        return Err(CodorumError::AlreadyExists(
            file_path.to_string_lossy().to_string(),
        ));
    }
    let ext = file_path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let initial = if ext == "md" || ext == "markdown" || ext == "mdx" {
        random_placeholder()
    } else {
        "\n".to_string()
    };
    std::fs::write(&file_path, &initial)?;
    let info = read_file_info(&file_path)
        .ok_or_else(|| CodorumError::FileNotFound(file_path.to_string_lossy().to_string()))?;
    let snap = initial_snapshot(&info.content);
    state.db.add_file_with_snapshot(&info.id, &info.path, &info.name, &info.extension, &snap)?;
    state.registry.insert(info.clone())?;
    {
        let mut watcher = state.watcher.lock().map_err(|_| CodorumError::Lock)?;
        watcher.watch(&dir);
    }
    Ok(info)
}

#[tauri::command]
pub fn remove_file(id: String, state: State<AppState>) -> Result<(), CodorumError> {
    let path = state.registry.get_by_id(&id)?.map(|f| f.path.clone());
    state.registry.remove_by_id(&id).ok();
    if let Some(path) = path {
        state.db.remove_file_completely(&path)?;
    }
    Ok(())
}

#[tauri::command]
pub fn remove_files(ids: Vec<String>, state: State<AppState>) -> Result<(), CodorumError> {
    let paths: Vec<String> = ids.iter()
        .filter_map(|id| state.registry.get_by_id(id).ok().flatten().map(|f| f.path.clone()))
        .collect();
    state.registry.remove_by_ids(&ids).ok();
    for path in paths {
        state.db.remove_file_completely(&path)?;
    }
    Ok(())
}

#[tauri::command]
pub fn toggle_pin(id: String, state: State<AppState>) -> Result<bool, CodorumError> {
    let new_state = state.registry.toggle_pin(&id)?;
    if let Ok(Some(file)) = state.registry.get_by_id(&id) {
        state.db.set_pinned(&file.path, new_state)?;
    }
    Ok(new_state)
}

#[tauri::command]
pub async fn add_files(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<WatchedFile>, CodorumError> {
    use tauri_plugin_dialog::DialogExt;

    let paths = app
        .dialog()
        .file()
        .add_filter("All Files", &["*"])
        .blocking_pick_files();

    let paths = match paths {
        Some(p) => p,
        None => return Ok(vec![]),
    };

    let mut added = Vec::new();
    let mut dirs_to_watch = HashSet::new();

    for file_path in paths {
        let path = file_path.into_path().map_err(|e| {
            CodorumError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))
        })?;
        let path_str = path.to_string_lossy().to_string();
        if state.registry.contains_path(&path_str)? {
            continue;
        }
        if let Some(info) = read_file_info(&path) {
            if let Some(parent) = path.parent() {
                dirs_to_watch.insert(parent.to_string_lossy().to_string());
            }
            let snap = initial_snapshot(&info.content);
            state.db.add_file_with_snapshot(&info.id, &info.path, &info.name, &info.extension, &snap)?;
            state.registry.insert(info.clone())?;
            added.push(info);
        }
    }

    {
        let mut watcher = state.watcher.lock().map_err(|_| CodorumError::Lock)?;
        for dir in &dirs_to_watch {
            watcher.watch(dir);
        }
    }

    Ok(added)
}

#[tauri::command]
pub async fn add_directory(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<DirectoryResult, CodorumError> {
    use tauri_plugin_dialog::DialogExt;

    let dir = app.dialog().file().blocking_pick_folder();

    let dir = match dir {
        Some(d) => d.into_path().map_err(|e| {
            CodorumError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))
        })?,
        None => {
            return Ok(DirectoryResult {
                source_dir: String::new(),
                dir_name: String::new(),
                files: vec![],
            })
        }
    };

    let dir_name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| dir.to_string_lossy().to_string());
    let source_dir = dir.to_string_lossy().to_string();

    let mut added = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let path_str = path.to_string_lossy().to_string();
            if state.registry.contains_path(&path_str)? {
                continue;
            }
            if let Some(info) = read_file_info(&path) {
                let snap = initial_snapshot(&info.content);
                state.db.add_file_with_snapshot(&info.id, &info.path, &info.name, &info.extension, &snap)?;
                state.registry.insert(info.clone())?;
                added.push(info);
            }
        }
    }

    if !added.is_empty() {
        let mut watcher = state.watcher.lock().map_err(|_| CodorumError::Lock)?;
        watcher.watch(&source_dir);
    }

    Ok(DirectoryResult {
        source_dir,
        dir_name,
        files: added,
    })
}

#[tauri::command]
pub fn drop_paths(
    paths: Vec<String>,
    state: State<AppState>,
) -> Result<DropBatchResult, CodorumError> {
    let mut directories = Vec::new();
    let mut loose_files = Vec::new();
    let mut dirs_to_watch = HashSet::new();

    for p in &paths {
        let path = PathBuf::from(p);
        if path.is_dir() {
            let dir_name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| p.clone());
            let source_dir = p.clone();
            let mut dir_files = Vec::new();

            if let Ok(entries) = std::fs::read_dir(&path) {
                for entry in entries.flatten() {
                    let ep = entry.path();
                    if !ep.is_file() {
                        continue;
                    }
                    let ep_str = ep.to_string_lossy().to_string();
                    if state.registry.contains_path(&ep_str)? {
                        continue;
                    }
                    if let Some(info) = read_file_info(&ep) {
                        let snap = initial_snapshot(&info.content);
                        state.db.add_file_with_snapshot(&info.id, &info.path, &info.name, &info.extension, &snap)?;
                        state.registry.insert(info.clone())?;
                        dir_files.push(info);
                    }
                }
            }

            if !dir_files.is_empty() {
                dirs_to_watch.insert(p.clone());
            }

            directories.push(DirectoryResult {
                source_dir,
                dir_name,
                files: dir_files,
            });
        } else if path.is_file() {
            if state.registry.contains_path(p)? {
                continue;
            }
            if let Some(info) = read_file_info(&path) {
                if let Some(parent) = path.parent() {
                    dirs_to_watch.insert(parent.to_string_lossy().to_string());
                }
                let snap = initial_snapshot(&info.content);
                state.db.add_file_with_snapshot(&info.id, &info.path, &info.name, &info.extension, &snap)?;
                state.registry.insert(info.clone())?;
                loose_files.push(info);
            }
        }
    }

    {
        let mut watcher = state.watcher.lock().map_err(|_| CodorumError::Lock)?;
        for dir in &dirs_to_watch {
            watcher.watch(dir);
        }
    }

    Ok(DropBatchResult {
        directories,
        loose_files,
    })
}

#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), CodorumError> {
    Command::new("open")
        .arg("-R")
        .arg(&path)
        .spawn()
        .map_err(CodorumError::Io)?;
    Ok(())
}

#[tauri::command]
pub fn get_snapshots(file_path: String, state: State<AppState>) -> Vec<FileSnapshot> {
    state.db.get_snapshots(&file_path)
}

#[tauri::command]
pub fn load_watched_files(
    state: State<AppState>,
) -> Result<Vec<WatchedFile>, CodorumError> {
    let rows = state.db.get_watched_files();
    let mut loaded = Vec::new();
    let mut dirs_to_watch = HashSet::new();

    for (id, path, _name, _ext, pinned) in rows {
        let pb = PathBuf::from(&path);
        if !pb.is_file() {
            continue;
        }
        if state.registry.contains_path(&path)? {
            continue;
        }
        if let Some(mut info) = read_file_info(&pb) {
            info.id = id;
            info.pinned = pinned;
            if let Some(latest) = state.db.get_latest_snapshot(&info.path) {
                info.lines_added = latest.lines_added;
                info.lines_removed = latest.lines_removed;
            }
            if let Some(parent) = pb.parent() {
                dirs_to_watch.insert(parent.to_string_lossy().to_string());
            }
            state.registry.insert(info.clone())?;
            loaded.push(info);
        }
    }

    {
        let mut watcher = state.watcher.lock().map_err(|_| CodorumError::Lock)?;
        for dir in &dirs_to_watch {
            watcher.watch(dir);
        }
    }

    Ok(loaded)
}
