use crate::db::SnapshotDb;
use crate::error::CodorumError;
use crate::models::{FileRenamedPayload, WatchedFile};
use crate::snapshot::create_snapshot;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::{Mutex, RwLock};

struct FileStore {
    by_path: HashMap<String, WatchedFile>,
    id_to_path: HashMap<String, String>,
}

impl FileStore {
    fn new() -> Self {
        Self {
            by_path: HashMap::new(),
            id_to_path: HashMap::new(),
        }
    }

    fn insert(&mut self, file: WatchedFile) {
        self.id_to_path
            .insert(file.id.clone(), file.path.clone());
        self.by_path.insert(file.path.clone(), file);
    }

    fn remove_by_id(&mut self, id: &str) -> Option<WatchedFile> {
        if let Some(path) = self.id_to_path.remove(id) {
            self.by_path.remove(&path)
        } else {
            None
        }
    }

    fn get_by_id(&self, id: &str) -> Option<&WatchedFile> {
        self.id_to_path
            .get(id)
            .and_then(|path| self.by_path.get(path))
    }

    fn get_by_id_mut(&mut self, id: &str) -> Option<&mut WatchedFile> {
        if let Some(path) = self.id_to_path.get(id).cloned() {
            self.by_path.get_mut(&path)
        } else {
            None
        }
    }

    fn get_by_path_mut(&mut self, path: &str) -> Option<&mut WatchedFile> {
        self.by_path.get_mut(path)
    }

    fn contains_path(&self, path: &str) -> bool {
        self.by_path.contains_key(path)
    }

    fn all(&self) -> Vec<WatchedFile> {
        self.by_path.values().cloned().collect()
    }
}

pub struct FileRegistry {
    store: RwLock<FileStore>,
    suppressed: Mutex<HashSet<String>>,
}

impl FileRegistry {
    pub fn new() -> Self {
        Self {
            store: RwLock::new(FileStore::new()),
            suppressed: Mutex::new(HashSet::new()),
        }
    }

    pub fn get_all(&self) -> Result<Vec<WatchedFile>, CodorumError> {
        let store = self.store.read().map_err(|_| CodorumError::Lock)?;
        Ok(store.all())
    }

    pub fn get_by_id(&self, id: &str) -> Result<Option<WatchedFile>, CodorumError> {
        let store = self.store.read().map_err(|_| CodorumError::Lock)?;
        Ok(store.get_by_id(id).cloned())
    }

    pub fn contains_path(&self, path: &str) -> Result<bool, CodorumError> {
        let store = self.store.read().map_err(|_| CodorumError::Lock)?;
        Ok(store.contains_path(path))
    }

    pub fn insert(&self, file: WatchedFile) -> Result<(), CodorumError> {
        let mut store = self.store.write().map_err(|_| CodorumError::Lock)?;
        store.insert(file);
        Ok(())
    }

    pub fn remove_by_id(&self, id: &str) -> Result<(), CodorumError> {
        let mut store = self.store.write().map_err(|_| CodorumError::Lock)?;
        store.remove_by_id(id);
        Ok(())
    }

    pub fn remove_by_ids(&self, ids: &[String]) -> Result<(), CodorumError> {
        let mut store = self.store.write().map_err(|_| CodorumError::Lock)?;
        for id in ids {
            store.remove_by_id(id);
        }
        Ok(())
    }

    pub fn toggle_pin(&self, id: &str) -> Result<bool, CodorumError> {
        let mut store = self.store.write().map_err(|_| CodorumError::Lock)?;
        if let Some(f) = store.get_by_id_mut(id) {
            f.pinned = !f.pinned;
            Ok(f.pinned)
        } else {
            Ok(false)
        }
    }

    // ── Suppression API ──
    // Mutex poisoning = programmer error → panic is correct here

    fn suppress_path(&self, path: &str) {
        self.suppressed
            .lock()
            .expect("suppression mutex poisoned")
            .insert(path.to_string());
    }

    fn take_suppressed(&self, path: &str) -> bool {
        self.suppressed
            .lock()
            .expect("suppression mutex poisoned")
            .remove(path)
    }

    // ── Save: suppress -> disk write -> snapshot to DB ──

