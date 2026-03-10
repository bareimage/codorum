import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../stores/app-store";
import { useToastStore } from "../stores/toast-store";
import { Icons } from "./Icons";

export function EjectBar() {
  const selectedIds = useAppStore((s) => s.selectedIds);
  const files = useAppStore((s) => s.files);
  const ejectSelected = useAppStore((s) => s.ejectSelected);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const addToast = useToastStore((s) => s.add);

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
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 20px",
        background: "var(--card)",
        border: "1px solid var(--brd)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "barIn 150ms cubic-bezier(.34,1.56,.64,1)",
      }}
    >
      <span style={{ color: "var(--warn)", display: "flex" }}>
        <Icons.sparkle />
      </span>
      <span style={{ fontSize: 13, color: "var(--tx)", fontWeight: 500 }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: "var(--tx3)" }}>selected</span>

      <div style={{ width: 1, height: 20, background: "var(--brd)", margin: "0 4px" }} />

      <button
        onClick={handleEject}
        style={{
          fontSize: 12,
          fontWeight: 600,
          padding: "5px 14px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          background: "color-mix(in srgb, var(--danger) 15%, transparent)",
          color: "var(--danger)",
          fontFamily: "inherit",
          transition: "all 100ms",
        }}
      >
        Eject
      </button>
      <button
        onClick={clearSelection}
        style={{
          fontSize: 12,
          padding: "5px 14px",
          borderRadius: 8,
          border: "1px solid var(--brd)",
          cursor: "pointer",
          background: "transparent",
          color: "var(--tx3)",
          fontFamily: "inherit",
          transition: "all 100ms",
        }}
      >
        Cancel
      </button>
    </div>
  );
}
