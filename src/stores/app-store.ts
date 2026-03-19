import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WatchedFile, FileGroup } from "../types/files";

export interface SavedFileEntry {
  id: string;
  path: string;
  pinned: boolean;
}

interface AppState {
  // Files
  files: WatchedFile[];
  activeFileId: string | null;

  // Persisted file paths (for restore on startup)
  savedFilePaths: SavedFileEntry[];

  // Groups
  groups: FileGroup[];

  // Theme
  theme: string;

  // Fullscreen
  isFullscreen: boolean;
  toggleFullscreen: () => void;

  // Search
  searchMode: "filename" | "content";
  setSearchMode: (mode: "filename" | "content") => void;

  // Drawers & stream
  drawerOpen: Record<string, boolean>;
  sortBy: "name" | "modified" | "changes";
  search: string;
  cardCollapsed: Record<string, boolean>;
  cardHeights: Record<string, number | null>;
  cardDirty: Record<string, boolean>;

  // Timeline
  activeSnapshots: Record<string, number | null>;
  setActiveSnapshot: (fileId: string, timestamp: number | null) => void;

  // Drawer & stream actions
  toggleDrawer: (key: string) => void;
  setSortBy: (sort: "name" | "modified" | "changes") => void;
  setSearch: (query: string) => void;
  toggleCardCollapse: (fileId: string) => void;
  setCardHeight: (fileId: string, height: number | null) => void;
  setCardDirty: (fileId: string, dirty: boolean) => void;

  // Selection
  selectedIds: Set<string>;
  lastSelectedId: string | null;

