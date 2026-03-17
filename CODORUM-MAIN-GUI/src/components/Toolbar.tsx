import React from 'react';
import { useAppContext } from '../AppContext';
import { Search, X } from 'lucide-react';

export function Toolbar() {
  const { files, theme, cycleTheme, toggleCmd } = useAppContext();

  return (
    <div className="flex justify-center w-full z-50">
      <div className="h-[48px] flex items-center px-5 bg-[var(--bg2)] backdrop-blur-2xl border border-[var(--brd)] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.1)] shrink-0 transition-colors duration-300 select-none min-w-[400px]">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path d="M12 2L2 22h20L12 2z" stroke="var(--tx3)" strokeWidth="1.5" fill="none" />
            <path d="M7.5 15C7.5 15 9 12 12 12C15 12 16.5 15 16.5 15C16.5 15 15 18 12 18C9 18 7.5 15 7.5 15Z" stroke="var(--tx3)" strokeWidth="1.2" fill="none" />
            <circle className="eye-iris" cx="12" cy="15" r="1.5" fill="var(--ac)" />
            <rect className="eye-lid" x="7" y="11.5" width="10" height="7" rx="5" fill="var(--bg2)" />
          </svg>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--tx)]">
            Codorum
          </span>
        </div>
        <div className="w-px h-4 bg-[var(--brd)] mx-4"></div>
        <span className="text-[13px] font-medium text-[var(--tx3)]">
          {files.length} files
        </span>
        <div className="ml-auto flex gap-2 items-center pl-6">
          <button
            className="flex items-center gap-2 h-[32px] px-3 bg-[var(--input-bg)] border border-[var(--brd)] rounded-full text-[var(--tx2)] text-[13px] hover:bg-[var(--hover)] transition-colors"
            onClick={toggleCmd}
          >
            <Search size={14} />
            <span className="text-[11px] font-medium px-1.5 py-px rounded-md bg-[var(--tx3)]/20 text-[var(--tx2)]">
              ⌘K
            </span>
          </button>
          <button
            className="h-[32px] px-4 bg-transparent border border-[var(--brd)] rounded-full text-[13px] font-medium text-[var(--tx2)] hover:bg-[var(--hover)] hover:text-[var(--tx)] transition-colors capitalize"
            onClick={cycleTheme}
          >
            {theme}
          </button>
        </div>
      </div>
    </div>
  );
}
