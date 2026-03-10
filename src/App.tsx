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
import { useAppStore } from "./stores/app-store";
import { useToastStore } from "./stores/toast-store";
import { useCommandStore } from "./stores/command-store";
import type { DropBatchResult, FileRenamedPayload, WatchedFile } from "./types/files";

export default function App() {
  const { addFiles, addGroup } = useAppStore();
  const theme = useAppStore((s) => s.theme);
  const addToast = useToastStore((s) => s.add);
  const [dropHovering, setDropHovering] = useState(false);

  // Sync theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Restore persisted files on startup
  useEffect(() => {
    const { savedFilePaths, setFiles } = useAppStore.getState();
    if (savedFilePaths.length === 0) return;

    invoke<WatchedFile[]>("restore_files", { saved: savedFilePaths }).then(
      (restored) => {
        if (restored.length > 0) {
          setFiles(restored);
          addToast(`${restored.length} file(s)`, "restored", "cyan");
        }
      },
    );
  }, [addToast]);

  // Listen for file changes from Tauri backend
  useEffect(() => {
    const unlisten = listen<string>("file-changed", async (event) => {
      const rawPath = event.payload;
      const { files, updateFile, setCardDirty } = useAppStore.getState();

      // Normalize slashes so paths always match
      const norm = rawPath.replace(/\\/g, "/");
      const file = files.find((f) => f.path.replace(/\\/g, "/") === norm);
      if (!file) return;

      try {
        const result = await invoke<{ content: string; modified: number }>(
          "refresh_file",
          { path: file.path },
        );
        if (result) {
          // Re-read store after await to avoid stale comparison
          const current = useAppStore.getState().files.find((f) => f.id === file.id);
          const currentContent = current?.content ?? file.content;

          // Skip if content unchanged (e.g. our own save triggered the watcher)
          if (result.content === currentContent) return;

          const oldLines = (currentContent || "").split("\n");
          const newLines = result.content.split("\n");
          const oldSet = new Set(oldLines);
          const newSet = new Set(newLines);

          let added = 0;
          let removed = 0;
          for (const line of newLines) {
            if (!oldSet.has(line)) added++;
          }
          for (const line of oldLines) {
            if (!newSet.has(line)) removed++;
          }

          updateFile(file.id, {
            content: result.content,
            modified: result.modified,
            linesAdded: added,
            linesRemoved: removed,
          });
          setCardDirty(file.id, false);
          addToast("Updated", file.name, "cyan");
        }
      } catch {
        // File may have been deleted
      }
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
          const ids = [...selectedIds];
          ejectSelected();
          invoke("remove_files", { ids });
          addToast(`${selectedIds.size} file(s)`, "ejected", "amber");
        } else if (activeFileId) {
          e.preventDefault();
          const file = useAppStore.getState().files.find((f) => f.id === activeFileId);
          removeFile(activeFileId);
          invoke("remove_files", { ids: [activeFileId] });
          if (file) addToast(file.name, "ejected", "amber");
        }
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
    <div className="flex flex-col h-screen select-none">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <ContentPane />
      </div>
      <CommandPalette />
      <EjectBar />
      <Toasts />

      {/* Drop zone overlay */}
      {dropHovering && (
        <div className="drop-zone-overlay">
          <div className="drop-zone-indicator">
            drop files here
          </div>
        </div>
      )}
    </div>
  );
}
