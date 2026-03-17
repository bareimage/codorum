import type { FileSnapshot } from "../types/files";

function snapshotType(snap: FileSnapshot): "add" | "del" | "mix" {
  if (snap.lines_added > 0 && snap.lines_removed === 0) return "add";
  if (snap.lines_removed > 0 && snap.lines_added === 0) return "del";
  return "mix";
}

interface MicroTimelineProps {
  history: FileSnapshot[];
  size?: "small" | "medium";
}

export function MicroTimeline({ history, size = "small" }: MicroTimelineProps) {
  if (!history || history.length === 0) return null;

  const isMedium = size === "medium";
  const nodes = history.slice(-10);

  return (
    <div
      className="micro-tl"
      style={isMedium ? { height: 12, gap: 8 } : undefined}
    >
      <div className="micro-axis" />
      {nodes.map((snap, i) => (
        <div
          key={snap.id || i}
          className={`micro-node ${snapshotType(snap)}`}
          style={isMedium ? { width: 8, height: 8 } : undefined}
          title={new Date(snap.timestamp * 1000).toLocaleTimeString()}
        />
      ))}
    </div>
  );
}
