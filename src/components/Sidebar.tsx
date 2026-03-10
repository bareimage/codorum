import { useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, getUngroupedFiles } from "../stores/app-store";
import { useToastStore } from "../stores/toast-store";
import { sortFiles } from "../utils/sortFiles";
import { Icons } from "./Icons";
import { ExtDot } from "./ExtDot";
import { DiffBadge } from "./DiffBadge";
import { StatusBar } from "./StatusBar";
import type { WatchedFile } from "../types/files";

// ─── Drawer Section ───────────────────────────────

interface DrawerSectionProps {
  title: string;
  files: WatchedFile[];
  allFileIds: string[];
  isOpen: boolean;
  onToggle: () => void;
  onEject?: () => void;
}

function DrawerSection({ title, files, allFileIds, isOpen, onToggle, onEject }: DrawerSectionProps) {
  const { activeFileId, selectedIds, openFile, toggleSelectFile, selectRange, clearSelection, sortBy } = useAppStore();
  const sorted = sortFiles(files, sortBy);

  const totalAdded = files.reduce((s, f) => s + (f.linesAdded || 0), 0);
  const totalRemoved = files.reduce((s, f) => s + (f.linesRemoved || 0), 0);

  const handleFileClick = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      selectRange(id, allFileIds);
    } else if (e.metaKey || e.ctrlKey) {
      toggleSelectFile(id);
    } else {
      clearSelection();
      openFile(id);
    }
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  };

  return (
    <div className="drawer-section" style={{ position: "relative" }}>
      <button
        onClick={onToggle}
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
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <DiffBadge added={totalAdded} removed={totalRemoved} />
          <span style={{ fontSize: 11, color: "var(--tx3)", minWidth: 18, textAlign: "right" }}>
            {files.length}
          </span>
          {onEject && (
            <span
              onClick={(e) => { e.stopPropagation(); onEject(); }}
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
          return (
            <button
              key={file.id}
              onClick={(e) => handleFileClick(file.id, e)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: highlighted ? "calc(100% - 12px)" : "100%",
                padding: "5px 12px 5px 32px",
                background: isSelected ? "color-mix(in srgb, var(--warn) 15%, transparent)" : isActive ? "var(--ring)" : "transparent",
                border: "none",
                borderRadius: highlighted ? 6 : 0,
                margin: highlighted ? "1px 6px" : "0",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "all 60ms",
              }}
            >
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
                <span style={{ color: file.deleted ? "var(--deleted)" : "var(--tx3)", fontWeight: 400 }}>.{file.extension}</span>
              </span>
              <DiffBadge added={file.linesAdded} removed={file.linesRemoved} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────

export function Sidebar() {
  const { files, groups, drawerOpen, toggleDrawer, sortBy, setSortBy, search, setSearch, removeGroupAndFiles } =
    useAppStore();
  const addToast = useToastStore((s) => s.add);

  const pinnedFiles = files.filter((f) => f.pinned);
  const ungrouped = getUngroupedFiles(files, groups).filter((f) => !f.pinned);

  const q = search.toLowerCase().trim();
  const filterFiles = (list: WatchedFile[]) =>
    q ? list.filter((f) => f.name.toLowerCase().includes(q)) : list;

  const filteredPinned = useMemo(() => filterFiles(pinnedFiles), [pinnedFiles, q]);
  const filteredUngrouped = useMemo(() => filterFiles(ungrouped), [ungrouped, q]);
  const allFileIds = useMemo(() => files.map((f) => f.id), [files]);

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
            placeholder="Find files..."
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

      {/* Sort bar */}
      <div style={{ display: "flex", gap: 1, padding: "2px 12px 8px" }}>
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
      </div>
      <div style={{ height: 1, background: "var(--brd)", margin: "0 12px" }} />

      {/* Drawers */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
        {(!q || filteredPinned.length > 0) && pinnedFiles.length > 0 && (
          <DrawerSection
            title="Pinned"
            files={q ? filteredPinned : pinnedFiles}
            allFileIds={allFileIds}
            isOpen={drawerOpen["pinned"] ?? true}
            onToggle={() => toggleDrawer("pinned")}
          />
        )}

        {groups.map((group) => {
          const groupFiles = group.fileIds
            .map((id) => files.find((f) => f.id === id))
            .filter(Boolean) as WatchedFile[];
          const filtered = filterFiles(groupFiles);
          if (q && filtered.length === 0) return null;
          return (
            <DrawerSection
              key={group.id}
              title={group.name}
              files={q ? filtered : groupFiles}
              allFileIds={allFileIds}
              isOpen={drawerOpen[group.id] ?? true}
              onToggle={() => toggleDrawer(group.id)}
              onEject={() => {
                const ids = group.fileIds;
                removeGroupAndFiles(group.id);
                invoke("remove_files", { ids });
                addToast(group.name, "ejected", "amber");
              }}
            />
          );
        })}

        {(!q || filteredUngrouped.length > 0) && ungrouped.length > 0 && (
          <DrawerSection
            title="Loose"
            files={q ? filteredUngrouped : ungrouped}
            allFileIds={allFileIds}
            isOpen={drawerOpen["loose"] ?? true}
            onToggle={() => toggleDrawer("loose")}
          />
        )}

        {files.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <div style={{ color: "var(--tx3)", opacity: 0.25, fontSize: 10 }}>
              drop files or folders
            </div>
          </div>
        )}
      </div>

      <StatusBar />
    </div>
  );
}
