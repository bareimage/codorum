mod commands;
mod db;
mod error;
mod models;
mod registry;
mod snapshot;
mod watcher;

use db::SnapshotDb;
use registry::FileRegistry;
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};
use watcher::{FileEvent, FileWatcherManager};

pub struct AppState {
    pub registry: Arc<FileRegistry>,
    pub watcher: Mutex<FileWatcherManager>,
    pub db: Arc<SnapshotDb>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = Arc::new(SnapshotDb::open());
    let registry = Arc::new(FileRegistry::new());
    let reg_for_watcher = registry.clone();
    let db_for_watcher = db.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(move |app| {
            let handle = app.handle().clone();

            let watcher_mgr = FileWatcherManager::new(move |event| match event {
                FileEvent::Changed(path) => {
                    if let Ok(Some(file)) =
                        reg_for_watcher.handle_file_changed(&path, &db_for_watcher)
                    {
                        let _ = handle.emit("file-changed", file);
                    }
                }
                FileEvent::Removed(path) => {
                    let _ = handle.emit("file-removed", path);
                }
                FileEvent::Renamed { old_path, new_path } => {
                    if let Some(payload) = reg_for_watcher.handle_renamed(&old_path, &new_path) {
                        let _ = db_for_watcher.rename_file(&old_path, &new_path, &payload.new_name, &payload.new_extension);
                        let _ = handle.emit("file-renamed", payload);
                    }
                }
            });

            app.manage(AppState {
                registry: registry.clone(),
                watcher: Mutex::new(watcher_mgr),
                db: db.clone(),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_files,
            commands::select_file,
            commands::save_file,
            commands::create_file,
            commands::refresh_file,
            commands::remove_file,
            commands::remove_files,
            commands::toggle_pin,
            commands::add_files,
            commands::add_directory,
            commands::drop_paths,
            commands::load_watched_files,
            commands::reveal_in_finder,
            commands::get_snapshots,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CODORUM");
}
