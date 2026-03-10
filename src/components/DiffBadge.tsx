interface DiffBadgeProps {
  added?: number;
  removed?: number;
}

export function DiffBadge({ added = 0, removed = 0 }: DiffBadgeProps) {
  if (!added && !removed) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        gap: 3,
        fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
        fontSize: 10,
        fontWeight: 600,
        marginLeft: "auto",
        flexShrink: 0,
      }}
    >
      {added > 0 && (
        <span style={{ color: "var(--accent-3)" }}>+{added}</span>
      )}
      {removed > 0 && (
        <span style={{ color: "var(--accent-danger)" }}>{"\u2212"}{removed}</span>
      )}
    </span>
  );
}
