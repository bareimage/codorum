import { useRef, useEffect, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import { useAppStore } from "../stores/app-store";
import type { WatchedFile } from "../types/files";

interface DockTimelineProps {
  file: WatchedFile;
}

export function DockTimeline({ file }: DockTimelineProps) {
  const setActiveSnapshot = useAppStore((s) => s.setActiveSnapshot);
  const activeSnapshotTs = useAppStore((s) => s.activeSnapshots[file.id]) ?? null;
  const history = file.history || [];

  const containerRef = useRef<HTMLDivElement>(null);
  const playheadX = useMotionValue(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    
    // Default playhead to the end (live)
    if (activeSnapshotTs === null) {
      if (containerRef.current) {
        playheadX.set(containerRef.current.getBoundingClientRect().width);
      }
    }
    
    return () => observer.disconnect();
  }, [history.length, activeSnapshotTs, playheadX]);

  // When scrubbing visually, determine the nearest snapshot
  const handleDrag = () => {
    if (history.length === 0 || width === 0) return;
    
    const x = playheadX.get();
    
    // Live boundary -> if we are in the last 15px, we are "Live"
    if (x > width - 15) {
      if (activeSnapshotTs !== null) {
        setActiveSnapshot(file.id, null);
      }
      return;
    }

    // Otherwise, find the closest node
    const firstTs = history[0].timestamp;
    const lastTs = history[history.length - 1].timestamp;
    const span = Math.max(lastTs - firstTs, 1);
    
    // Reverse map X coordinate back to timestamp
    const scrubbedTs = firstTs + (x / width) * span;
    
    // Find closest snap by time
    let closest = history[0];
    let minDiff = Infinity;
    for (const snap of history) {
      const diff = Math.abs(snap.timestamp - scrubbedTs);
      if (diff < minDiff) {
        minDiff = diff;
        closest = snap;
      }
    }
    
    if (activeSnapshotTs !== closest.timestamp) {
      setActiveSnapshot(file.id, closest.timestamp);
    }
  };

  const jumpToLive = () => {
    playheadX.set(width);
    setActiveSnapshot(file.id, null);
  };

  if (history.length === 0) return null;

  const firstTs = history[0].timestamp;
  const lastTs = history[history.length - 1].timestamp;
  const timeSpan = Math.max(lastTs - firstTs, 1);

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(600px, 90vw)",
        height: 60,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        zIndex: 50,
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          height: 30,
        }}
      >
        {/* Track Line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 2,
            background: "var(--border)",
            transform: "translateY(-50%)",
            borderRadius: 1,
          }}
        />

        {/* Nodes */}
        {history.map((snap) => {
          const ratio = (snap.timestamp - firstTs) / timeSpan;
          const isSelected = activeSnapshotTs === snap.timestamp;
          
          let color = "var(--ac)";
          if (snap.lines_added > 0 && snap.lines_removed === 0) color = "var(--ac3)";
          if (snap.lines_removed > 0 && snap.lines_added === 0) color = "var(--danger)";
          if (snap.lines_added > 0 && snap.lines_removed > 0) color = "var(--warn)";

          return (
            <motion.div
              key={snap.id}
              initial={{ scale: 0 }}
              animate={{ scale: isSelected ? 1.5 : 1 }}
              style={{
                position: "absolute",
                left: `${ratio * 100}%`,
                top: "50%",
                width: 10,
                height: 10,
                marginTop: -5,
                marginLeft: -5,
                borderRadius: "50%",
                background: color,
                boxShadow: isSelected ? `0 0 0 2px var(--bg), 0 0 0 4px ${color}` : "0 0 0 2px var(--card)",
                cursor: "pointer",
                zIndex: isSelected ? 10 : 5,
              }}
              onClick={() => {
                playheadX.set(ratio * width);
                setActiveSnapshot(file.id, snap.timestamp);
              }}
              whileHover={{ scale: 1.3 }}
            />
          );
        })}

        {/* Live Indicator at the very end */}
        <div
          style={{
            position: "absolute",
            left: "100%",
            top: "50%",
            transform: "translateY(-50%) translateX(12px)",
            fontSize: 10,
            fontWeight: 800,
            color: activeSnapshotTs === null ? "var(--ac)" : "var(--tx3)",
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
          onClick={jumpToLive}
        >
          LIVE
        </div>

        {/* Draggable Playhead */}
        <motion.div
          drag="x"
          dragConstraints={containerRef}
          dragElastic={0}
          dragMomentum={false}
          onDrag={handleDrag}
          style={{
            x: playheadX,
            position: "absolute",
            top: -10,
            bottom: -10,
            width: 4,
            marginLeft: -2,
            background: "var(--ac)",
            borderRadius: 2,
            cursor: "grab",
            zIndex: 20,
            boxShadow: "0 0 10px var(--ac)",
          }}
          whileDrag={{ cursor: "grabbing", scaleY: 1.2 }}
        >
          {/* Playhead Handle */}
          <div
            style={{
              position: "absolute",
              top: -8,
              left: "50%",
              transform: "translateX(-50%)",
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: "var(--ac)",
            }}
          />
        </motion.div>
      </div>

      {/* Scrub Banner Info */}
      {activeSnapshotTs !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "absolute",
            top: -40,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ac)",
            color: "var(--bg)",
            padding: "4px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ opacity: 0.8 }}>Viewing snapshot:</span>
          {new Date(activeSnapshotTs * 1000).toLocaleTimeString()}
        </motion.div>
      )}
    </motion.div>
  );
}