  // Selection actions
  selectFile: (id: string) => void;
  toggleSelectFile: (id: string) => void;
  selectRange: (id: string, orderedIds: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  ejectSelected: () => void;

  // File actions
  setFiles: (files: WatchedFile[]) => void;
  addFiles: (files: WatchedFile[]) => void;
  updateFile: (id: string, updates: Partial<WatchedFile>) => void;
  patchFileMeta: (id: string, updates: Partial<WatchedFile>) => void;
  removeFile: (id: string) => void;
  removeFiles: (ids: string[]) => void;
  openFile: (id: string) => void;
  togglePin: (id: string) => void;
  setTheme: (theme: string) => void;

  // Group / tab actions
  addGroup: (group: FileGroup) => void;
  createTab: (name: string) => string;
  removeGroup: (groupId: string) => void;
  removeGroupAndFiles: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  toggleGroupCollapse: (groupId: string) => void;
  moveFileToGroup: (fileId: string, groupId: string) => void;
  removeFileFromGroup: (fileId: string, groupId: string) => void;
  reorderGroups: (groupIds: string[]) => void;
}

/** Derive savedFilePaths from current files array */
function toSavedPaths(files: WatchedFile[]): SavedFileEntry[] {
  return files.map((f) => ({ id: f.id, path: f.path, pinned: f.pinned }));
}

/** Files not belonging to any group */
export function getUngroupedFiles(
  files: WatchedFile[],
  groups: FileGroup[],
): WatchedFile[] {
  const grouped = new Set(groups.flatMap((g) => g.fileIds));
  return files.filter((f) => !grouped.has(f.id));
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      files: [],
      activeFileId: null,
      savedFilePaths: [],
      groups: [],
      theme: "n01z",
      isFullscreen: false,
      toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
      drawerOpen: { pinned: true, loose: true },
      sortBy: "modified",
      search: "",
      searchMode: "filename",
      setSearchMode: (mode) => set({ searchMode: mode }),
      cardCollapsed: {},
      cardHeights: {},
      cardDirty: {},
      activeSnapshots: {},
      setActiveSnapshot: (fileId, timestamp) =>
        set((s) => ({
          activeSnapshots: { ...s.activeSnapshots, [fileId]: timestamp },
        })),
      selectedIds: new Set<string>(),
      lastSelectedId: null,

      // ─── Selection actions ───

      selectFile: (id) => set({ selectedIds: new Set([id]), lastSelectedId: id }),

      toggleSelectFile: (id) =>
        set((s) => {
          const next = new Set(s.selectedIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { selectedIds: next, lastSelectedId: id };
        }),

      selectRange: (id, orderedIds) =>
        set((s) => {
          const anchor = s.lastSelectedId ?? id;
          const from = orderedIds.indexOf(anchor);
          const to = orderedIds.indexOf(id);
          if (from === -1 || to === -1) return { selectedIds: new Set([id]), lastSelectedId: id };
          const lo = Math.min(from, to);
          const hi = Math.max(from, to);
          return { selectedIds: new Set(orderedIds.slice(lo, hi + 1)), lastSelectedId: anchor };
        }),

      selectAll: () =>
        set((s) => ({ selectedIds: new Set(s.files.map((f) => f.id)) })),

      clearSelection: () => set({ selectedIds: new Set<string>() }),

      ejectSelected: () =>
        set((s) => {
          const ids = s.selectedIds;
          if (ids.size === 0) return {};
          const files = s.files.filter((f) => !ids.has(f.id));
          const groups = s.groups.map((g) => ({
            ...g,
            fileIds: g.fileIds.filter((fid) => !ids.has(fid)),
          }));
          const activeFileId =
            s.activeFileId && ids.has(s.activeFileId) ? null : s.activeFileId;
          return {
            files,
            groups,
            activeFileId,
            savedFilePaths: toSavedPaths(files),
            selectedIds: new Set<string>(),
            lastSelectedId: null,
          };
        }),

      setFiles: (files) => set({ files, savedFilePaths: toSavedPaths(files) }),

      addFiles: (newFiles) =>
        set((s) => {
          const files = [...s.files, ...newFiles];
          return { files, savedFilePaths: toSavedPaths(files) };
        }),

      updateFile: (id, updates) =>
        set((s) => {
          const files = s.files.map((f) =>
            f.id === id ? { ...f, ...updates, _rev: (f._rev ?? 0) + 1 } : f,
          );
          // Only update savedFilePaths if path or pinned changed
          const needsSync = updates.path !== undefined || updates.pinned !== undefined;
          return needsSync
            ? { files, savedFilePaths: toSavedPaths(files) }
            : { files };
        }),

      // Like updateFile but does NOT bump _rev — used for internal saves
      // so editors (keyed on editorRev) stay mounted.
      patchFileMeta: (id, updates) =>
        set((s) => {
          const files = s.files.map((f) =>
            f.id === id ? { ...f, ...updates } : f,
          );
          return { files };
        }),

      removeFile: (id) =>
        set((s) => {
          const files = s.files.filter((f) => f.id !== id);
          const groups = s.groups.map((g) => ({
            ...g,
            fileIds: g.fileIds.filter((fid) => fid !== id),
          }));
          const activeFileId = s.activeFileId === id ? null : s.activeFileId;
          return { files, groups, activeFileId, savedFilePaths: toSavedPaths(files) };
        }),

      removeFiles: (ids) =>
        set((s) => {
          const idSet = new Set(ids);
          const files = s.files.filter((f) => !idSet.has(f.id));
          const groups = s.groups.map((g) => ({
            ...g,
            fileIds: g.fileIds.filter((fid) => !idSet.has(fid)),
          }));
          const activeFileId =
            s.activeFileId && idSet.has(s.activeFileId) ? null : s.activeFileId;
          return { files, groups, activeFileId, savedFilePaths: toSavedPaths(files) };
        }),

      openFile: (id) => set({ activeFileId: id }),

      togglePin: (id) =>
        set((s) => {
          const files = s.files.map((f) =>
            f.id === id ? { ...f, pinned: !f.pinned } : f,
          );
          return { files, savedFilePaths: toSavedPaths(files) };
        }),

      setTheme: (theme) => set({ theme }),

      // ─── Drawer & stream actions ───

      toggleDrawer: (key) =>
        set((s) => ({
          drawerOpen: { ...s.drawerOpen, [key]: !s.drawerOpen[key] },
        })),

      setSortBy: (sortBy) => set({ sortBy }),

      setSearch: (search) => set({ search }),

      toggleCardCollapse: (fileId) =>
        set((s) => ({
          cardCollapsed: {
            ...s.cardCollapsed,
            [fileId]: !s.cardCollapsed[fileId],
          },
        })),

      setCardHeight: (fileId, height) =>
        set((s) => ({
          cardHeights: { ...s.cardHeights, [fileId]: height },
        })),

      setCardDirty: (fileId, dirty) =>
        set((s) => ({
          cardDirty: { ...s.cardDirty, [fileId]: dirty },
        })),

      // ─── Group actions ───

      addGroup: (group) =>
        set((s) => ({
          groups: [...s.groups, group],
          drawerOpen: { ...s.drawerOpen, [group.id]: true },
        })),

      createTab: (name) => {
        const id = crypto.randomUUID();
        set((s) => ({
          groups: [...s.groups, { id, name, collapsed: false, fileIds: [] }],
          drawerOpen: { ...s.drawerOpen, [id]: true },
        }));
        return id;
      },

      removeGroup: (groupId) =>
        set((s) => ({ groups: s.groups.filter((g) => g.id !== groupId) })),

      removeGroupAndFiles: (groupId) =>
        set((s) => {
          const group = s.groups.find((g) => g.id === groupId);
          if (!group) return {};
          const idSet = new Set(group.fileIds);
          const files = s.files.filter((f) => !idSet.has(f.id));
          return {
            groups: s.groups.filter((g) => g.id !== groupId),
            files,
            savedFilePaths: toSavedPaths(files),
          };
        }),

      renameGroup: (groupId, name) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId ? { ...g, name } : g,
          ),
        })),

      toggleGroupCollapse: (groupId) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId ? { ...g, collapsed: !g.collapsed } : g,
          ),
        })),

      moveFileToGroup: (fileId, groupId) =>
        set((s) => ({
          groups: s.groups.map((g) => {
            if (g.id === groupId) {
              return g.fileIds.includes(fileId) ? g : { ...g, fileIds: [...g.fileIds, fileId] };
            }
            return { ...g, fileIds: g.fileIds.filter((fid) => fid !== fileId) };
          }),
        })),

      removeFileFromGroup: (fileId, groupId) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId ? { ...g, fileIds: g.fileIds.filter((fid) => fid !== fileId) } : g,
          ),
        })),

      reorderGroups: (groupIds) =>
        set((s) => {
          const map = new Map(s.groups.map((g) => [g.id, g]));
          return { groups: groupIds.map((id) => map.get(id)!).filter(Boolean) };
        }),
    }),
    {
      name: "codorum-state",
      partialize: (state) => ({
        theme: state.theme,
        savedFilePaths: state.savedFilePaths,
        groups: state.groups,
        drawerOpen: state.drawerOpen,
        sortBy: state.sortBy,
        searchMode: state.searchMode,
        cardCollapsed: state.cardCollapsed,
        cardHeights: state.cardHeights,
      }),
    },
  ),
);
