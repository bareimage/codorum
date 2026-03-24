import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  DragDropProvider,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { PointerSensor, PointerActivationConstraints } from "@dnd-kit/dom";
import { ChevronRight, Plus, Search, X } from "lucide-react";
import { useAppStore, getUngroupedFiles } from "../stores/app-store";
import { useToastStore } from "../stores/toast-store";
import { sortFiles } from "../utils/sortFiles";
import { FileIcon } from "./FileIcon";
import { StatusBar } from "./StatusBar";
import { useStaggerIn } from "../hooks/useAnime";
import type { WatchedFile } from "../types/files";

// ─── Draggable file item ───────────────────────────
function DraggableFileItem({
  file,
  isActive,
  isSelected,
  excerpt,
  onClick,
}: {
  file: WatchedFile;
  isActive: boolean;
  isSelected: boolean;
  excerpt?: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  const { ref, isDragging } = useDraggable({
    id: file.id,
    data: { file },
  });

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      className={`fi ${isActive ? "active" : ""} ${isSelected ? "selected" : ""} ${isDragging ? "is-dragging" : ""}`}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(e as unknown as React.MouseEvent); }}
    >
      <FileIcon extension={file.extension} />
      <div className="fi-main">
        <div className="fi-top">
          <span className="fl" style={file.deleted ? { textDecoration: "line-through", color: "var(--deleted)" } : undefined}>
            {file.name}
            <span className="ext">.{file.extension}</span>
          </span>
          {(file.linesAdded || file.linesRemoved) ? (
            <span className="diff">
              {(file.linesAdded ?? 0) > 0 && <span className="d-add">+{file.linesAdded}</span>}
              {(file.linesRemoved ?? 0) > 0 && <span className="d-del">{"\u2212"}{file.linesRemoved}</span>}
            </span>
          ) : null}
          {file.deleted && <span className="del-badge">deleted</span>}
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
              lineHeight: 1.4,
            }}
            dangerouslySetInnerHTML={{ __html: excerpt }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Drawer Section ───────────────────────────────

interface DrawerSectionProps {
  id: string;
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
}: DrawerSectionProps) {
  const { activeFileId, selectedIds, openFile, toggleSelectFile, selectRange, clearSelection, sortBy } =
    useAppStore();
  const sorted = sortFiles(files, sortBy);
  const renameRef = useRef<HTMLInputElement>(null);
  const [renameValue, setRenameValue] = useState(title);
  const filesRef = useRef<HTMLDivElement>(null);

  const { ref: dropRef, isDropTarget } = useDroppable({ id });

  const totalAdded = files.reduce((s, f) => s + (f.linesAdded || 0), 0);
  const totalRemoved = files.reduce((s, f) => s + (f.linesRemoved || 0), 0);

  // Stagger file items when drawer opens
  useStaggerIn(
    filesRef,
    ".fi",
    { translateY: [6, 0], opacity: [0, 1], duration: 200, delay: 25, ease: "outCubic" },
    [isOpen, sorted.length],
  );

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
      const el = document.getElementById(fileId);
      const container = el?.closest?.(".content-scroll") as HTMLElement | null;
      if (el && container) {
        const relTop = el.offsetTop - container.offsetTop;
        container.scrollTo({ top: relTop - 8, behavior: "smooth" });
      }
    }, 50);
  };

  const commitRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== title) {
      onFinishRename?.(trimmed);
    } else {
      onFinishRename?.(title);
    }
  };

  // Combine drop ref with our files ref
  const setRefs = useCallback((el: HTMLDivElement | null) => {
    dropRef(el);
    (filesRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  }, [dropRef]);

  return (
    <div
      className={`drawer ${isDropTarget && id !== "pinned" ? "drop-target" : ""}`}
      data-section-id={id}
    >
      <button
        className="dw-btn"
        onClick={onToggle}
        onDoubleClick={(e) => {
          if (renamable) {
            e.stopPropagation();
            onStartRename?.();
          }
        }}
      >
        <ChevronRight size={12} className={isOpen ? "open" : ""} />
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
          <span className="dw-name">{title}</span>
        )}
        <span className="dw-meta">
          {(totalAdded > 0 || totalRemoved > 0) && (
            <span className="diff">
              {totalAdded > 0 && <span className="d-add">+{totalAdded}</span>}
              {totalRemoved > 0 && <span className="d-del">{"\u2212"}{totalRemoved}</span>}
            </span>
          )}
          <span className="badge">{files.length}</span>
          {onEject && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onEject();
              }}
              title={`Eject ${title}`}
              className="dw-eject"
            >
              <X size={12} />
            </span>
          )}
        </span>
      </button>

      <div ref={setRefs} className={`dw-files ${isOpen ? "" : "closed"}`}>
        {sorted.map((file) => {
          const excerpt = searchExcerpts?.get(file.id);
          return (
            <DraggableFileItem
              key={file.id}
              file={file}
              isActive={activeFileId === file.id}
              isSelected={selectedIds.has(file.id)}
              excerpt={excerpt}
              onClick={(e) => handleFileClick(file.id, e)}
            />
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

  const handleDragEnd = useCallback((event: { operation: { source?: { id: string | number } | null; target?: { id: string | number } | null } }) => {
    const { source, target } = event.operation;
    if (!source || !target) return;

    const fileId = String(source.id);
    const targetId = String(target.id);

    if (targetId === "pinned") return;

    if (targetId === "loose") {
      const store = useAppStore.getState();
      for (const g of store.groups) {
        if (g.fileIds.includes(fileId)) {
          store.removeFileFromGroup(fileId, g.id);
          break;
        }
      }
    } else {
      moveFileToGroup(fileId, targetId);
    }
  }, [moveFileToGroup]);

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

  const searchExcerpts = useMemo(() => {
    if (!q || searchMode !== "content") return undefined;
    const map = new Map<string, string>();
    for (const f of files) {
      const idx = f.content.toLowerCase().indexOf(q);
      if (idx !== -1) {
        const start = Math.max(0, idx - 20);
        const end = Math.min(f.content.length, idx + q.length + 40);
        let snippet = f.content.substring(start, end).replace(/\n/g, " ");
        if (start > 0) snippet = "\u2026" + snippet;
        if (end < f.content.length) snippet += "\u2026";
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
    <div className="sidebar">
      {/* Header */}
      <div className="sb-head">
        <span>Explorer</span>
        <button className="btn-icon" onClick={handleCreateTab}>
          <Plus size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="sb-search">
        <div className="sb-search-in">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchMode === "content" ? "Search in files..." : "Find files..."}
          />
          <div className="filter-pills">
            <button className={`fpill ${searchMode === "filename" ? "on" : ""}`} onClick={() => setSearchMode("filename")}>Name</button>
            <button className={`fpill ${searchMode === "content" ? "on" : ""}`} onClick={() => setSearchMode("content")}>Body</button>
          </div>
        </div>
      </div>

      {/* Sort */}
      <div className="sb-sort">
        {(["Name", "Modified", "Changes"] as const).map((label) => {
          const value = label.toLowerCase() as "name" | "modified" | "changes";
          return (
            <button
              key={value}
              className={`sort-b ${sortBy === value ? "on" : ""}`}
              onClick={() => setSortBy(value)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="sb-div" />

      {/* Tree */}
      <DragDropProvider
        sensors={[PointerSensor.configure({ activationConstraints: [new PointerActivationConstraints.Distance({ value: 5 })] })]}
        onDragEnd={handleDragEnd}
      >
        <div className="tree">
          {(!q || filteredPinned.length > 0) && pinnedFiles.length > 0 && (
            <DrawerSection
              id="pinned"
              title="Pinned"
              files={q ? filteredPinned : pinnedFiles}
              allFileIds={allFileIds}
              isOpen={drawerOpen["pinned"] ?? true}
              onToggle={() => toggleDrawer("pinned")}
              searchExcerpts={searchExcerpts}
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
                    const ids = group.fileIds;
                    removeGroupAndFiles(group.id);
                    invoke("remove_files", { ids });
                    addToast(group.name, "ejected", "amber");
                  } else {
                    removeGroup(group.id);
                    addToast(group.name, "tab removed", "amber");
                  }
                }}
                searchExcerpts={searchExcerpts}
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
            />
          )}

          {files.length === 0 && (
            <div className="empty">
              <div className="empty-text">drop files or folders</div>
            </div>
          )}
        </div>

        <DragOverlay>
          {(source) => {
            if (!source) return null;
            const file = source.data?.file as WatchedFile | undefined;
            if (!file) return null;
            return (
              <div className="drag-ghost-overlay">
                <FileIcon extension={file.extension} />
                <span className="dg-name">{file.name}<span className="dg-ext">.{file.extension}</span></span>
              </div>
            );
          }}
        </DragOverlay>
      </DragDropProvider>

      <StatusBar />
    </div>
  );
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
