import { useMemo, useEffect, useRef, useCallback } from "react";
import { useAppStore, getUngroupedFiles } from "../stores/app-store";
import { sortFiles } from "../utils/sortFiles";
import { FileCard } from "./FileCard";
import { DockTimeline } from "./DockTimeline";
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

  const activeFile = useMemo(() => files.find((f) => f.id === activeFileId), [files, activeFileId]);

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
  const programmaticScroll = useRef(false);

  const allFileIds = useMemo(
    () => sections.flatMap((s) => s.files.map((f) => f.id)),
    [sections],
  );

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || allFileIds.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (programmaticScroll.current) return;
        let best: { id: string; top: number } | null = null;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const top = entry.boundingClientRect.top;
          if (!best || (top >= 0 && top < best.top)) {
            best = { id: entry.target.id, top };
          }
        }
        if (best && best.id !== useAppStore.getState().activeFileId) {
          openFile(best.id);
        }
      },
      { root: container, rootMargin: "-10% 0px -70% 0px", threshold: 0 },
    );

    for (const id of allFileIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [allFileIds, openFile]);

  const handleActivate = useCallback(
    (id: string) => {
      programmaticScroll.current = true;
      openFile(id);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        const container = scrollRef.current;
        if (container) {
          const onScrollEnd = () => {
            programmaticScroll.current = false;
            container.removeEventListener("scrollend", onScrollEnd);
          };
          container.addEventListener("scrollend", onScrollEnd, { once: true });
          // Fallback for browsers without scrollend
          setTimeout(() => {
            programmaticScroll.current = false;
            container.removeEventListener("scrollend", onScrollEnd);
          }, 800);
        } else {
          programmaticScroll.current = false;
        }
      }, 10);
    },
    [openFile],
  );

  return (
    <div
      ref={scrollRef}
      className={`content ${isFullscreen ? "fullscreen" : ""}`}
    >
      <div className="c-head">
        <h1>Files</h1>
        <span className="sub">{totalVisible} visible</span>
      </div>

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

      <div style={{ height: 80 }} />
      
      {/* Global Dock Scrubber for Active File */}
      {activeFile && activeFile.history && activeFile.history.length > 0 && (
        <DockTimeline file={activeFile} />
      )}
    </div>
  );
}
