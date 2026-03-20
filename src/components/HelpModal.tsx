import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { animate } from "animejs";

const SHORTCUTS = [
  { keys: "⌘ S", action: "Save active file" },
  { keys: "⌘ K", action: "Command palette" },
  { keys: "Right-click", action: "Command palette" },
  { keys: "⇧ ⌘ ↑ / ↓", action: "Switch between files" },
  { keys: "⌘ A", action: "Select all files" },
  { keys: "Delete", action: "Eject selected file" },
  { keys: "Escape", action: "Clear selection" },
  { keys: "← / →", action: "Scrub history snapshots" },
  { keys: "L", action: "Return to live view" },
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (panelRef.current) {
      animate(panelRef.current, {
        scale: [0.9, 1], rotate: [2, 0], opacity: [0, 1],
        duration: 350, ease: "outCubic",
      });
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="help-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} className="help-panel" style={{ opacity: 0 }}>
        <div className="help-head">
          <span className="help-title">Codorum</span>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <p className="help-desc">
          A calm, focused micro-editor and file watcher for people who need clarity over clutter.
          Built for ADHD, sensory sensitivity, and anyone overwhelmed by noisy IDEs.
          Drop files in, watch changes unfold, edit in peace.
        </p>

        <div className="help-section">How it works</div>
        <ul className="help-list">
          <li>Drag &amp; drop files or folders to start watching</li>
          <li>Every save is captured as a snapshot with visual diffs</li>
          <li>Scrub through history to see how files evolved</li>
          <li>Organize with tabs, pin important files, search by name or content</li>
        </ul>

        <div className="help-section">Keyboard shortcuts</div>
        <div className="help-keys">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="help-row">
              <kbd className="help-kbd">{s.keys}</kbd>
              <span>{s.action}</span>
            </div>
          ))}
        </div>

        <div className="help-footer">
          4 themes available — cycle with the theme button in the toolbar
        </div>
      </div>
    </div>
  );
}
