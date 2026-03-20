use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSnapshot {
    pub id: String,
    pub timestamp: u64,
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
    /// Latest snapshot diff stats (for sidebar badges). History lives in SQLite.
    #[serde(default)]
    pub lines_added: usize,
    #[serde(default)]
    pub lines_removed: usize,
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
