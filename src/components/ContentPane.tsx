import { useMemo, useRef, useCallback } from "react";
import { useAppStore, getUngroupedFiles } from "../stores/app-store";
import { sortFiles } from "../utils/sortFiles";
import { FileCard } from "./FileCard";
import { DockTimeline } from "./DockTimeline";
import { useStaggerIn } from "../hooks/useAnime";
import type { WatchedFile } from "../types/files";

export function ContentPane() {
  const {
    files,
    groups,
    drawerOpen,
    sortBy,
    search,
    searchMode,
    activeFileId,
    openFile,
    cardCollapsed,
    toggleCardCollapse,
    isFullscreen,
  } = useAppStore();

  const q = search.toLowerCase().trim();

  const sections = useMemo(() => {
    const result: { key: string; title: string; files: WatchedFile[] }[] = [];
    const filterByQuery = (list: WatchedFile[]) => {
      if (!q) return list;
      if (searchMode === "content") {
        return list.filter((f) => f.content.toLowerCase().includes(q));
      }
      return list.filter((f) => f.name.toLowerCase().includes(q));
    };

    if (q || drawerOpen["pinned"]) {
      const pinned = filterByQuery(files.filter((f) => f.pinned));
      if (pinned.length > 0) {
        result.push({ key: "pinned", title: "Pinned", files: sortFiles(pinned, sortBy) });
      }
    }

    for (const group of groups) {
      if (q || drawerOpen[group.id]) {
        const groupFiles = filterByQuery(
          group.fileIds
            .map((id) => files.find((f) => f.id === id))
            .filter(Boolean) as WatchedFile[],
        );
        if (groupFiles.length > 0) {
          result.push({
            key: group.id,
            title: group.name,
            files: sortFiles(groupFiles, sortBy),
          });
        }
      }
    }

    if (q || drawerOpen["loose"]) {
      const loose = filterByQuery(getUngroupedFiles(files, groups).filter((f) => !f.pinned));
      if (loose.length > 0) {
        result.push({ key: "loose", title: "Loose", files: sortFiles(loose, sortBy) });
      }
    }

    return result;
  }, [files, groups, drawerOpen, sortBy, q, searchMode]);

  const totalVisible = sections.reduce((sum, s) => sum + s.files.length, 0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Stagger file cards on load
  useStaggerIn(
    scrollRef,
    ".fc",
    { translateY: [6, 0], opacity: [0, 1], duration: 200, delay: 40, ease: "outCubic" },
    [sections.length],
  );

  // File activation is click-only — no auto-switch on scroll

  const handleActivate = useCallback(
    (id: string) => {
      openFile(id);
    },
    [openFile],
  );

  const activeFile = activeFileId ? files.find((f) => f.id === activeFileId) : undefined;
  const showDock = !!activeFile;

  return (
    <div className={`content ${isFullscreen ? "fullscreen" : ""}`}>
      <div className="c-head">
        <h1>Files</h1>
        <span className="sub">{totalVisible} visible</span>
      </div>

      <div ref={scrollRef} className="content-scroll">
        {sections.length === 0 && (
          <div className="empty">
            <div className="empty-text">
              {search ? "no matches" : "drop files or folders"}
            </div>
          </div>
        )}

        {sections.map((section) => (
          <div key={section.key} className="sec">
            <div className="sec-h">
              <span className="lbl">{section.title}</span>
              <span className="ln" />
            </div>

            {section.files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                isActive={activeFileId === file.id}
                isCollapsed={cardCollapsed[file.id] ?? false}
                onToggleCollapse={() => toggleCardCollapse(file.id)}
                onActivate={() => handleActivate(file.id)}
              />
            ))}
          </div>
        ))}

      </div>

      {showDock && activeFile && <DockTimeline file={activeFile} />}
    </div>
  );
}
