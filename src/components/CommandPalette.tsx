import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../stores/app-store";
import { useToastStore } from "../stores/toast-store";
import { useCommandStore } from "../stores/command-store";
import { Icons } from "./Icons";
import { Kbd } from "./Kbd";
import { ExtDot } from "./ExtDot";
import type { WatchedFile, DirectoryResult } from "../types/files";

const THEMES = ["n01z", "paper", "phosphor", "ember"] as const;

type PaletteItem =
  | { type: "file"; id: string; label: string; ext: string; kbd?: string }
  | { type: "cmd"; id: string; label: string; icon: "search" | "file" | "folder" | "plus" | "sparkle" | "palette"; kbd?: string; sub?: string }
  | { type: "sep"; label: string };

export function CommandPalette() {
  const { open, close } = useCommandStore();
  const { files, groups, openFile, setTheme, theme, addFiles, addGroup } = useAppStore();
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

  useEffect(() => {
    if (open) {
      setQuery("");
      setIdx(0);
      setNewFileTarget(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ⌘K shortcut
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
    const result: PaletteItem[] = [];

    // Files
    files
      .filter((f) => !q || f.name.toLowerCase().includes(q) || f.extension.toLowerCase().includes(q))
      .forEach((f, i) => {
        result.push({
          type: "file",
          id: f.id,
          label: `${f.name}.${f.extension}`,
          ext: f.extension,
          kbd: i < 9 ? `\u2318${i + 1}` : undefined,
        });
      });

    if (!q) {
      result.push({ type: "sep", label: "Actions" });
      result.push({ type: "cmd", id: "add-folder", label: "Add Folder", icon: "folder" });
      result.push({ type: "cmd", id: "add-file", label: "Add Files", icon: "file" });

      for (const g of groups.filter((g) => g.sourcePath)) {
        result.push({
          type: "cmd",
          id: `new-${g.id}`,
          label: `New File in ${g.name}`,
          icon: "plus",
        });
      }

      result.push({ type: "sep", label: "Appearance" });
      result.push({
        type: "cmd",
        id: "theme",
        label: "Cycle Theme",
        icon: "palette",
        kbd: "\u2318T",
        sub: theme,
      });
    }

    return result;
  }, [query, files, groups, theme]);

  const selectable = useMemo(() => items.filter((i) => i.type !== "sep"), [items]);

  // ─── Handlers ───

  const handleSelect = useCallback(
    (id: string) => {
      const store = useAppStore.getState();
      const file = store.files.find((f) => f.id === id);
      if (file?.pinned) {
        if (!store.drawerOpen["pinned"]) store.toggleDrawer("pinned");
      } else {
        const group = store.groups.find((g) => g.fileIds.includes(id));
        if (group) {
          if (!store.drawerOpen[group.id]) store.toggleDrawer(group.id);
        } else {
          if (!store.drawerOpen["loose"]) store.toggleDrawer("loose");
        }
      }
      openFile(id);
      close();
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    },
    [openFile, close],
  );

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
    const fileName = query.trim();
    try {
      const created = await invoke<WatchedFile>("create_file", {
        dir: newFileTarget.dir,
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
      if (item.type === "file") {
        handleSelect(item.id);
        return;
      }
      if (item.id === "add-folder") {
        handleAddDir();
      } else if (item.id === "add-file") {
        handleAddFile();
      } else if (item.id === "theme") {
        cycleTheme();
        close();
      } else if (item.id.startsWith("new-")) {
        const groupId = item.id.replace("new-", "");
        const group = groups.find((g) => g.id === groupId);
        if (group) {
          setNewFileTarget({ groupId: group.id, dir: group.sourcePath, name: group.name });
          setQuery("");
          setIdx(0);
          setTimeout(() => inputRef.current?.focus(), 30);
        }
      }
    },
    [handleSelect, handleAddDir, handleAddFile, cycleTheme, close, groups],
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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 80,
        background: "rgba(0,0,0,0.18)",
        backdropFilter: "blur(24px) saturate(1.4)",
        WebkitBackdropFilter: "blur(24px) saturate(1.4)",
      }}
    >
      <div
        style={{
          width: 560,
          borderRadius: 12,
          overflow: "hidden",
          background: "var(--cmd-bg)",
          boxShadow: "var(--cmd-shadow)",
          border: "1px solid var(--brd)",
          animation: "cmdIn 120ms cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        {/* Search row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: "1px solid var(--brd)",
          }}
        >
          <span style={{ color: "var(--tx3)", display: "flex", flexShrink: 0 }}>
            <Icons.search />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIdx(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={newFileTarget ? `filename (in ${newFileTarget.name})...` : "Search files, commands..."}
            style={{
              flex: 1,
              fontSize: 15,
              background: "transparent",
              color: "var(--tx)",
              border: "none",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Items */}
        <div ref={listRef} style={{ maxHeight: 380, overflowY: "auto", padding: "4px 6px" }}>
          {newFileTarget ? (
            <div style={{ padding: "12px 10px", fontSize: 13, color: "var(--tx3)" }}>
              Type a filename and press{" "}
              <span style={{ color: "var(--ac)" }}>Enter</span> to create in{" "}
              <span style={{ color: "var(--tx)" }}>{newFileTarget.name}/</span>
              {query.trim() && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "var(--hover)",
                    color: "var(--tx)",
                    fontSize: 14,
                  }}
                >
                  {newFileTarget.name}/{query.trim()}
                </div>
              )}
            </div>
          ) : (
            <>
              {items.map((item) => {
                if (item.type === "sep") {
                  return (
                    <div
                      key={`sep-${item.label}`}
                      style={{
                        padding: "12px 10px 4px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--tx3)",
                      }}
                    >
                      {item.label}
                    </div>
                  );
                }

                selectableIdx++;
                const isSel = selectableIdx === idx;
                const IconComp =
                  item.type === "cmd" ? Icons[item.icon] : null;

                return (
                  <div
                    key={item.id}
                    data-idx={selectableIdx}
                    onClick={() => handleActivateItem(item)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      background: isSel ? "var(--hover)" : "transparent",
                      transition: "background 50ms",
                    }}
                  >
                    {item.type === "file" ? (
                      <span style={{ color: "var(--tx3)", display: "flex", flexShrink: 0 }}>
                        <Icons.file />
                      </span>
                    ) : IconComp ? (
                      <span style={{ color: "var(--ac)", display: "flex", flexShrink: 0 }}>
                        <IconComp />
                      </span>
                    ) : null}
                    <span
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: "var(--tx)",
                        fontWeight: item.type === "cmd" ? 500 : 400,
                      }}
                    >
                      {item.label}
                    </span>
                    {item.type === "cmd" && item.sub && (
                      <span style={{ fontSize: 12, color: "var(--tx3)" }}>{item.sub}</span>
                    )}
                    {item.type === "file" && (
                      <ExtDot extension={item.ext} size={6} />
                    )}
                    {item.kbd && <Kbd>{item.kbd}</Kbd>}
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
        <div
          style={{
            display: "flex",
            gap: 16,
            padding: "8px 16px",
            borderTop: "1px solid var(--brd)",
          }}
        >
          {[
            { k: "\u2191\u2193", l: "Navigate" },
            { k: "\u23CE", l: "Open" },
            { k: "esc", l: "Close" },
          ].map((h) => (
            <span
              key={h.l}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "var(--tx3)",
              }}
            >
              <Kbd>{h.k}</Kbd>
              <span>{h.l}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
