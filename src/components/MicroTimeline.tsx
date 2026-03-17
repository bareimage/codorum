import type { FileSnapshot } from "../types/files";

interface MicroTimelineProps {
  history: FileSnapshot[];
  active?: boolean;
}

export function MicroTimeline({ history, active }: MicroTimelineProps) {
  if (!history || history.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 6,
        marginTop: 4,
        paddingLeft: 22,
        position: "relative",
        width: "100%",
        gap: 3,
        opacity: active ? 1 : 0.6,
        transition: "opacity 0.2s",
      }}
      className="micro-tl"
    >
      {/* Subtle axis line */}
      <div
        style={{
          position: "absolute",
          left: 22,
          right: 10,
          top: "50%",
          height: 1,
          background: "var(--tx3)",
          opacity: active ? 0.3 : 0.1,
          zIndex: 0,
        }}
      />
      
      {history.slice(-10).map((snap, i) => {
        let color = "var(--ac)"; // default blue edit
        if (snap.lines_added > 0 && snap.lines_removed === 0) {
          color = "var(--ac3)"; // green
        } else if (snap.lines_removed > 0 && snap.lines_added === 0) {
          color = "var(--danger)"; // red
        } else if (snap.lines_added > 0 && snap.lines_removed > 0) {
          color = "var(--warn)"; // orange/yellow
        }

        return (
          <div
            key={snap.id || i}
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: color,
              zIndex: 2,
              position: "relative",
              boxShadow: active ? `0 0 0 1px var(--bg)` : "none",
            }}
            title={new Date(snap.timestamp * 1000).toLocaleTimeString()}
          />
        );
      })}
    </div>
  );
}
