import { Search, Maximize2, Minimize2 } from "lucide-react";
import { useAppStore } from "../stores/app-store";
import { useCommandStore } from "../stores/command-store";

const THEMES = ["n01z", "paper", "phosphor", "ember"] as const;

export function Toolbar() {
  const { files, theme, setTheme, isFullscreen, toggleFullscreen } = useAppStore();
  const openCmd = useCommandStore((s) => s.toggle);

  const cycleTheme = () => {
    const idx = THEMES.indexOf(theme as (typeof THEMES)[number]);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  return (
    <div className="toolbar-w" data-tauri-drag-region>
      <div className="toolbar" data-tauri-drag-region>
        <div className="brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 22h20L12 2z" stroke="var(--tx3)" strokeWidth="1.5" fill="none" />
            <path d="M7.5 15C7.5 15 9 12 12 12C15 12 16.5 15 16.5 15C16.5 15 15 18 12 18C9 18 7.5 15 7.5 15Z" stroke="var(--tx3)" strokeWidth="1.2" fill="none" />
            <circle cx="12" cy="15" r="1.5" fill="var(--ac)" className="eye-iris" />
            <rect className="eye-lid" x="7" y="11.5" width="10" height="7" rx="5" fill="var(--bg2)" />
          </svg>
          <span className="brand-name">Codorum</span>
        </div>
        <div className="sep" />
        <span className="file-count">{files.length} files</span>
        <div className="toolbar-r">
          <button className="btn-icon" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button className="btn-pill" onClick={openCmd}>
            <Search size={14} /> <span className="kbd">⌘K</span>
          </button>
          <button className="btn-ghost" onClick={cycleTheme}>{theme}</button>
        </div>
      </div>
    </div>
  );
}
