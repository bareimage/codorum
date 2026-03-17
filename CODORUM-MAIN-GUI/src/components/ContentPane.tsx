import React from 'react';
import { useAppContext } from '../AppContext';
import { ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { EXT_COLORS } from '../mockData';

function timeAgo(ts: number) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function detectMode(ext: string) {
  if (['md', 'markdown', 'mdx'].includes(ext)) return 'markdown';
  if (['ts', 'tsx', 'js', 'jsx', 'rs', 'py', 'go', 'css', 'scss', 'json', 'toml', 'yaml', 'yml'].includes(ext)) return 'code';
  return 'text';
}

export function ContentPane() {
  const { files, groups, searchQuery, openDrawers, activeFileId, activateFile, collapsedCards, toggleCollapse, isFullscreen, toggleFullscreen } = useAppContext();

  const q = searchQuery.toLowerCase();
  const visibleCount = files.filter((f) => !q || f.name.toLowerCase().includes(q)).length;

  return (
    <div 
      className="flex-1 overflow-y-auto bg-[var(--bg2)] backdrop-blur-2xl border border-[var(--brd)] rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 px-10 transition-colors duration-300"
    >
      <div className="flex items-baseline gap-3 mb-8">
        <span className="text-[28px] font-semibold tracking-tight text-[var(--tx)]">Files</span>
        <span className="text-[14px] text-[var(--tx3)] font-medium">{visibleCount} visible</span>
        <div className="ml-auto">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--input-bg)] border border-[var(--brd)] text-[var(--tx2)] hover:text-[var(--tx)] hover:bg-[var(--hover)] transition-colors shadow-sm"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {groups.map((group) => {
        const groupFiles = group.fileIds
          .map((id) => files.find((f) => f.id === id))
          .filter((f): f is NonNullable<typeof f> => f !== undefined)
          .filter((f) => !q || f.name.toLowerCase().includes(q));

        if (groupFiles.length === 0) return null;
        if (!openDrawers.has(group.id) && !q) return null;

        return (
          <div key={group.id} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[13px] font-semibold tracking-wide text-[var(--tx3)] shrink-0 uppercase">{group.name}</span>
              <span className="flex-1 h-px bg-[var(--brd)] opacity-50"></span>
            </div>

            {groupFiles.map((file) => {
              const isActive = activeFileId === file.id;
              const isCollapsed = collapsedCards.has(file.id);
              const mode = detectMode(file.ext);

              let subtitle = '';
              if (isCollapsed) {
                const subtitleMatch = file.content.match(/<h[12][^>]*>([^<]+)<\/h/);
                if (subtitleMatch) {
                  subtitle = subtitleMatch[1];
                }
              }

              return (
                <div
                  key={file.id}
                  className={`bg-[var(--card)] rounded-[20px] border border-[var(--brd)] mb-4 overflow-hidden transition-all duration-300 cursor-pointer group/card
                    shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:-translate-y-0.5
                    ${isActive ? 'ring-2 ring-[var(--ac)]/50 border-transparent' : ''}
                  `}
                  onClick={() => activateFile(file.id)}
                >
                  <div className={`flex items-center gap-3 px-6 py-4 select-none ${isCollapsed ? '' : 'border-b border-[var(--brd)] bg-[var(--hover)]/30'}`}>
                    <button
                      className="shrink-0 text-[var(--tx3)] bg-transparent border-none p-0 transition-transform duration-300 hover:text-[var(--tx)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(file.id);
                      }}
                    >
                      <ChevronRight size={16} className={isCollapsed ? '' : 'rotate-90'} />
                    </button>
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ background: EXT_COLORS[file.ext] || 'var(--tx3)' }}
                    ></span>
                    <span
                      className={`text-[16px] font-semibold tracking-tight flex-1 truncate ${
                        file.deleted ? 'text-[var(--deleted)] line-through' : 'text-[var(--tx)]'
                      }`}
                    >
                      {file.name}
                      <span className="text-[var(--tx3)] font-medium">.{file.ext}</span>
                    </span>
                    <div className="ml-auto flex items-center gap-4">
                      <span className="text-[13px] font-medium text-[var(--tx3)] shrink-0">{timeAgo(file.modified)}</span>
                      {(file.added || file.removed) && (
                        <span className="inline-flex gap-[4px] font-mono text-[12px] font-medium shrink-0">
                          {file.added ? <span className="text-[var(--ac3)]">+{file.added}</span> : null}
                          {file.removed ? <span className="text-[var(--danger)]">−{file.removed}</span> : null}
                        </span>
                      )}
                      {file.pinned && <span className="w-3 h-3 rounded-full bg-[var(--warn)] shadow-sm shrink-0"></span>}
                      {file.deleted && (
                        <span className="text-[12px] font-semibold shrink-0 px-3 py-1 rounded-full bg-[var(--danger)]/15 text-[var(--danger)]">
                          Deleted
                        </span>
                      )}
                    </div>
                  </div>

                  {isCollapsed && subtitle && (
                    <div className="px-6 pb-4 pl-[52px] font-serif italic text-[15px] text-[var(--tx3)] truncate">
                      {subtitle}
                    </div>
                  )}

                  {!isCollapsed && (
                    <>
                      <div
                        className={`px-8 py-6 pl-[52px] overflow-hidden animate-[slideUp_200ms_ease] ${
                          mode === 'markdown' ? 'markdown-body' : 'code-body'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                        dangerouslySetInnerHTML={{ __html: file.content }}
                      ></div>
                      <div className="h-4 flex items-center justify-center cursor-ns-resize opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 bg-[var(--hover)]/20">
                        <div className="w-12 h-1 rounded-full bg-[var(--brd)]"></div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {visibleCount === 0 && (
        <div className="text-center py-[120px] px-5 text-[var(--tx3)] text-[15px] font-medium opacity-50">
          {q ? 'No matches found' : 'Drop files or folders here'}
        </div>
      )}

      <div className="h-20"></div>
    </div>
  );
}
