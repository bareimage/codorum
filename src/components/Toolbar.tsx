import { useAppStore } from "../stores/app-store";
import { useCommandStore } from "../stores/command-store";
import { Icons } from "./Icons";
import { Kbd } from "./Kbd";

const THEMES = ["n01z", "paper", "phosphor", "ember"] as const;

export function Toolbar() {
  const { files, theme, setTheme } = useAppStore();
  const openCmd = useCommandStore((s) => s.toggle);

  const cycleTheme = () => {
    const idx = THEMES.indexOf(theme as (typeof THEMES)[number]);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  return (
    <div
      data-tauri-drag-region
      style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        padding: "0 16px 6px 16px",
        background: "var(--bg2)",
        borderBottom: "1px solid var(--brd)",
        flexShrink: 0,
        transition: "background 200ms, color 200ms",
      }}
    >
      {/* Left — traffic light spacer + brand */}
      <div style={{ width: 72 }} />
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6, flexShrink: 0 }}>
        <path d="M12 2L2 22h20L12 2z" stroke="var(--tx3)" strokeWidth="1.5" fill="none" />
        <path d="M7.5 15C7.5 15 9 12 12 12C15 12 16.5 15 16.5 15C16.5 15 15 18 12 18C9 18 7.5 15 7.5 15Z" stroke="var(--tx3)" strokeWidth="1.2" fill="none" />
        <circle cx="12" cy="15" r="1.5" fill="var(--ac)" className="codorum-eye-iris" />
        <rect className="codorum-eye-lid" x="7" y="11.5" width="10" height="7" rx="5" fill="var(--bg2)" />
      </svg>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "var(--tx3)",
          fontFamily: "monospace",
        }}
      >
        CODORUM
      </span>
      <span
        style={{
          fontSize: 12,
          color: "var(--tx3)",
          marginLeft: 12,
          opacity: 0.5,
        }}
      >
        {files.length} files
      </span>

      <div style={{ flex: 1 }} />

      {/* ⌘K commands button */}
      <button
        onClick={openCmd}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: 30,
          padding: "0 12px",
          background: "var(--hover)",
          border: "1px solid var(--brd)",
          borderRadius: 8,
          cursor: "pointer",
          color: "var(--tx3)",
          fontSize: 13,
          marginRight: 8,
          fontFamily: "inherit",
        }}
      >
        <Icons.sparkle />
        <Kbd>{"\u2318"}K</Kbd>
      </button>

      {/* Theme button */}
      <button
        onClick={cycleTheme}
        style={{
          height: 30,
          padding: "0 12px",
          background: "transparent",
          border: "1px solid var(--brd)",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 500,
          color: "var(--tx2)",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {theme}
      </button>
    </div>
  );
}
