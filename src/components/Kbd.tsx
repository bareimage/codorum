export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontFamily: "monospace",
        color: "var(--tx3)",
        background: "var(--hover)",
        padding: "2px 6px",
        borderRadius: 4,
        border: "1px solid var(--brd)",
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}
