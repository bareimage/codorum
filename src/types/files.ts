export interface FileSnapshot {
  id: string;
  timestamp: number;
  patch?: string;
  lines_added: number;
  lines_removed: number;
}

export interface WatchedFile {
  id: string;
  path: string;
  name: string;
  extension: string;
  content: string;
  modified: number;
  pinned: boolean;
  /** Latest snapshot diff stats (for sidebar badges). Full history lives in SQLite. */
  lines_added?: number;
  lines_removed?: number;
  /** Frontend aliases for camelCase access */
  linesAdded?: number;
  linesRemoved?: number;
  /** Internal revision counter — incremented on each external update to force editor remount */
  _rev?: number;
  /** Set when the file has been deleted from disk */
  deleted?: boolean;
}

export interface FileRenamedPayload {
  old_path: string;
  new_path: string;
  new_name: string;
  new_extension: string;
}

export interface DirectoryResult {
  source_dir: string;
  dir_name: string;
  files: WatchedFile[];
}

export interface DropBatchResult {
  directories: DirectoryResult[];
  loose_files: WatchedFile[];
}

export interface FileGroup {
  id: string;
  name: string;
  sourcePath?: string;
  collapsed: boolean;
  fileIds: string[];
}
