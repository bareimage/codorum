import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../AppContext';
import { Search } from 'lucide-react';
import { COMMANDS, THEMES } from '../mockData';

export function CommandPalette() {
  const { isCmdOpen, toggleCmd, cycleTheme, addToast, themeIndex } = useAppContext();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCmdOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCmdOpen]);

  if (!isCmdOpen) return null;

  const filteredCommands = COMMANDS.map((c) => {
    if (c.id === 'theme') {
      return { ...c, sub: THEMES[themeIndex] };
    }
    return c;
  }).filter((c) => c.type === 'sep' || c.label.toLowerCase().includes(query.toLowerCase()));

  const selectableItems = filteredCommands.filter((c) => c.type === 'cmd');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      toggleCmd();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, selectableItems.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = selectableItems[selectedIndex];
      if (sel) {
        executeCommand(sel.id!);
      }
    }
  };

  const executeCommand = (id: string) => {
    if (id === 'theme') cycleTheme();
    else if (id === 'add-folder') addToast('Add Folder', 'dialog would open', 'cyan');
    else if (id === 'add-file') addToast('Add Files', 'dialog would open', 'cyan');
    else if (id === 'create-tab') addToast('Untitled', 'tab created', 'cyan');
    else if (id.startsWith('new-')) addToast('New file', 'in ' + id.replace('new-', ''), 'cyan');
    toggleCmd();
  };

  let itemIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center pt-20 bg-black/18 backdrop-blur-[24px] saturate-[1.4] animate-[fadeIn_120ms_ease]"
      onClick={(e) => {
        if (e.target === e.currentTarget) toggleCmd();
      }}
    >
      <div className="w-[560px] rounded-xl overflow-hidden bg-[var(--cmd-bg)] shadow-[var(--cmd-shadow)] border border-[var(--brd)] animate-[cmdIn_120ms_cubic-bezier(.34,1.56,.64,1)]">
        <div className="flex items-center gap-2.5 p-3 px-4 border-b border-[var(--brd)]">
          <Search size={16} className="text-[var(--tx3)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 text-[15px] bg-transparent text-[var(--tx)] border-none outline-none placeholder:text-[var(--tx3)] placeholder:opacity-60"
            placeholder="Type a command..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="max-h-[380px] overflow-y-auto p-1 px-1.5">
          {filteredCommands.map((item, idx) => {
            if (item.type === 'sep') {
              return (
                <div key={idx} className="px-2.5 py-3 pb-1 text-[12px] font-semibold text-[var(--tx3)]">
                  {item.label}
                </div>
              );
            }

            itemIndex++;
            const isSelected = itemIndex === selectedIndex;

            return (
              <button
                key={idx}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors duration-50 border-none w-full text-left font-inherit ${
                  isSelected ? 'bg-[var(--hover)]' : 'bg-transparent hover:bg-[var(--hover)]'
                }`}
                onClick={() => executeCommand(item.id!)}
                onMouseEnter={() => setSelectedIndex(itemIndex)}
              >
                <span className="text-[var(--ac)] shrink-0 text-[14px]">{item.icon}</span>
                <span className="flex-1 text-[14px] text-[var(--tx)] font-medium">{item.label}</span>
                {item.sub && <span className="text-[12px] text-[var(--tx3)]">{item.sub}</span>}
                {item.kbd && (
                  <span className="text-[11px] font-mono px-1.5 py-px rounded bg-[var(--tx3)]/15 text-[var(--tx3)]">
                    {item.kbd}
                  </span>
                )}
              </button>
            );
          })}
          {selectableItems.length === 0 && (
            <div className="p-8 text-center text-[var(--tx3)] text-[14px]">No results found</div>
          )}
        </div>
        <div className="flex gap-4 px-4 py-2 border-t border-[var(--brd)]">
          <span className="flex items-center gap-1.5 text-[12px] text-[var(--tx3)]">
            <span className="text-[11px] font-mono px-1.5 py-px rounded bg-[var(--tx3)]/15 text-[var(--tx3)]">↑↓</span> Navigate
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-[var(--tx3)]">
            <span className="text-[11px] font-mono px-1.5 py-px rounded bg-[var(--tx3)]/15 text-[var(--tx3)]">⏎</span> Open
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-[var(--tx3)]">
            <span className="text-[11px] font-mono px-1.5 py-px rounded bg-[var(--tx3)]/15 text-[var(--tx3)]">esc</span> Close
          </span>
        </div>
      </div>
    </div>
  );
}
