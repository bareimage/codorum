import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { Toolbar } from "./components/Toolbar";
import { Sidebar } from "./components/Sidebar";
import { ContentPane } from "./components/ContentPane";
import { CommandPalette } from "./components/CommandPalette";
import { Toasts } from "./components/Toasts";
import { EjectBar } from "./components/EjectBar";
import { DropZone } from "./components/DropZone";
import { HelpModal } from "./components/HelpModal";
import { useAppStore } from "./stores/app-store";
import { useToastStore } from "./stores/toast-store";
import { useCommandStore } from "./stores/command-store";
import type { DropBatchResult, FileRenamedPayload, WatchedFile } from "./types/files";

export default function App() {
  const { addFiles, addGroup } = useAppStore();
  const theme = useAppStore((s) => s.theme);
  const isFullscreen = useAppStore((s) => s.isFullscreen);
  const addToast = useToastStore((s) => s.add);
  const [dropHovering, setDropHovering] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Sync theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Load watched files from SQLite on startup
  useEffect(() => {
    invoke<WatchedFile[]>("load_watched_files").then(
      (loaded) => {
        console.log("[codorum] load_watched_files:", loaded.length, "files");
        loaded.forEach(f => console.log(`  ${f.name}.${f.extension} content=${f.content?.length ?? 0} chars`));
        if (loaded.length > 0) {
          useAppStore.getState().setFiles(loaded);
          addToast(`${loaded.length} file(s)`, "restored", "cyan");
        }
      },
    ).catch(err => console.error("[codorum] load_watched_files failed:", err));
  }, [addToast]);

  // Listen for file changes from Tauri backend
  useEffect(() => {
    const unlisten = listen<WatchedFile>("file-changed", (event) => {
      const updated = event.payload;
      const { files, updateFile, setCardDirty } = useAppStore.getState();

      const file = files.find((f) => f.id === updated.id);
      if (!file) return;

      // Skip if content unchanged (e.g. our own save triggered the watcher)
      if (updated.content === file.content) return;

      updateFile(file.id, {
        content: updated.content,
        modified: updated.modified,
        linesAdded: updated.lines_added ?? 0,
        linesRemoved: updated.lines_removed ?? 0,
      });
      setCardDirty(file.id, false);
      addToast("Updated", file.name, "cyan");
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [addToast]);

  // Listen for file renames from Tauri backend
  useEffect(() => {
    const unlisten = listen<FileRenamedPayload>("file-renamed", (event) => {
      const { old_path, new_path, new_name, new_extension } = event.payload;
      const { files, updateFile } = useAppStore.getState();

      const norm = old_path.replace(/\\/g, "/");
      const file = files.find((f) => f.path.replace(/\\/g, "/") === norm);
      if (!file) return;

      updateFile(file.id, {
        path: new_path,
        name: new_name,
        extension: new_extension,
      });
      addToast("Renamed", `${file.name} → ${new_name}`, "cyan");
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [addToast]);

  // Listen for file deletions from Tauri backend
  useEffect(() => {
    const unlisten = listen<string>("file-removed", (event) => {
      const rawPath = event.payload;
      const { files, updateFile } = useAppStore.getState();

      const norm = rawPath.replace(/\\/g, "/");
      const file = files.find((f) => f.path.replace(/\\/g, "/") === norm);
      if (!file) return;

      updateFile(file.id, { deleted: true });
      addToast("Deleted", file.name, "rose");
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [addToast]);

  // Tauri native drag-drop
  useEffect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "enter" || event.payload.type === "over") {
        setDropHovering(true);
      } else if (event.payload.type === "drop") {
        setDropHovering(false);
        const paths = event.payload.paths;
        if (paths.length > 0) {
          invoke<DropBatchResult>("drop_paths", { paths }).then((result) => {
            if (result.loose_files.length > 0) {
              addFiles(result.loose_files);
            }
            for (const dir of result.directories) {
              if (dir.files.length > 0) {
                addFiles(dir.files);
                addGroup({
                  id: crypto.randomUUID(),
                  name: dir.dir_name,
                  sourcePath: dir.source_dir,
                  collapsed: false,
                  fileIds: dir.files.map((f) => f.id),
                });
              }
            }
            const total =
              result.loose_files.length +
              result.directories.reduce((s, d) => s + d.files.length, 0);
            if (total > 0) {
              addToast(`${total} file(s)`, "added", "cyan");
            } else {
              addToast("0 new files", "already watching", "amber");
            }
          });
        }
      } else if (event.payload.type === "leave") {
        setDropHovering(false);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [addFiles, addGroup, addToast]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable || !!(e.target as HTMLElement)?.closest?.(".cm-editor");

      // ⌘S — dispatch save event to active FileCard
      if (mod && e.key === "s") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("codorum:save"));
      }

      // ⌘A — select all files (only when not editing)
      if (mod && e.key === "a" && !isEditing) {
        e.preventDefault();
        useAppStore.getState().selectAll();
      }

      // Delete/Backspace — eject selected files (only when not editing)
      if ((e.key === "Delete" || e.key === "Backspace") && !isEditing) {
        const { selectedIds, ejectSelected, activeFileId, removeFile } = useAppStore.getState();
        if (selectedIds.size > 0) {
          e.preventDefault();
          ejectSelected();
          addToast(`${selectedIds.size} file(s)`, "ejected", "amber");
        } else if (activeFileId) {
          e.preventDefault();
          const file = useAppStore.getState().files.find((f) => f.id === activeFileId);
          removeFile(activeFileId);
          if (file) addToast(file.name, "ejected", "amber");
        }
      }

      // ⇧⌘↑/⇧⌘↓ — switch between file cards
      if (mod && e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        const { files, activeFileId, openFile: navTo } = useAppStore.getState();
        if (files.length === 0) return;
        e.preventDefault();
        // Build visible file order from DOM (matches ContentPane rendering)
        const cards = Array.from(document.querySelectorAll<HTMLElement>(".content-scroll .fc[id]"));
        const ids = cards.map((el) => el.id);
        if (ids.length === 0) return;
        const curIdx = activeFileId ? ids.indexOf(activeFileId) : -1;
        const nextIdx = e.key === "ArrowDown"
          ? Math.min(curIdx + 1, ids.length - 1)
          : Math.max(curIdx - 1, 0);
        navTo(ids[nextIdx]);
        cards[nextIdx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      // Escape — clear selection
      if (e.key === "Escape" && !isEditing) {
        useAppStore.getState().clearSelection();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addToast]);

  // Right-click opens Command Palette instead of browser context menu
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      useCommandStore.getState().toggle();
    };
    window.addEventListener("contextmenu", handler);
    return () => window.removeEventListener("contextmenu", handler);
  }, []);

  return (
    <div className="flex flex-col h-full select-none" style={{ padding: 16, gap: 16, position: 'relative', overflow: 'hidden' }}>
      <div className="bg-solid" />
      <div className="bg-grad" />
      <div className={`ui ${showHelp ? "help-blur" : ""}`}>
        <Toolbar onHelp={() => setShowHelp(true)} />
        <div className="main">
          {!isFullscreen && <Sidebar />}
          <ContentPane />
        </div>
      </div>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      <CommandPalette />
      <EjectBar />
      <Toasts />
      {dropHovering && <DropZone />}
    </div>
  );
}
