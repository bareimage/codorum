mod watcher;

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::SystemTime;
use tauri::{Emitter, Manager, State};
use watcher::{FileEvent, FileWatcherManager};

const PLACEHOLDERS_JSON: &str = include_str!("../../src/data/devils-dictionary.json");

fn random_placeholder() -> String {
    let placeholders: Vec<String> =
        serde_json::from_str(PLACEHOLDERS_JSON).unwrap_or_default();
    if placeholders.is_empty() {
        return String::new();
    }
    let idx = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_millis() as usize)
        .unwrap_or(0)
        % placeholders.len();
    let raw = &placeholders[idx];

    // Parse "Word, n.  definition text" into formatted markdown blockquote
    // Format: > ***Word***, *n.* definition text
    //         >
    //         > — Ambrose Bierce, *The Devil's Dictionary*
    if let Some(comma_pos) = raw.find(',') {
        let word = &raw[..comma_pos];
        let rest = raw[comma_pos + 1..].trim_start();
        // Split part-of-speech from definition: "n.  definition" → ("n.", "definition")
        if let Some(dot_pos) = rest.find('.') {
            let pos = &rest[..=dot_pos];
            let defn = rest[dot_pos + 1..].trim_start();
            return format!(
                "> ***{}***, *{}* {}\n>\n> \u{2014} Ambrose Bierce, *The Devil\u{2019}s Dictionary*",
                word, pos, defn
            );
        }
    }
    // Fallback: wrap raw text in blockquote
    format!(
        "> {}\n>\n> \u{2014} Ambrose Bierce, *The Devil\u{2019}s Dictionary*",
        raw
    )
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSnapshot {
    pub id: String,
    pub timestamp: u64,
    pub content: String,
    pub patch: Option<String>,
    pub lines_added: usize,
    pub lines_removed: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchedFile {
    pub id: String,
    pub path: String,
    pub name: String,
    pub extension: String,
    pub content: String,
    pub modified: u64,
    pub pinned: bool,
    pub history: Vec<FileSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefreshResult {
    pub content: String,
    pub modified: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryResult {
    pub source_dir: String,
    pub dir_name: String,
    pub files: Vec<WatchedFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DropBatchResult {
    pub directories: Vec<DirectoryResult>,
    pub loose_files: Vec<WatchedFile>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FileRenamedPayload {
    pub old_path: String,
    pub new_path: String,
    pub new_name: String,
    pub new_extension: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SavedFileEntry {
    pub id: String,
    pub path: String,
    pub pinned: bool,
}

pub struct AppState {
    pub files: std::sync::Arc<std::sync::Mutex<Vec<WatchedFile>>>,
    pub watcher: Mutex<FileWatcherManager>,
}

fn read_file_info(path: &PathBuf) -> Option<WatchedFile> {
    let name = path.file_stem()?.to_string_lossy().to_string();
    let ext = path.extension().unwrap_or_default().to_string_lossy().to_string();
    let content = std::fs::read_to_string(path).ok()?;
    let meta = std::fs::metadata(path).ok()?;
    let modified = meta
        .modified()
        .ok()?
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();

    let now = SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let initial_snapshot = FileSnapshot {
        id: uuid::Uuid::new_v4().to_string(),
        timestamp: now,
        content: content.clone(),
        patch: None,
        lines_added: content.lines().count(),
        lines_removed: 0,
    };

    Some(WatchedFile {
        id: uuid::Uuid::new_v4().to_string(),
        path: path.to_string_lossy().to_string(),
        name,
        extension: ext,
        content,
        modified,
        pinned: false,
        history: vec![initial_snapshot],
    })
}

#[tauri::command]
fn refresh_file(path: String) -> Option<RefreshResult> {
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
fn create_file(dir: String, name: String, state: State<AppState>) -> Result<WatchedFile, String> {
    let dir_path = PathBuf::from(&dir);
    let file_path = dir_path.join(&name);
    if file_path.exists() {
        return Err("File already exists".to_string());
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
    std::fs::write(&file_path, &initial).map_err(|e| e.to_string())?;
    let info = read_file_info(&file_path).ok_or("Failed to read created file")?;
    {
        let mut files = state.files.lock().expect("mutex poisoned");
        files.push(info.clone());
    }
    {
        let mut watcher = state.watcher.lock().expect("mutex poisoned");
        watcher.watch(&dir);
    }
    Ok(info)
}

#[tauri::command]
fn get_files(state: State<AppState>) -> Vec<WatchedFile> {
    state.files.lock().expect("mutex poisoned").clone()
}

#[tauri::command]
fn select_file(id: String, state: State<AppState>) -> Option<WatchedFile> {
    let files = state.files.lock().expect("mutex poisoned");
    let file = files.iter().find(|f| f.id == id)?;
    // Re-read content from disk
    let content = std::fs::read_to_string(&file.path).ok()?;
    Some(WatchedFile {
        content,
        ..file.clone()
    })
}

#[tauri::command]
fn save_file(id: String, content: String, state: State<AppState>) -> Result<(), String> {
    let mut files = state.files.lock().expect("mutex poisoned");
    let file = files.iter_mut().find(|f| f.id == id).ok_or("File not found")?;
    std::fs::write(&file.path, &content).map_err(|e| e.to_string())?;

    // Create a new snapshot if content actually changed
    if file.content != content {
        let diff = diffy::create_patch(&file.content, &content);
        let patch_str = diff.to_string();

        // Count added and removed lines from the patch (very basic heuristic)
        let lines_added = patch_str.lines().filter(|l| l.starts_with('+') && !l.starts_with("+++")).count();
        let lines_removed = patch_str.lines().filter(|l| l.starts_with('-') && !l.starts_with("---")).count();

        let now = SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        file.history.push(FileSnapshot {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: now,
            content: content.clone(),
            patch: Some(patch_str),
            lines_added,
            lines_removed,
        });
        
        // Cap history to 50 items to prevent out of memory issues for now
        if file.history.len() > 50 {
            file.history.remove(0);
        }
    }

    file.content = content;
    if let Ok(meta) = std::fs::metadata(&file.path) {
        if let Ok(mod_time) = meta.modified() {
            if let Ok(dur) = mod_time.duration_since(std::time::UNIX_EPOCH) {
                file.modified = dur.as_secs();
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn remove_file(id: String, state: State<AppState>) {
    let mut files = state.files.lock().expect("mutex poisoned");
    files.retain(|f| f.id != id);
}

#[tauri::command]
fn remove_files(ids: Vec<String>, state: State<AppState>) {
    let mut files = state.files.lock().expect("mutex poisoned");
    files.retain(|f| !ids.contains(&f.id));
}

#[tauri::command]
fn toggle_pin(id: String, state: State<AppState>) -> bool {
    let mut files = state.files.lock().expect("mutex poisoned");
    if let Some(f) = files.iter_mut().find(|f| f.id == id) {
        f.pinned = !f.pinned;
        return f.pinned;
    }
    false
}

#[tauri::command]
async fn add_files(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<Vec<WatchedFile>, String> {
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
    let mut dirs_to_watch = std::collections::HashSet::new();

    {
        let mut files = state.files.lock().expect("mutex poisoned");
        for file_path in paths {
            let path = file_path.into_path().map_err(|e| e.to_string())?;
            let path_str = path.to_string_lossy().to_string();
            if files.iter().any(|f| f.path == path_str) {
                continue;
            }
            if let Some(info) = read_file_info(&path) {
                if let Some(parent) = path.parent() {
                    dirs_to_watch.insert(parent.to_string_lossy().to_string());
                }
                added.push(info.clone());
                files.push(info);
            }
        }
    }

    {
        let mut watcher = state.watcher.lock().expect("mutex poisoned");
        for dir in &dirs_to_watch {
            watcher.watch(dir);
        }
    }

    Ok(added)
}

#[tauri::command]
async fn add_directory(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<DirectoryResult, String> {
    use tauri_plugin_dialog::DialogExt;

    let dir = app
        .dialog()
        .file()
        .blocking_pick_folder();

    let dir = match dir {
        Some(d) => d.into_path().map_err(|e| e.to_string())?,
        None => return Ok(DirectoryResult {
            source_dir: String::new(),
            dir_name: String::new(),
            files: vec![],
        }),
    };

    let dir_name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| dir.to_string_lossy().to_string());
    let source_dir = dir.to_string_lossy().to_string();

    let mut added = Vec::new();

    {
        let mut files = state.files.lock().expect("mutex poisoned");
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_file() {
                    continue;
                }
                let path_str = path.to_string_lossy().to_string();
                if files.iter().any(|f| f.path == path_str) {
                    continue;
                }
                if let Some(info) = read_file_info(&path) {
                    added.push(info.clone());
                    files.push(info);
                }
            }
        }
    }

    if !added.is_empty() {
        let mut watcher = state.watcher.lock().expect("mutex poisoned");
        watcher.watch(&source_dir);
    }

    Ok(DirectoryResult {
        source_dir,
        dir_name,
        files: added,
    })
}

#[tauri::command]
fn drop_paths(paths: Vec<String>, state: State<AppState>) -> DropBatchResult {
    let mut directories = Vec::new();
    let mut loose_files = Vec::new();
    let mut dirs_to_watch = std::collections::HashSet::new();

    {
        let mut files = state.files.lock().expect("mutex poisoned");
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
                        if !ep.is_file() { continue; }
                        let ep_str = ep.to_string_lossy().to_string();
                        if files.iter().any(|f| f.path == ep_str) { continue; }
                        if let Some(info) = read_file_info(&ep) {
                            dir_files.push(info.clone());
                            files.push(info);
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
                if files.iter().any(|f| f.path == *p) { continue; }
                if let Some(info) = read_file_info(&path) {
                    if let Some(parent) = path.parent() {
                        dirs_to_watch.insert(parent.to_string_lossy().to_string());
                    }
                    loose_files.push(info.clone());
                    files.push(info);
                }
            }
        }
    }

    {
        let mut watcher = state.watcher.lock().expect("mutex poisoned");
        for dir in &dirs_to_watch {
            watcher.watch(dir);
        }
    }

    DropBatchResult {
        directories,
        loose_files,
    }
}

#[tauri::command]
fn restore_files(saved: Vec<SavedFileEntry>, state: State<AppState>) -> Vec<WatchedFile> {
    let mut restored = Vec::new();
    let mut dirs_to_watch = std::collections::HashSet::new();

    {
        let mut files = state.files.lock().expect("mutex poisoned");
        for entry in saved {
            let path = PathBuf::from(&entry.path);
            if !path.is_file() {
                continue;
            }
            // Skip if already tracked
            if files.iter().any(|f| f.path == entry.path) {
                continue;
            }
            if let Some(mut info) = read_file_info(&path) {
                // Reuse the saved ID so frontend card state maps correctly
                info.id = entry.id;
                info.pinned = entry.pinned;
                if let Some(parent) = path.parent() {
                    dirs_to_watch.insert(parent.to_string_lossy().to_string());
                }
                restored.push(info.clone());
                files.push(info);
            }
        }
    }

    {
        let mut watcher = state.watcher.lock().expect("mutex poisoned");
        for dir in &dirs_to_watch {
            watcher.watch(dir);
        }
    }

    restored
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shared_files = std::sync::Arc::new(std::sync::Mutex::new(Vec::<WatchedFile>::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(move |app| {
            let handle = app.handle().clone();
            let files_for_watcher = shared_files.clone();
            
            let watcher_mgr = FileWatcherManager::new(move |event| {
                match event {
                    FileEvent::Changed(path) => {
                        let mut files = files_for_watcher.lock().expect("mutex poisoned");
                        if let Some(file) = files.iter_mut().find(|f| f.path == path) {
                            if let Ok(content) = std::fs::read_to_string(&path) {
                                if file.content != content {
                                    let diff = diffy::create_patch(&file.content, &content);
                                    let patch_str = diff.to_string();
                                    
                                    let lines_added = patch_str.lines().filter(|l| l.starts_with('+') && !l.starts_with("+++")).count();
                                    let lines_removed = patch_str.lines().filter(|l| l.starts_with('-') && !l.starts_with("---")).count();
                                    
                                    let now = std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap_or_default()
                                        .as_secs();
                                        
                                    file.history.push(FileSnapshot {
                                        id: uuid::Uuid::new_v4().to_string(),
                                        timestamp: now,
                                        content: content.clone(),
                                        patch: Some(patch_str),
                                        lines_added,
                                        lines_removed,
                                    });
                                    
                                    if file.history.len() > 50 {
                                        file.history.remove(0);
                                    }
                                    
                                    file.content = content.clone();
                                    if let Ok(meta) = std::fs::metadata(&path) {
                                        if let Ok(mod_time) = meta.modified() {
                                            if let Ok(dur) = mod_time.duration_since(std::time::UNIX_EPOCH) {
                                                file.modified = dur.as_secs();
                                            }
                                        }
                                    }
                                    
                                    let _ = handle.emit("file-changed", file.clone());
                                }
                            }
                        }
                    }
                    FileEvent::Removed(path) => {
                        let _ = handle.emit("file-removed", path);
                    }
                    FileEvent::Renamed { old_path, new_path } => {
                        let new_pb = PathBuf::from(&new_path);
                        let new_name = new_pb
                            .file_stem()
                            .map(|s| s.to_string_lossy().to_string())
                            .unwrap_or_default();
                        let new_extension = new_pb
                            .extension()
                            .map(|s| s.to_string_lossy().to_string())
                            .unwrap_or_default();

                        let _ = handle.emit("file-renamed", FileRenamedPayload {
                            old_path,
                            new_path,
                            new_name,
                            new_extension,
                        });
                    }
                }
            });

            app.manage(AppState {
                files: shared_files.clone(),
                watcher: std::sync::Mutex::new(watcher_mgr),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_files,
            select_file,
            save_file,
            create_file,
            refresh_file,
            remove_file,
            remove_files,
            toggle_pin,
            add_files,
            add_directory,
            drop_paths,
            restore_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CODORUM");
}
