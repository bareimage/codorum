import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { Search, File, FolderOpen, Plus, Sparkles, Palette, ExternalLink, Trash2 } from "lucide-react";
import { animate } from "animejs";
import { useAppStore } from "../stores/app-store";
import { useToastStore } from "../stores/toast-store";
import { useCommandStore } from "../stores/command-store";
import type { WatchedFile, DirectoryResult } from "../types/files";

const THEMES = ["n01z", "paper", "phosphor", "ember"] as const;

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  search: Search,
  file: File,
  folder: FolderOpen,
  plus: Plus,
  sparkle: Sparkles,
  palette: Palette,
  external: ExternalLink,
  eject: Trash2,
};

type PaletteItem =
  | { type: "cmd"; id: string; label: string; icon: "search" | "file" | "folder" | "plus" | "sparkle" | "palette" | "external" | "eject"; kbd?: string; sub?: string }
  | { type: "sep"; label: string };

export function CommandPalette() {
  const { open, close } = useCommandStore();
  const { files, groups, activeFileId, selectedIds, openFile, setTheme, theme, addFiles, addGroup, createTab } = useAppStore();
  const addToast = useToastStore((s) => s.add);
  const [query, setQuery] = useState("");
  const [idx, setIdx] = useState(0);
  const [newFileTarget, setNewFileTarget] = useState<{
    groupId: string;
    dir: string;
    name: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cmdRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIdx(0);
      setNewFileTarget(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Entrance animation
  useEffect(() => {
    if (open) {
      if (overlayRef.current) {
        animate(overlayRef.current, {
          opacity: [0, 1],
          duration: 120,
          ease: "outCubic",
        });
      }
      if (cmdRef.current) {
        animate(cmdRef.current, {
          translateY: [-6, 0],
          scale: [0.98, 1],
          opacity: [0, 1],
          duration: 150,
          ease: "outCubic",
        });
      }
    }
  }, [open]);

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useCommandStore.getState().toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Build items
  const items = useMemo<PaletteItem[]>(() => {
    const q = query.toLowerCase();
    const all: PaletteItem[] = [];

    const activeFile = activeFileId ? files.find((f) => f.id === activeFileId) : null;

    all.push({ type: "sep", label: "Actions" });
    if (activeFile) {
      all.push({ type: "cmd", id: "reveal-finder", label: "Reveal in Finder", icon: "external" });
    }
    if (activeFile || selectedIds.size > 0) {
      all.push({ type: "cmd", id: "eject-file", label: "Eject File", icon: "eject" });
    }
    all.push({ type: "cmd", id: "add-folder", label: "Add Folder", icon: "folder" });
    all.push({ type: "cmd", id: "add-file", label: "Add Files", icon: "file" });
    all.push({ type: "cmd", id: "create-tab", label: "Create Tab", icon: "plus" });

    for (const g of groups) {
      all.push({
        type: "cmd",
        id: `new-${g.id}`,
        label: `New File in ${g.name}`,
        icon: "plus",
      });
    }

    all.push({ type: "sep", label: "Appearance" });
    all.push({
      type: "cmd",
      id: "theme",
      label: "Cycle Theme",
      icon: "palette",
      kbd: "\u2318T",
      sub: theme,
    });

    if (!q) return all;

    return all.filter(
      (item) => item.type === "sep" || item.label.toLowerCase().includes(q),
    );
  }, [query, groups, theme, activeFileId, files]);

  const selectable = useMemo(() => items.filter((i) => i.type !== "sep"), [items]);

  // ─── Handlers ───

  const handleAddDir = useCallback(async () => {
    close();
    try {
      const result = await invoke<DirectoryResult>("add_directory");
      if (result.files.length > 0) {
        addFiles(result.files);
        addGroup({
          id: crypto.randomUUID(),
          name: result.dir_name,
          sourcePath: result.source_dir,
          collapsed: false,
          fileIds: result.files.map((f) => f.id),
        });
        addToast(`${result.files.length} file(s)`, "added", "cyan");
      } else if (result.source_dir) {
        addToast("0 new files", "already watching", "amber");
      }
    } catch {
      /* user cancelled */
    }
  }, [close, addFiles, addGroup, addToast]);

  const handleAddFile = useCallback(async () => {
    close();
    try {
      const added = await invoke<WatchedFile[]>("add_files");
      if (added.length > 0) {
        addFiles(added);
        addToast(`${added.length} file(s)`, "added", "cyan");
      }
    } catch {
      /* user cancelled */
    }
  }, [close, addFiles, addToast]);

  const handleCreateFile = useCallback(async () => {
    if (!newFileTarget || !query.trim()) return;
    let fileName = query.trim();
    if (!fileName.includes(".")) fileName += ".md";

    let dir = newFileTarget.dir;

    if (!dir) {
      try {
        const ext = fileName.includes(".")
          ? fileName.split(".").pop()!
          : "md";
        const savePath = await save({
          defaultPath: fileName,
          filters: [{ name: `${ext.toUpperCase()} file`, extensions: [ext] }],
        });
        if (!savePath) return;
        const lastSep = savePath.lastIndexOf("/");
        dir = savePath.substring(0, lastSep);
        fileName = savePath.substring(lastSep + 1);
      } catch {
        return;
      }
    }

    try {
      const created = await invoke<WatchedFile>("create_file", {
        dir,
        name: fileName,
      });
      addFiles([created]);
      const store = useAppStore.getState();
      const group = store.groups.find((g) => g.id === newFileTarget.groupId);
      if (group) {
        useAppStore.setState({
          groups: store.groups.map((g) =>
            g.id === newFileTarget.groupId ? { ...g, fileIds: [...g.fileIds, created.id] } : g,
          ),
        });
      }
      openFile(created.id);
      addToast(fileName, "created", "cyan");
      close();
    } catch (err) {
      addToast("Error", String(err), "amber");
    }
  }, [newFileTarget, query, addFiles, openFile, addToast, close]);

  const cycleTheme = useCallback(() => {
    const cur = THEMES.indexOf(theme as (typeof THEMES)[number]);
    setTheme(THEMES[(cur + 1) % THEMES.length]);
  }, [theme, setTheme]);

  const handleActivateItem = useCallback(
    (item: PaletteItem) => {
      if (item.type === "sep") return;
      if (item.id === "reveal-finder") {
        const state = useAppStore.getState();
        const targetId = state.activeFileId || [...state.selectedIds][0];
        const targetFile = targetId ? files.find((f) => f.id === targetId) : null;
        if (targetFile) {
          invoke("reveal_in_finder", { path: targetFile.path });
        }
        close();
      } else if (item.id === "eject-file") {
        const state = useAppStore.getState();
        if (state.selectedIds.size > 0) {
          state.ejectSelected();
          addToast(`${state.selectedIds.size} file(s)`, "ejected", "amber");
        } else if (state.activeFileId) {
          state.removeFile(state.activeFileId);
          addToast("File", "ejected", "amber");
        }
        close();
      } else if (item.id === "add-folder") {
        handleAddDir();
      } else if (item.id === "add-file") {
        handleAddFile();
      } else if (item.id === "create-tab") {
        const id = createTab("Untitled");
        addToast("Untitled", "tab created", "cyan");
        close();
        setTimeout(() => window.dispatchEvent(new CustomEvent("codorum:rename-tab", { detail: id })), 100);
      } else if (item.id === "theme") {
        cycleTheme();
        close();
      } else if (item.id.startsWith("new-")) {
        const groupId = item.id.replace("new-", "");
        const group = groups.find((g) => g.id === groupId);
        if (group) {
          setNewFileTarget({ groupId: group.id, dir: group.sourcePath ?? "", name: group.name });
          setQuery("");
          setIdx(0);
          setTimeout(() => inputRef.current?.focus(), 30);
        }
      }
    },
    [handleAddDir, handleAddFile, createTab, cycleTheme, close, groups, addToast],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (newFileTarget) {
          setNewFileTarget(null);
          setQuery("");
        } else {
          close();
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, selectable.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (newFileTarget && query.trim()) {
          handleCreateFile();
        } else if (selectable[idx]) {
          handleActivateItem(selectable[idx]);
        }
      }
    },
    [idx, selectable, newFileTarget, query, close, handleCreateFile, handleActivateItem],
  );

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  if (!open) return null;

  let selectableIdx = -1;

  return (
    <div ref={overlayRef} className="cmd-overlay" style={{ opacity: 0 }} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div ref={cmdRef} className="cmd" style={{ opacity: 0 }}>
        {/* Search row */}
        <div className="cmd-input">
          <Search size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={newFileTarget ? `filename (in ${newFileTarget.name})...` : "Type a command..."}
          />
        </div>

        {/* Items */}
        <div ref={listRef} className="cmd-list">
          {newFileTarget ? (
            <div style={{ padding: "12px 10px", fontSize: 13, color: "var(--tx3)" }}>
              Type a filename and press{" "}
              <span style={{ color: "var(--ac)" }}>Enter</span> to create in{" "}
              <span style={{ color: "var(--tx)" }}>{newFileTarget.name}/</span>
              {query.trim() && (
                <div className="cmd-item" style={{ marginTop: 8 }}>
                  {newFileTarget.name}/{query.trim()}
                </div>
              )}
            </div>
          ) : (
            <>
              {items.map((item) => {
                if (item.type === "sep") {
                  return (
                    <div key={`sep-${item.label}`} className="cmd-sep">
                      {item.label}
                    </div>
                  );
                }

                selectableIdx++;
                const isSel = selectableIdx === idx;
                const IconComp = ICON_MAP[item.icon];

                return (
                  <div
                    key={item.id}
                    data-idx={selectableIdx}
                    className={`cmd-item ${isSel ? "hi" : ""}`}
                    onClick={() => handleActivateItem(item)}
                  >
                    {IconComp && (
                      <span className="cmd-icon">
                        <IconComp size={14} />
                      </span>
                    )}
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.sub && <span className="cmd-sub">{item.sub}</span>}
                    {item.kbd && <kbd className="kbd">{item.kbd}</kbd>}
                  </div>
                );
              })}
              {selectable.length === 0 && (
                <div style={{ padding: 32, textAlign: "center", color: "var(--tx3)", fontSize: 14 }}>
                  No results found
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="cmd-foot">
          {[
            { k: "\u2191\u2193", l: "Navigate" },
            { k: "\u23CE", l: "Open" },
            { k: "esc", l: "Close" },
          ].map((h) => (
            <span key={h.l}>
              <kbd className="kbd">{h.k}</kbd>
              <span>{h.l}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
