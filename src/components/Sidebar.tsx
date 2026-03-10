import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, getUngroupedFiles } from "../stores/app-store";
import { useToastStore } from "../stores/toast-store";
import { sortFiles } from "../utils/sortFiles";
import { Icons } from "./Icons";
import { ExtDot } from "./ExtDot";
import { DiffBadge } from "./DiffBadge";
import { StatusBar } from "./StatusBar";
import type { WatchedFile } from "../types/files";

// ─── Mouse-based drag state (shared across all sections) ───
interface DragState {
  fileId: string;
  fileName: string;
  startY: number;
  active: boolean; // becomes true after 4px movement threshold
}

// ─── Drawer Section ───────────────────────────────

interface DrawerSectionProps {
  id: string; // group id or "pinned" | "loose"
  title: string;
  files: WatchedFile[];
  allFileIds: string[];
  isOpen: boolean;
  onToggle: () => void;
  onEject?: () => void;
  renamable?: boolean;
  renaming?: boolean;
  onStartRename?: () => void;
  onFinishRename?: (name: string) => void;
  searchExcerpts?: Map<string, string>;
  // Drag props from parent
  dragOverId: string | null;
  onFileDragStart: (fileId: string, fileName: string, y: number) => void;
}

function DrawerSection({
  id,
  title,
  files,
  allFileIds,
  isOpen,
  onToggle,
  onEject,
  renamable,
  renaming,
  onStartRename,
  onFinishRename,
  searchExcerpts,
  dragOverId,
  onFileDragStart,
}: DrawerSectionProps) {
  const { activeFileId, selectedIds, openFile, toggleSelectFile, selectRange, clearSelection, sortBy } =
    useAppStore();
  const sorted = sortFiles(files, sortBy);
  const renameRef = useRef<HTMLInputElement>(null);
  const [renameValue, setRenameValue] = useState(title);
  const isDragOver = dragOverId === id;

  const totalAdded = files.reduce((s, f) => s + (f.linesAdded || 0), 0);
  const totalRemoved = files.reduce((s, f) => s + (f.linesRemoved || 0), 0);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renaming) {
      setRenameValue(title);
      setTimeout(() => {
        renameRef.current?.focus();
        renameRef.current?.select();
      }, 30);
    }
  }, [renaming, title]);

  const handleFileClick = (fileId: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      selectRange(fileId, allFileIds);
    } else if (e.metaKey || e.ctrlKey) {
      toggleSelectFile(fileId);
    } else {
      clearSelection();
      openFile(fileId);
    }
    setTimeout(() => {
      document.getElementById(fileId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  };

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== title) {
      onFinishRename?.(trimmed);
    } else {
      onFinishRename?.(title); // cancel — keep old name
    }
  };

  return (
    <div
      className="drawer-section"
      data-section-id={id}
      style={{
        position: "relative",
        borderLeft: isDragOver ? "3px solid var(--ac)" : "3px solid transparent",
        background: isDragOver ? "color-mix(in srgb, var(--ac) 8%, transparent)" : undefined,
        borderRadius: isDragOver ? 8 : 0,
        transition: "border-color 100ms, background 100ms",
      }}
    >
      <button
        onClick={onToggle}
        onDoubleClick={(e) => {
          if (renamable) {
            e.stopPropagation();
            onStartRename?.();
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "100%",
          padding: "8px 12px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span style={{ color: "var(--tx3)", display: "flex" }}>
          <Icons.chevron open={isOpen} />
        </span>
        {renaming ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") onFinishRename?.(title);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--tx)",
              background: "var(--input-bg)",
              border: "1px solid var(--ac)",
              borderRadius: 4,
              padding: "1px 6px",
              outline: "none",
              fontFamily: "inherit",
              width: "100%",
              maxWidth: 140,
            }}
          />
        ) : (
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isOpen ? "var(--tx2)" : "var(--tx3)",
              transition: "color 120ms",
            }}
          >
            {title}
          </span>
        )}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <DiffBadge added={totalAdded} removed={totalRemoved} />
          <span style={{ fontSize: 11, color: "var(--tx3)", minWidth: 18, textAlign: "right" }}>
            {files.length}
          </span>
          {onEject && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onEject();
              }}
              title={`Eject ${title}`}
              className="drawer-eject-btn"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                borderRadius: 4,
                color: "var(--tx3)",
                cursor: "pointer",
                opacity: 0,
                transition: "opacity 120ms, color 100ms",
              }}
            >
              <Icons.close />
            </span>
          )}
        </span>
      </button>

      <div
        style={{
          maxHeight: isOpen ? 900 : 0,
          overflow: "hidden",
          transition: "max-height 250ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {sorted.map((file) => {
          const isActive = activeFileId === file.id;
          const isSelected = selectedIds.has(file.id);
          const highlighted = isActive || isSelected;
          const excerpt = searchExcerpts?.get(file.id);
          return (
            <button
              key={file.id}
              className={!highlighted ? "file-row" : undefined}
              onMouseDown={(e) => {
                if (e.button === 0) onFileDragStart(file.id, file.name, e.clientY);
              }}
              onClick={(e) => handleFileClick(file.id, e)}
              style={{
                display: "flex",
                flexDirection: excerpt ? "column" : "row",
                alignItems: excerpt ? "flex-start" : "center",
                gap: excerpt ? 2 : 8,
                width: highlighted ? "calc(100% - 12px)" : "100%",
                padding: "5px 12px 5px 32px",
                background: isSelected
                  ? "color-mix(in srgb, var(--warn) 15%, transparent)"
                  : isActive
                    ? "var(--ring)"
                    : undefined,
                border: "none",
                borderRadius: highlighted ? 6 : 0,
                margin: highlighted ? "1px 6px" : "0",
                cursor: "grab",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "all 60ms",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                <ExtDot extension={file.extension} size={6} />
                <span
                  style={{
                    fontSize: 13,
                    color: file.deleted ? "var(--deleted)" : isActive ? "var(--tx)" : "var(--tx2)",
                    fontWeight: isActive ? 500 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    textDecoration: file.deleted ? "line-through" : undefined,
                  }}
                >
                  {file.name}
                  <span style={{ color: file.deleted ? "var(--deleted)" : "var(--tx3)", fontWeight: 400 }}>
                    .{file.extension}
                  </span>
                </span>
                <DiffBadge added={file.linesAdded} removed={file.linesRemoved} />
              </div>
              {excerpt && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--tx3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    width: "100%",
                    paddingLeft: 14,
                    lineHeight: 1.4,
                  }}
                  dangerouslySetInnerHTML={{ __html: excerpt }}
                />
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────

export function Sidebar() {
  const {
    files,
    groups,
    drawerOpen,
    toggleDrawer,
    sortBy,
    setSortBy,
    search,
    setSearch,
    searchMode,
    setSearchMode,
    removeGroupAndFiles,
    removeGroup,
    createTab,
    renameGroup,
    moveFileToGroup,
  } = useAppStore();
  const addToast = useToastStore((s) => s.add);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);

  // ─── Mouse-based drag system ───
  const dragRef = useRef<DragState | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [draggingFile, setDraggingFile] = useState<{ name: string; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const handleFileDragStart = useCallback((fileId: string, fileName: string, y: number) => {
    dragRef.current = { fileId, fileName, startY: y, active: false };
    suppressClick.current = false;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const drag = dragRef.current;

      // Activate after 4px movement threshold
      if (!drag.active) {
        if (Math.abs(e.clientY - drag.startY) < 4) return;
        drag.active = true;
        suppressClick.current = true;
      }

      // Update ghost position
      setDraggingFile({ name: drag.fileName, x: e.clientX, y: e.clientY });

      // Hit-test: which section is the cursor over?
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      let hitSection: string | null = null;
      for (const el of els) {
        const sec = (el as HTMLElement).closest?.("[data-section-id]");
        if (sec) {
          hitSection = sec.getAttribute("data-section-id");
          break;
        }
      }
      setDragOverSectionId(hitSection === "pinned" ? null : hitSection);
    };

    const onMouseUp = () => {
      if (!dragRef.current) return;
      const drag = dragRef.current;

      if (drag.active && dragOverSectionId) {
        const fileId = drag.fileId;
        if (dragOverSectionId === "loose") {
          const store = useAppStore.getState();
          for (const g of store.groups) {
            if (g.fileIds.includes(fileId)) {
              store.removeFileFromGroup(fileId, g.id);
              break;
            }
          }
        } else {
          moveFileToGroup(fileId, dragOverSectionId);
        }
      }

      // If drag was active, suppress the next click
      if (drag.active) {
        setTimeout(() => { suppressClick.current = false; }, 50);
      }

      dragRef.current = null;
      setDragOverSectionId(null);
      setDraggingFile(null);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragOverSectionId, moveFileToGroup]);

  // Listen for rename-tab events from CommandPalette
  useEffect(() => {
    const handler = (e: Event) => {
      const groupId = (e as CustomEvent).detail;
      if (groupId) setRenamingGroupId(groupId);
    };
    window.addEventListener("codorum:rename-tab", handler);
    return () => window.removeEventListener("codorum:rename-tab", handler);
  }, []);

  const pinnedFiles = files.filter((f) => f.pinned);
  const ungrouped = getUngroupedFiles(files, groups).filter((f) => !f.pinned);

  const q = search.toLowerCase().trim();

  // Build content search excerpts (only in content mode)
  const searchExcerpts = useMemo(() => {
    if (!q || searchMode !== "content") return undefined;
    const map = new Map<string, string>();
    for (const f of files) {
      const idx = f.content.toLowerCase().indexOf(q);
      if (idx !== -1) {
        // Extract ~60 chars around match
        const start = Math.max(0, idx - 20);
        const end = Math.min(f.content.length, idx + q.length + 40);
        let snippet = f.content.substring(start, end).replace(/\n/g, " ");
        if (start > 0) snippet = "\u2026" + snippet;
        if (end < f.content.length) snippet += "\u2026";
        // Highlight the match
        const matchStart = idx - start + (start > 0 ? 1 : 0);
        const before = escapeHtml(snippet.substring(0, matchStart));
        const match = escapeHtml(snippet.substring(matchStart, matchStart + q.length));
        const after = escapeHtml(snippet.substring(matchStart + q.length));
        map.set(f.id, `${before}<mark style="background:var(--ac);color:var(--bg);border-radius:2px;padding:0 1px">${match}</mark>${after}`);
      }
    }
    return map;
  }, [files, q, searchMode]);

  const filterFiles = useCallback(
    (list: WatchedFile[]) => {
      if (!q) return list;
      if (searchMode === "content") {
        return list.filter((f) => f.content.toLowerCase().includes(q));
      }
      return list.filter((f) => f.name.toLowerCase().includes(q));
    },
    [q, searchMode],
  );

  const filteredPinned = useMemo(() => filterFiles(pinnedFiles), [pinnedFiles, filterFiles]);
  const filteredUngrouped = useMemo(() => filterFiles(ungrouped), [ungrouped, filterFiles]);
  const allFileIds = useMemo(() => files.map((f) => f.id), [files]);

  const handleCreateTab = () => {
    const id = createTab("Untitled");
    setRenamingGroupId(id);
    addToast("Untitled", "tab created", "cyan");
  };

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--bg2)",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--brd)",
        overflow: "hidden",
      }}
    >
      {/* Search */}
      <div style={{ padding: "12px 12px 6px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            background: "var(--input-bg)",
            border: "1px solid var(--brd)",
            borderRadius: 8,
          }}
        >
          <span style={{ color: "var(--tx3)", display: "flex", flexShrink: 0 }}>
            <Icons.search />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchMode === "content" ? "Search in files..." : "Find files..."}
            style={{
              flex: 1,
              fontSize: 13,
              background: "transparent",
              color: "var(--tx)",
              border: "none",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* Search mode toggle + sort bar */}
      <div style={{ display: "flex", gap: 1, padding: "2px 12px 4px", alignItems: "center" }}>
        {(["Name", "Modified", "Changes"] as const).map((label) => {
          const value = label.toLowerCase() as "name" | "modified" | "changes";
          return (
            <button
              key={value}
              onClick={() => setSortBy(value)}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontWeight: sortBy === value ? 600 : 400,
                fontFamily: "inherit",
                background: sortBy === value ? "var(--hover)" : "transparent",
                color: sortBy === value ? "var(--ac)" : "var(--tx3)",
                transition: "all 80ms",
              }}
            >
              {label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        {/* + button to create tab */}
        <button
          onClick={handleCreateTab}
          title="Create tab"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            color: "var(--tx3)",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 300,
            fontFamily: "inherit",
            transition: "all 80ms",
          }}
          className="sidebar-add-btn"
        >
          +
        </button>
      </div>

      {/* Search mode toggle */}
      <div style={{ display: "flex", gap: 1, padding: "0 12px 6px" }}>
        {(["filename", "content"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setSearchMode(mode)}
            style={{
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 5,
              border: "none",
              cursor: "pointer",
              fontWeight: searchMode === mode ? 600 : 400,
              fontFamily: "inherit",
              background: searchMode === mode ? "var(--hover)" : "transparent",
              color: searchMode === mode ? "var(--ac)" : "var(--tx3)",
              transition: "all 80ms",
            }}
          >
            {mode === "filename" ? "Name" : "Content"}
          </button>
        ))}
      </div>
      <div style={{ height: 1, background: "var(--brd)", margin: "0 12px" }} />

      {/* Drawers */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
        {(!q || filteredPinned.length > 0) && pinnedFiles.length > 0 && (
          <DrawerSection
            id="pinned"
            title="Pinned"
            files={q ? filteredPinned : pinnedFiles}
            allFileIds={allFileIds}
            isOpen={drawerOpen["pinned"] ?? true}
            onToggle={() => toggleDrawer("pinned")}
            searchExcerpts={searchExcerpts}
            dragOverId={dragOverSectionId}
            onFileDragStart={handleFileDragStart}
          />
        )}

        {groups.map((group) => {
          const groupFiles = group.fileIds
            .map((id) => files.find((f) => f.id === id))
            .filter(Boolean) as WatchedFile[];
          const filtered = filterFiles(groupFiles);
          if (q && filtered.length === 0) return null;
          const isFolderBacked = !!group.sourcePath;
          return (
            <DrawerSection
              key={group.id}
              id={group.id}
              title={group.name}
              files={q ? filtered : groupFiles}
              allFileIds={allFileIds}
              isOpen={drawerOpen[group.id] ?? true}
              onToggle={() => toggleDrawer(group.id)}
              renamable
              renaming={renamingGroupId === group.id}
              onStartRename={() => setRenamingGroupId(group.id)}
              onFinishRename={(name) => {
                renameGroup(group.id, name);
                setRenamingGroupId(null);
              }}
              onEject={() => {
                if (isFolderBacked) {
                  // Folder-backed: eject files from app
                  const ids = group.fileIds;
                  removeGroupAndFiles(group.id);
                  invoke("remove_files", { ids });
                  addToast(group.name, "ejected", "amber");
                } else {
                  // User tab: dissolve tab, files go to Loose
                  removeGroup(group.id);
                  addToast(group.name, "tab removed", "amber");
                }
              }}
              searchExcerpts={searchExcerpts}
              dragOverId={dragOverSectionId}
              onFileDragStart={handleFileDragStart}
            />
          );
        })}

        {(!q || filteredUngrouped.length > 0) && ungrouped.length > 0 && (
          <DrawerSection
            id="loose"
            title="Loose"
            files={q ? filteredUngrouped : ungrouped}
            allFileIds={allFileIds}
            isOpen={drawerOpen["loose"] ?? true}
            onToggle={() => toggleDrawer("loose")}
            searchExcerpts={searchExcerpts}
            dragOverId={dragOverSectionId}
            onFileDragStart={handleFileDragStart}
          />
        )}

        {files.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <div style={{ color: "var(--tx3)", opacity: 0.25, fontSize: 10 }}>drop files or folders</div>
          </div>
        )}
      </div>

      {/* Drag ghost */}
      {draggingFile && (
        <div
          style={{
            position: "fixed",
            left: draggingFile.x + 12,
            top: draggingFile.y - 10,
            padding: "3px 10px",
            background: "var(--card)",
            border: "1px solid var(--ac)",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--tx)",
            pointerEvents: "none",
            zIndex: 999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            whiteSpace: "nowrap",
          }}
        >
          {draggingFile.name}
        </div>
      )}

      <StatusBar />
    </div>
  );
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
