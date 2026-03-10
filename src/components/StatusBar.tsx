import { useAppStore } from "../stores/app-store";

export function StatusBar() {
  const files = useAppStore((s) => s.files);

  return (
    <div
      style={{
        padding: "8px 12px",
        borderTop: "1px solid var(--brd)",
        fontSize: 10,
        color: "var(--tx3)",
        opacity: 0.4,
      }}
    >
      {files.length} files watched
    </div>
  );
}
