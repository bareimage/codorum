use crate::models::FileSnapshot;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;


pub struct SnapshotDb {
    conn: Mutex<Connection>,
}

impl SnapshotDb {
    pub fn open() -> Self {
        let db_dir = dirs_db_path();
        if let Some(parent) = db_dir.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(&db_dir).expect("failed to open snapshot database");

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
            CREATE INDEX IF NOT EXISTS idx_snapshots_ts ON snapshots(file_path, timestamp);",
        )
        .expect("failed to create snapshots table");

        Self {
            conn: Mutex::new(conn),
        }
    }

    /// Insert a snapshot and cap at MAX_SNAPSHOTS_PER_FILE.
    pub fn push_snapshot(&self, file_path: &str, snap: &FileSnapshot) {
        let conn = self.conn.lock().expect("snapshot db lock poisoned");

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
        )
        .ok();

    }

    /// Get all snapshots for a file, ordered by timestamp ascending.
    pub fn get_snapshots(&self, file_path: &str) -> Vec<FileSnapshot> {
        let conn = self.conn.lock().expect("snapshot db lock poisoned");

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

    /// Get the latest snapshot stats (for sidebar badges).
    pub fn get_latest_snapshot(&self, file_path: &str) -> Option<FileSnapshot> {
        let conn = self.conn.lock().expect("snapshot db lock poisoned");

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

    /// Count snapshots for a file.
    pub fn snapshot_count(&self, file_path: &str) -> usize {
        let conn = self.conn.lock().expect("snapshot db lock poisoned");

        conn.query_row(
            "SELECT COUNT(*) FROM snapshots WHERE file_path = ?1",
            params![file_path],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0) as usize
    }

    /// Remove all snapshots for a file path.
    pub fn remove_snapshots(&self, file_path: &str) {
        let conn = self.conn.lock().expect("snapshot db lock poisoned");
        conn.execute(
            "DELETE FROM snapshots WHERE file_path = ?1",
            params![file_path],
        )
        .ok();
    }

    /// Update file_path for all snapshots (on rename).
    pub fn rename_path(&self, old_path: &str, new_path: &str) {
        let conn = self.conn.lock().expect("snapshot db lock poisoned");
        conn.execute(
            "UPDATE snapshots SET file_path = ?1 WHERE file_path = ?2",
            params![new_path, old_path],
        )
        .ok();
    }
}

fn dirs_db_path() -> PathBuf {
    let mut p = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    p.push("codorum");
    p.push("history.db");
    p
}
