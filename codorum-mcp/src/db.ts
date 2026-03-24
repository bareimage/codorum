import Database from "better-sqlite3";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

// ── Types matching Rust models ──

export interface FileSnapshot {
  id: string;
  file_path: string;
  timestamp: number;
  patch: string | null;
  lines_added: number;
  lines_removed: number;
}

export interface TrackedFile {
  file_path: string;
  snapshot_count: number;
  first_seen: number;
  last_modified: number;
  total_added: number;
  total_removed: number;
}

// ── Database ──

let db: Database.Database | null = null;

function getDbPath(): string {
  const platform = process.platform;
  if (platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "codorum", "history.db");
  }
  if (platform === "linux") {
    return join(homedir(), ".local", "share", "codorum", "history.db");
  }
  // Windows
  return join(homedir(), "AppData", "Local", "codorum", "history.db");
}

export function openDb(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  if (!existsSync(dbPath)) {
    throw new Error(
      `Codorum database not found at ${dbPath}. ` +
      `Has Codorum been run at least once?`
    );
  }

  db = new Database(dbPath, { readonly: false });
  db.pragma("journal_mode = WAL");
  return db;
}

export function listTrackedFiles(): TrackedFile[] {
  const conn = openDb();
  return conn
    .prepare(
      `SELECT
         file_path,
         COUNT(*)          AS snapshot_count,
         MIN(timestamp)    AS first_seen,
         MAX(timestamp)    AS last_modified,
         SUM(lines_added)  AS total_added,
         SUM(lines_removed) AS total_removed
       FROM snapshots
       GROUP BY file_path
       ORDER BY last_modified DESC`
    )
    .all() as TrackedFile[];
}

export function getSnapshots(filePath: string): FileSnapshot[] {
  const conn = openDb();
  return conn
    .prepare(
      `SELECT id, file_path, timestamp, patch, lines_added, lines_removed
       FROM snapshots
       WHERE file_path = ?
       ORDER BY timestamp ASC`
    )
    .all(filePath) as FileSnapshot[];
}

export function getSnapshotById(snapshotId: string): FileSnapshot | undefined {
  const conn = openDb();
  return conn
    .prepare(
      `SELECT id, file_path, timestamp, patch, lines_added, lines_removed
       FROM snapshots WHERE id = ?`
    )
    .get(snapshotId) as FileSnapshot | undefined;
}

export function getLatestSnapshot(filePath: string): FileSnapshot | undefined {
  const conn = openDb();
  return conn
    .prepare(
      `SELECT id, file_path, timestamp, patch, lines_added, lines_removed
       FROM snapshots WHERE file_path = ?
       ORDER BY timestamp DESC LIMIT 1`
    )
    .get(filePath) as FileSnapshot | undefined;
}

export function pushSnapshot(
  filePath: string,
  snap: Omit<FileSnapshot, "file_path">
): void {
  const conn = openDb();
  conn
    .prepare(
      `INSERT OR REPLACE INTO snapshots
         (id, file_path, timestamp, patch, lines_added, lines_removed)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(snap.id, filePath, snap.timestamp, snap.patch, snap.lines_added, snap.lines_removed);
}

export function removeSnapshots(filePath: string): number {
  const conn = openDb();
  const result = conn
    .prepare(`DELETE FROM snapshots WHERE file_path = ?`)
    .run(filePath);
  return result.changes;
}
