use crate::error::CodorumError;
use crate::models::FileSnapshot;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;

fn db_err(e: rusqlite::Error) -> CodorumError {
    CodorumError::Db(e.to_string())
}

pub struct SnapshotDb {
    conn: Mutex<Connection>,
}

impl SnapshotDb {
    pub fn open() -> Self {
        let db_dir = dirs_db_path();
        if let Some(parent) = db_dir.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(&db_dir).expect("failed to open database");
        conn.execute_batch("PRAGMA journal_mode=WAL;").ok();

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS snapshots (
                id          TEXT PRIMARY KEY,
                file_path   TEXT NOT NULL,
                timestamp   INTEGER NOT NULL,
                patch       TEXT,
                lines_added INTEGER NOT NULL DEFAULT 0,
                lines_removed INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_snapshots_path ON snapshots(file_path);
            CREATE INDEX IF NOT EXISTS idx_snapshots_ts ON snapshots(file_path, timestamp);

            CREATE TABLE IF NOT EXISTS watched_files (
                id          TEXT PRIMARY KEY,
                path        TEXT NOT NULL UNIQUE,
                name        TEXT NOT NULL,
                extension   TEXT NOT NULL DEFAULT '',
                pinned      INTEGER NOT NULL DEFAULT 0,
                added_at    INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_watched_path ON watched_files(path);",
        )
        .expect("failed to create tables");

        Self {
            conn: Mutex::new(conn),
        }
    }

    // ── Atomic compound operations ──

    /// Add a file + its initial snapshot in one transaction.
    pub fn add_file_with_snapshot(
        &self,
        id: &str,
        path: &str,
        name: &str,
        extension: &str,
        snap: &FileSnapshot,
    ) -> Result<(), CodorumError> {
        let conn = self.conn.lock().map_err(|_| CodorumError::Lock)?;
        let tx = conn.unchecked_transaction().map_err(db_err)?;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        tx.execute(
            "INSERT OR IGNORE INTO watched_files (id, path, name, extension, pinned, added_at) VALUES (?1, ?2, ?3, ?4, 0, ?5)",
            params![id, path, name, extension, now],
        ).map_err(db_err)?;

        tx.execute(
            "INSERT OR REPLACE INTO snapshots (id, file_path, timestamp, patch, lines_added, lines_removed)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                snap.id,
                path,
                snap.timestamp as i64,
                snap.patch,
                snap.lines_added as i64,
                snap.lines_removed as i64,
            ],
        ).map_err(db_err)?;

        tx.commit().map_err(db_err)?;
        Ok(())
    }

    /// Remove a file + all its snapshots in one transaction.
    pub fn remove_file_completely(&self, path: &str) -> Result<(), CodorumError> {
        let conn = self.conn.lock().map_err(|_| CodorumError::Lock)?;
        let tx = conn.unchecked_transaction().map_err(db_err)?;

        tx.execute("DELETE FROM snapshots WHERE file_path = ?1", params![path])
            .map_err(db_err)?;
        tx.execute("DELETE FROM watched_files WHERE path = ?1", params![path])
            .map_err(db_err)?;

        tx.commit().map_err(db_err)?;
        Ok(())
    }

    // ── Watched files ──

    pub fn get_watched_files(&self) -> Vec<(String, String, String, String, bool)> {
        let conn = self.conn.lock().expect("db lock poisoned");
        let mut stmt = conn
            .prepare("SELECT id, path, name, extension, pinned FROM watched_files ORDER BY added_at ASC")
            .unwrap();
        stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, bool>(4)?,
            ))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect()
    }

    pub fn set_pinned(&self, path: &str, pinned: bool) -> Result<(), CodorumError> {
        let conn = self.conn.lock().map_err(|_| CodorumError::Lock)?;
        conn.execute(
            "UPDATE watched_files SET pinned = ?1 WHERE path = ?2",
            params![pinned, path],
        ).map_err(db_err)?;
        Ok(())
    }

    pub fn rename_file(&self, old_path: &str, new_path: &str, new_name: &str, new_ext: &str) -> Result<(), CodorumError> {
        let conn = self.conn.lock().map_err(|_| CodorumError::Lock)?;
        let tx = conn.unchecked_transaction().map_err(db_err)?;

        tx.execute(
            "UPDATE snapshots SET file_path = ?1 WHERE file_path = ?2",
            params![new_path, old_path],
        ).map_err(db_err)?;

        tx.execute(
            "UPDATE watched_files SET path = ?1, name = ?2, extension = ?3 WHERE path = ?4",
            params![new_path, new_name, new_ext, old_path],
        ).map_err(db_err)?;

        tx.commit().map_err(db_err)?;
        Ok(())
    }

    // ── Snapshots ──

    pub fn push_snapshot(&self, file_path: &str, snap: &FileSnapshot) -> Result<(), CodorumError> {
        let conn = self.conn.lock().map_err(|_| CodorumError::Lock)?;
        conn.execute(
            "INSERT OR REPLACE INTO snapshots (id, file_path, timestamp, patch, lines_added, lines_removed)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                snap.id,
                file_path,
                snap.timestamp as i64,
                snap.patch,
                snap.lines_added as i64,
                snap.lines_removed as i64,
            ],
        ).map_err(db_err)?;
        Ok(())
    }

    pub fn get_snapshots(&self, file_path: &str) -> Vec<FileSnapshot> {
        let conn = self.conn.lock().expect("db lock poisoned");
        let mut stmt = conn
            .prepare(
                "SELECT id, timestamp, patch, lines_added, lines_removed
                 FROM snapshots WHERE file_path = ?1
                 ORDER BY timestamp ASC",
            )
            .unwrap();

        stmt.query_map(params![file_path], |row| {
            Ok(FileSnapshot {
                id: row.get(0)?,
                timestamp: row.get::<_, i64>(1)? as u64,
                patch: row.get(2)?,
                lines_added: row.get::<_, i64>(3)? as usize,
                lines_removed: row.get::<_, i64>(4)? as usize,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect()
    }

    pub fn get_latest_snapshot(&self, file_path: &str) -> Option<FileSnapshot> {
        let conn = self.conn.lock().expect("db lock poisoned");
        conn.query_row(
            "SELECT id, timestamp, patch, lines_added, lines_removed
             FROM snapshots WHERE file_path = ?1
             ORDER BY timestamp DESC LIMIT 1",
            params![file_path],
            |row| {
                Ok(FileSnapshot {
                    id: row.get(0)?,
                    timestamp: row.get::<_, i64>(1)? as u64,
                    patch: row.get(2)?,
                    lines_added: row.get::<_, i64>(3)? as usize,
                    lines_removed: row.get::<_, i64>(4)? as usize,
                })
            },
        )
        .ok()
    }

    pub fn snapshot_count(&self, file_path: &str) -> usize {
        let conn = self.conn.lock().expect("db lock poisoned");
        conn.query_row(
            "SELECT COUNT(*) FROM snapshots WHERE file_path = ?1",
            params![file_path],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0) as usize
    }
}

fn dirs_db_path() -> PathBuf {
    let mut p = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("codorum");
    p.push("history.db");
    p
}
