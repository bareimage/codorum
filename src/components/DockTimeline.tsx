import { useRef, useEffect, useState, useCallback } from "react";
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

  const history = file.history || [];
  const trackRef = useRef<HTMLDivElement>(null);
  const [playheadPct, setPlayheadPct] = useState(98);
  const [isDragging, setIsDragging] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const prevFileId = useRef(file.id);

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

  // Bounce animation on file switch
  useEffect(() => {
    if (prevFileId.current !== file.id) {
      prevFileId.current = file.id;
      setPlayheadPct(98);
      setActiveSnapshot(file.id, null);
      setBouncing(true);
      const t = setTimeout(() => setBouncing(false), 400);
      return () => clearTimeout(t);
    }
  }, [file.id, setActiveSnapshot]);

  // Keep playhead synced when activeSnapshot changes externally
  useEffect(() => {
    if (activeSnapshotTs === null) {
      setPlayheadPct(98);
    } else {
      setPlayheadPct(tsToPct(activeSnapshotTs));
    }
  }, [activeSnapshotTs, tsToPct]);

  // Playhead drag handlers
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
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

    const onUp = () => setIsDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, file.id, setActiveSnapshot, nearestSnap]);

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
  if (selectedIds.size > 0 || history.length === 0) return null;

  const handleNodeClick = (snap: FileSnapshot) => {
    const pct = tsToPct(snap.timestamp);
    setPlayheadPct(pct);
    setActiveSnapshot(file.id, snap.timestamp);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".dn, .playhead-handle")) return;
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
    setPlayheadPct(98);
    setActiveSnapshot(file.id, null);
  };

  const bannerText = activeSnapshotTs
    ? `Viewing ${formatTime(activeSnapshotTs)} snapshot`
    : "";
  const extColor = ExtDot.getColor(file.extension);

  return (
    <div
      className="dock-w"
      style={bouncing ? { transform: "translateY(10px)" } : undefined}
    >
      <div className={`scrub-banner${activeSnapshotTs ? " visible" : ""}`}>
        {bannerText}
      </div>

      <div className="dock-head">
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
        <span className="dock-meta">
          {history.length} changes
          {activeSnapshotTs !== null && (
            <span
              style={{ marginLeft: 8, cursor: "pointer", color: "var(--ac)" }}
              onClick={jumpToLive}
            >
              ↩ Return to Live
            </span>
          )}
        </span>
      </div>

      <div
        className="dock-track-w"
        ref={trackRef}
        onClick={handleTrackClick}
      >
        <div className="dock-axis" />

        {/* Live indicator at track end */}
        <div
          className={`dock-live${activeSnapshotTs !== null ? " inactive" : ""}`}
          onClick={jumpToLive}
        >
          <span className="dock-live-dot" />
          <span className="dock-live-text">Live</span>
        </div>

        <div className="dock-nodes">
          {history.map((snap) => {
            const pct = tsToPct(snap.timestamp);
            const type = snapshotType(snap);
            const isSelected = activeSnapshotTs === snap.timestamp;
            return (
              <div
                key={snap.id}
                className="dn"
                style={{ left: `${pct}%` }}
                onClick={() => handleNodeClick(snap)}
              >
                <div
                  className={`dn-circle ${type}`}
                  style={
                    isSelected
                      ? {
                          transform: "scale(1.3)",
                          boxShadow: `0 0 0 2px var(--bg), 0 0 0 4px var(--ac)`,
                        }
                      : undefined
                  }
                >
                  {type === "add" && (
                    <span
                      style={{
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 900,
                        lineHeight: 1,
                        fontFamily: "monospace",
                        marginTop: -1,
                      }}
                    >
                      +
                    </span>
                  )}
                </div>
                <div className="dn-time">{formatTime(snap.timestamp)}</div>
              </div>
            );
          })}
        </div>

        <div
          className="playhead"
          style={{
            left: `${playheadPct}%`,
            transition: isDragging ? "none" : "left 0.1s linear",
          }}
        >
          <div
            className="playhead-handle"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
          />
        </div>
      </div>
    </div>
  );
}
