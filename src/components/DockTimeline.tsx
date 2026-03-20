import { useRef, useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../stores/app-store";
import type { WatchedFile, FileSnapshot } from "../types/files";
import { ExtDot } from "./ExtDot";

function snapshotType(snap: FileSnapshot): "add" | "del" | "mix" {
  if (snap.lines_added > 0 && snap.lines_removed === 0) return "add";
  if (snap.lines_removed > 0 && snap.lines_added === 0) return "del";
  return "mix";
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface DockTimelineProps {
  file: WatchedFile;
}

export function DockTimeline({ file }: DockTimelineProps) {
  const setActiveSnapshot = useAppStore((s) => s.setActiveSnapshot);
  const activeSnapshotTs =
    useAppStore((s) => s.activeSnapshots[file.id]) ?? null;
  const selectedIds = useAppStore((s) => s.selectedIds);

  const [history, setHistory] = useState<FileSnapshot[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const [playheadPct, setPlayheadPct] = useState(100);

  // Load snapshots from DB for active file
  useEffect(() => {
    invoke<FileSnapshot[]>("get_snapshots", { filePath: file.path }).then(setHistory);
  }, [file.path, file.modified]);

  const firstTs = history.length > 0 ? history[0].timestamp : 0;
  const lastTs = history.length > 0 ? history[history.length - 1].timestamp : 0;
  const timeSpan = Math.max(lastTs - firstTs, 1);

  const tsToPct = useCallback(
    (ts: number) => ((ts - firstTs) / timeSpan) * 100,
    [firstTs, timeSpan],
  );

  const nearestSnap = useCallback(
    (pct: number): FileSnapshot | null => {
      if (history.length === 0) return null;
      const targetTs = firstTs + (pct / 100) * timeSpan;
      let closest = history[0];
      let minDiff = Infinity;
      for (const snap of history) {
        const diff = Math.abs(snap.timestamp - targetTs);
        if (diff < minDiff) {
          minDiff = diff;
          closest = snap;
        }
      }
      return closest;
    },
    [history, firstTs, timeSpan],
  );

  // Reset on file switch
  const prevFileId = useRef(file.id);
  useEffect(() => {
    if (prevFileId.current !== file.id) {
      prevFileId.current = file.id;
      setPlayheadPct(100);
      setActiveSnapshot(file.id, null);
    }
  }, [file.id, setActiveSnapshot]);

  // Keep playhead synced when activeSnapshot changes externally
  useEffect(() => {
    if (activeSnapshotTs === null) {
      setPlayheadPct(100);
    } else {
      setPlayheadPct(tsToPct(activeSnapshotTs));
    }
  }, [activeSnapshotTs, tsToPct]);

  // Keyboard navigation
  useEffect(() => {
    if (history.length === 0) return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable ||
        !!(e.target as HTMLElement)?.closest?.(".cm-editor");
      if (isEditing) return;

      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        setActiveSnapshot(file.id, null);
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        let curIdx = history.length - 1;
        if (activeSnapshotTs !== null) {
          const found = history.findIndex(
            (s) => s.timestamp === activeSnapshotTs,
          );
          if (found !== -1) curIdx = found;
        }
        const nextIdx =
          e.key === "ArrowLeft"
            ? Math.max(0, curIdx - 1)
            : Math.min(history.length - 1, curIdx + 1);
        const snap = history[nextIdx];
        setActiveSnapshot(file.id, snap.timestamp);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history, activeSnapshotTs, file.id, setActiveSnapshot]);

  // Early return AFTER all hooks
  if (selectedIds.size > 0) return null;

  if (history.length === 0) {
    const extColor = ExtDot.getColor(file.extension);
    return (
      <div className="dock-w">
        <div className="dock-left">
          <div className="dock-title">
            <span className="dot" style={{ background: extColor }} />
            <span>
              {file.name}
              {file.extension && (
                <span style={{ color: "var(--tx3)", fontWeight: 500 }}>.{file.extension}</span>
              )}
            </span>
          </div>
          <span className="dock-meta" style={{ color: "var(--tx3)" }}>no history yet</span>
        </div>
        <div className="dock-track-container">
          <div className="dock-axis" />
        </div>
      </div>
    );
  }

  const handleNodeClick = (snap: FileSnapshot) => {
    const pct = tsToPct(snap.timestamp);
    setPlayheadPct(pct);
    setActiveSnapshot(file.id, snap.timestamp);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".dn")) return;
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pct = Math.max(
      0,
      Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
    );
    setPlayheadPct(pct);
    if (pct > 95) {
      setActiveSnapshot(file.id, null);
    } else {
      const snap = nearestSnap(pct);
      if (snap) setActiveSnapshot(file.id, snap.timestamp);
    }
  };

  const jumpToLive = () => {
    setPlayheadPct(100);
    setActiveSnapshot(file.id, null);
  };

  const extColor = ExtDot.getColor(file.extension);
  const tipText = activeSnapshotTs
    ? `${formatTime(activeSnapshotTs)} snapshot`
    : "";

  return (
    <div className="dock-w">
      <div className="dock-left">
        <div className="dock-title">
          <span className="dot" style={{ background: extColor }} />
          <span>
            {file.name}
            {file.extension && (
              <span style={{ color: "var(--tx3)", fontWeight: 500 }}>
                .{file.extension}
              </span>
            )}
          </span>
        </div>
        <span className="dock-meta">{history.length} changes</span>
      </div>

      <div
        className="dock-track-container"
        ref={trackRef}
        onClick={handleTrackClick}
      >
        <div className="dock-axis" />

        <div className="dock-nodes">
          {history.map((snap) => {
            const pct = tsToPct(snap.timestamp);
            const type = snapshotType(snap);
            const isSelected = activeSnapshotTs === snap.timestamp;
            return (
              <div
                key={snap.id}
                className={`dn${isSelected ? " active" : ""}`}
                style={{ left: `${pct}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(snap);
                }}
              >
                <div className={`dn-circle ${type}`} />
              </div>
            );
          })}
        </div>

        {activeSnapshotTs !== null && (
          <div
            className="playhead"
            style={{
              left: `${playheadPct}%`,
              transition: "left 0.15s linear",
            }}
          >
            <div className="playhead-tip visible">
              {tipText}
            </div>
          </div>
        )}
      </div>

      <div className="dock-right">
        <button
          className={`btn-live${activeSnapshotTs === null ? " active" : ""}`}
          onClick={jumpToLive}
        >
          <span className="live-dot" /> Live
        </button>
      </div>
    </div>
  );
}
