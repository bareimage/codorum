import { useMemo, useEffect, useRef, useCallback } from "react";
import { useAppStore, getUngroupedFiles } from "../stores/app-store";
import { sortFiles } from "../utils/sortFiles";
import { FileCard } from "./FileCard";
import type { WatchedFile } from "../types/files";

export function ContentPane() {
  const {
    files,
    groups,
    drawerOpen,
    sortBy,
    search,
    activeFileId,
    openFile,
    cardCollapsed,
    toggleCardCollapse,
  } = useAppStore();

  const q = search.toLowerCase().trim();

  const sections = useMemo(() => {
    const result: { key: string; title: string; files: WatchedFile[] }[] = [];
    const filterByQuery = (list: WatchedFile[]) =>
      q ? list.filter((f) => f.name.toLowerCase().includes(q)) : list;

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
  }, [files, groups, drawerOpen, sortBy, q]);

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
      style={{
        flex: 1,
        overflowY: "auto",
        background: "var(--bg)",
        padding: "28px 36px",
        transition: "background 200ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 24 }}>
        <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.015em" }}>Files</span>
        <span style={{ fontSize: 12, color: "var(--tx3)" }}>{totalVisible} visible</span>
      </div>

      {sections.length === 0 && (
        <div style={{ textAlign: "center", padding: "120px 20px", color: "var(--tx3)" }}>
          <div style={{ fontSize: 13, opacity: 0.5 }}>
            {search ? "no matches" : "drop files or folders"}
          </div>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.key} style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx3)", flexShrink: 0 }}>
              {section.title}
            </span>
            <span style={{ flex: 1, height: 1, background: "var(--brd)", opacity: 0.5 }} />
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
    </div>
  );
}
