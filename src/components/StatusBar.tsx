import { useAppStore } from "../stores/app-store";

export function StatusBar() {
  const files = useAppStore((s) => s.files);

  return (
    <div className="status-bar">
      <span className="sb-files">{files.length} files watched</span>
    </div>
  );
}
