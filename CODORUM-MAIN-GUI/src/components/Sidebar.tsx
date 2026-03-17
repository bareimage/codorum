import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { Search, ChevronRight, X, SlidersHorizontal, Plus } from 'lucide-react';
import { EXT_COLORS } from '../mockData';

export function Sidebar() {
  const {
    files,
    groups,
    searchQuery,
    setSearchQuery,
    openDrawers,
    toggleDrawer,
    activeFileId,
    activateFile,
    selectedIds,
    toggleSelect,
    clearSelection,
    ejectGroup,
    addToast
  } = useAppContext();

  const [sortMode, setSortMode] = useState('name');
  const [searchMode, setSearchMode] = useState('filename');

  const handleFileClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      toggleSelect(id);
    } else {
      clearSelection();
      activateFile(id);
    }
  };

  return (
    <div 
      className="w-[280px] shrink-0 bg-[var(--bg2)] backdrop-blur-2xl flex flex-col border border-[var(--brd)] rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden transition-colors duration-300"
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <span className="text-[13px] font-semibold text-[var(--tx2)] tracking-tight">Explorer</span>
        <button
          className="w-[28px] h-[28px] rounded-full border-none bg-transparent text-[var(--tx2)] flex items-center justify-center transition-all duration-200 hover:bg-[var(--hover)] hover:text-[var(--tx)]"
          onClick={() => addToast('Untitled', 'tab created', 'cyan')}
          title="New File"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--input-bg)] border border-transparent rounded-full transition-colors focus-within:border-[var(--ac)]/50 focus-within:ring-2 focus-within:ring-[var(--ac)]/20">
          <Search size={14} className="text-[var(--tx3)] shrink-0 ml-1" />
          <input
            type="text"
            className="flex-1 text-[14px] bg-transparent text-[var(--tx)] border-none outline-none placeholder:text-[var(--tx3)] min-w-0"
            placeholder={searchMode === 'content' ? 'Search content...' : 'Search'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="flex items-center gap-1 shrink-0 mr-1">
            <button 
              className={`text-[10px] font-semibold px-2 py-1 rounded-full transition-colors ${searchMode === 'filename' ? 'bg-[var(--tx)] text-[var(--bg)]' : 'text-[var(--tx3)] hover:text-[var(--tx2)] hover:bg-[var(--hover)]'}`}
              onClick={() => setSearchMode('filename')}
              title="Search by Name"
            >
              Name
            </button>
            <button 
              className={`text-[10px] font-semibold px-2 py-1 rounded-full transition-colors ${searchMode === 'content' ? 'bg-[var(--tx)] text-[var(--bg)]' : 'text-[var(--tx3)] hover:text-[var(--tx2)] hover:bg-[var(--hover)]'}`}
              onClick={() => setSearchMode('content')}
              title="Search by Content"
            >
              Body
            </button>
            <div className="w-px h-3 bg-[var(--brd)] mx-1"></div>
            <button 
              className="text-[var(--tx3)] hover:text-[var(--tx2)] p-1 rounded-full hover:bg-[var(--hover)] transition-colors" 
              title="Advanced Search"
              onClick={() => addToast('Advanced Search', 'options would open', 'cyan')}
            >
              <SlidersHorizontal size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 px-5 pb-3 items-center">
        {['Name', 'Modified', 'Changes'].map((mode) => (
          <button
            key={mode}
            className={`text-[12px] px-3 py-1.5 rounded-full border-none bg-transparent transition-all duration-200 ${
              sortMode === mode.toLowerCase()
                ? 'font-medium bg-[var(--hover)] text-[var(--tx)]'
                : 'font-normal text-[var(--tx3)] hover:bg-[var(--hover)] hover:text-[var(--tx2)]'
            }`}
            onClick={() => setSortMode(mode.toLowerCase())}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="h-px bg-[var(--brd)] mx-5 my-1"></div>

      <div className="flex-1 overflow-y-auto pt-2 pb-4">
        {groups.map((group) => {
          const groupFiles = group.fileIds
            .map((id) => files.find((f) => f.id === id))
            .filter((f): f is NonNullable<typeof f> => f !== undefined)
            .filter((f) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()));

          if (searchQuery && groupFiles.length === 0) return null;

          const isOpen = openDrawers.has(group.id);
          const totalAdded = groupFiles.reduce((s, f) => s + (f.added || 0), 0);
          const totalRemoved = groupFiles.reduce((s, f) => s + (f.removed || 0), 0);

          return (
            <div key={group.id} className={`group/drawer ${isOpen ? 'open' : ''} mb-2`}>
              <button
                className="flex items-center gap-2 w-full px-5 py-2 bg-transparent border-none text-left hover:bg-[var(--hover)]/50 group/header transition-colors"
                onClick={() => toggleDrawer(group.id)}
              >
                <ChevronRight
                  size={14}
                  className={`text-[var(--tx3)] transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
                />
                <span className="text-[14px] font-semibold tracking-tight text-[var(--tx2)] transition-colors duration-200 group-hover/header:text-[var(--tx)] group-[.open]/drawer:text-[var(--tx)]">
                  {group.name}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  {(totalAdded > 0 || totalRemoved > 0) && (
                    <span className="inline-flex gap-[4px] font-mono text-[11px] font-medium shrink-0">
                      {totalAdded > 0 && <span className="text-[var(--ac3)]">+{totalAdded}</span>}
                      {totalRemoved > 0 && <span className="text-[var(--danger)]">−{totalRemoved}</span>}
                    </span>
                  )}
                  <span className="text-[12px] font-medium text-[var(--tx3)] min-w-[20px] text-center bg-[var(--input-bg)] px-2 py-0.5 rounded-full">
                    {groupFiles.length}
                  </span>
                  {group.ejectable && (
                    <button
                      className="w-[24px] h-[24px] rounded-full border-none bg-transparent text-[var(--tx3)] flex items-center justify-center opacity-0 transition-all duration-200 group-hover/drawer:opacity-100 hover:text-[var(--danger)] hover:bg-[var(--danger)]/15"
                      onClick={(e) => {
                        e.stopPropagation();
                        ejectGroup(group.id);
                      }}
                      title={`Eject ${group.name}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </span>
              </button>

              <div
                className={`overflow-hidden transition-[max-height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isOpen ? 'max-h-[900px]' : 'max-h-0'
                }`}
              >
                <div className="pt-1 pb-2 px-3">
                  {groupFiles.map((file) => {
                    const isActive = activeFileId === file.id;
                    const isSelected = selectedIds.has(file.id);

                    return (
                      <button
                        key={file.id}
                        className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl bg-transparent border-none text-left transition-all duration-150 group/file mb-0.5
                          ${isActive ? 'bg-[var(--ac)] text-white shadow-sm' : 'hover:bg-[var(--hover)]'}
                          ${isSelected && !isActive ? 'bg-[var(--ac)]/20' : ''}
                        `}
                        onClick={(e) => handleFileClick(file.id, e)}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ 
                            background: isActive ? 'white' : (EXT_COLORS[file.ext] || 'var(--tx3)'),
                            opacity: isActive ? 1 : 0.8
                          }}
                        ></span>
                        <span
                          className={`text-[14px] truncate flex-1 tracking-tight ${
                            isActive ? 'text-white font-medium' : 'text-[var(--tx2)] group-hover/file:text-[var(--tx)]'
                          } ${file.deleted ? 'opacity-50 line-through' : ''}`}
                        >
                          {file.name}
                          <span className={`font-normal ${isActive ? 'text-white/70' : 'text-[var(--tx3)]'}`}>
                            .{file.ext}
                          </span>
                        </span>
                        {(file.added || file.removed) && (
                          <span className="inline-flex gap-[4px] font-mono text-[11px] font-medium shrink-0">
                            {file.added ? <span className={isActive ? 'text-white' : 'text-[var(--ac3)]'}>+{file.added}</span> : null}
                            {file.removed ? <span className={isActive ? 'text-white/80' : 'text-[var(--danger)]'}>−{file.removed}</span> : null}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {files.length === 0 && (
          <div className="py-10 px-6 text-center">
            <div className="text-[var(--tx3)] opacity-40 text-[13px] font-medium">No files found</div>
          </div>
        )}
      </div>
    </div>
  );
}
