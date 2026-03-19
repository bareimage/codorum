import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { animate } from "animejs";
import { useAppStore } from "../stores/app-store";
import { useToastStore } from "../stores/toast-store";

export function EjectBar() {
  const selectedIds = useAppStore((s) => s.selectedIds);
  const files = useAppStore((s) => s.files);
  const ejectSelected = useAppStore((s) => s.ejectSelected);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const addToast = useToastStore((s) => s.add);
  const barRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    if (selectedIds.size > 0 && barRef.current) {
      animate(barRef.current, {
        translateY: [6, 0],
        scale: [0.98, 1],
        opacity: [0, 1],
        duration: 200,
        ease: "outCubic",
      });
    }
  }, [selectedIds.size > 0]);

  if (selectedIds.size === 0) return null;

  const selectedFiles = files.filter((f) => selectedIds.has(f.id));
  const label =
    selectedFiles.length === 1
      ? selectedFiles[0].name + "." + selectedFiles[0].extension
      : `${selectedFiles.length} files`;

  const handleEject = () => {
    const count = selectedIds.size;
    const ids = [...selectedIds];
    ejectSelected();
    invoke("remove_files", { ids });
    addToast(`${count} file(s)`, "ejected", "amber");
  };

  return (
    <div ref={barRef} className="ej-bar" style={{ opacity: 0 }}>
      <span className="ej-label"><strong>{label}</strong> selected</span>
      <button className="btn-danger" onClick={handleEject}>Eject</button>
      <button className="btn-cancel" onClick={clearSelection}>Cancel</button>
    </div>
  );
}
