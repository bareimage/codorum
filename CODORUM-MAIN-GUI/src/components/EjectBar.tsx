import React from 'react';
import { useAppContext } from '../AppContext';

export function EjectBar() {
  const { selectedIds, files, ejectSelected, clearSelection } = useAppContext();

  if (selectedIds.size === 0) return null;

  const label =
    selectedIds.size === 1
      ? files.find((f) => f.id === Array.from(selectedIds)[0])?.name || '1 file'
      : `${selectedIds.size} files`;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-3 px-5 py-2.5 bg-[var(--card)] border border-[var(--brd)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md animate-[barIn_150ms_cubic-bezier(.34,1.56,.64,1)]">
      <span className="text-[var(--warn)]">✦</span>
      <span className="text-[13px] text-[var(--tx)] font-medium">{label}</span>
      <span className="text-[12px] text-[var(--tx3)]">selected</span>
      <div className="w-px h-5 bg-[var(--brd)] mx-1"></div>
      <button
        className="text-[12px] font-semibold px-3.5 py-1.5 rounded-lg border-none bg-[var(--danger)]/15 text-[var(--danger)] transition-colors duration-100 hover:bg-[var(--danger)]/25"
        onClick={ejectSelected}
      >
        Eject
      </button>
      <button
        className="text-[12px] px-3.5 py-1.5 rounded-lg border border-[var(--brd)] bg-transparent text-[var(--tx3)] transition-colors duration-100 hover:border-[var(--tx3)] hover:text-[var(--tx2)]"
        onClick={clearSelection}
      >
        Cancel
      </button>
    </div>
  );
}