    pub fn save_file(
        &self,
        id: &str,
        content: &str,
        db: &SnapshotDb,
    ) -> Result<WatchedFile, CodorumError> {
        // 1. Read lock -> get path + old content
        let (path, old_content) = {
            let store = self.store.read().map_err(|_| CodorumError::Lock)?;
            let file = store
                .get_by_id(id)
                .ok_or_else(|| CodorumError::FileNotFound(id.to_string()))?;
            (file.path.clone(), file.content.clone())
        };

        // 2. Suppress watcher events for this path
        self.suppress_path(&path);

        // 3. Write to disk (no lock held)
        std::fs::write(&path, content)?;

        // 4. Create snapshot if content changed, write to DB (no lock held)
        let snap = create_snapshot(&old_content, content);
        if let Some(ref s) = snap {
            db.push_snapshot(&path, s);
        }

        // 5. Write lock -> update in-memory state (content + modified, no history)
        let mut store = self.store.write().map_err(|_| CodorumError::Lock)?;
        let file = store
            .get_by_id_mut(id)
            .ok_or_else(|| CodorumError::FileNotFound(id.to_string()))?;
        file.content = content.to_string();
        // Update latest diff stats for sidebar badges
        if let Some(ref s) = snap {
            file.lines_added = s.lines_added;
            file.lines_removed = s.lines_removed;
        }
        if let Ok(meta) = std::fs::metadata(&path) {
            if let Ok(mod_time) = meta.modified() {
                if let Ok(dur) = mod_time.duration_since(std::time::UNIX_EPOCH) {
                    file.modified = dur.as_secs();
                }
            }
        }
        Ok(file.clone())
    }

    // ── Watcher event handlers ──

    pub fn handle_file_changed(
        &self,
        path: &str,
        db: &SnapshotDb,
    ) -> Result<Option<WatchedFile>, CodorumError> {
        // 1. Check suppression
        if self.take_suppressed(path) {
            return Ok(None);
        }

        // 2. Read from disk (no lock)
        let new_content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => return Ok(None),
        };

        // 3. Read lock -> get old content
        let old_content = {
            let store = self.store.read().map_err(|_| CodorumError::Lock)?;
            match store.by_path.get(path) {
                Some(f) => f.content.clone(),
                None => return Ok(None),
            }
        };

        // 4. Skip if unchanged
        if old_content == new_content {
            return Ok(None);
        }

        // 5. Create snapshot, write to DB (no lock)
        let snap = create_snapshot(&old_content, &new_content);
        if let Some(ref s) = snap {
            db.push_snapshot(path, s);
        }

        // 6. Write lock -> update in-memory state
        let mut store = self.store.write().map_err(|_| CodorumError::Lock)?;
        if let Some(file) = store.get_by_path_mut(path) {
            file.content = new_content;
            if let Some(ref s) = snap {
                file.lines_added = s.lines_added;
                file.lines_removed = s.lines_removed;
            }
            if let Ok(meta) = std::fs::metadata(path) {
                if let Ok(mod_time) = meta.modified() {
                    if let Ok(dur) = mod_time.duration_since(std::time::UNIX_EPOCH) {
                        file.modified = dur.as_secs();
                    }
                }
            }
            Ok(Some(file.clone()))
        } else {
            Ok(None)
        }
    }

    pub fn handle_renamed(&self, old_path: &str, new_path: &str) -> Option<FileRenamedPayload> {
        let new_pb = PathBuf::from(new_path);
        let new_name = new_pb
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        let new_extension = new_pb
            .extension()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();

        let mut store = self.store.write().ok()?;
        if let Some(mut file) = store.by_path.remove(old_path) {
            store
                .id_to_path
                .insert(file.id.clone(), new_path.to_string());
            file.path = new_path.to_string();
            file.name = new_name.clone();
            file.extension = new_extension.clone();
            store.by_path.insert(new_path.to_string(), file);
            Some(FileRenamedPayload {
                old_path: old_path.to_string(),
                new_path: new_path.to_string(),
                new_name,
                new_extension,
            })
        } else {
            None
        }
    }
}

/// Read file info from disk and create a WatchedFile.
/// Initial snapshot is written to DB by the caller.
/// For .docx files, converts to markdown via pandoc.
pub fn read_file_info(path: &PathBuf) -> Option<WatchedFile> {
    let name = path.file_stem()?.to_string_lossy().to_string();
    let ext = path
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let content = std::fs::read_to_string(path).ok()?;
    let meta = std::fs::metadata(path).ok()?;
    let modified = meta
        .modified()
        .ok()?
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_secs();

    Some(WatchedFile {
        id: uuid::Uuid::new_v4().to_string(),
        path: path.to_string_lossy().to_string(),
        name,
        extension: ext,
        content,
        modified,
        pinned: false,
        lines_added: 0,
        lines_removed: 0,
    })
}
