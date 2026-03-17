import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue } from 'motion/react';

const FAKE_FILES = [
  { id: "1", name: "watcher", ext: "rs" },
  { id: "2", name: "Toolbar", ext: "tsx" },
  { id: "3", name: "App", ext: "tsx" },
];

export function GlobalTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.offsetWidth);
    }
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const x = useMotionValue(width * 0.8);
  
  // Create some fake snapshot blocks for each file to simulate history
  const tracks = FAKE_FILES.map(f => {
    const blocks = [];
    let currentX = Math.random() * 50;
    while (currentX < width - 100) {
      const blockWidth = 20 + Math.random() * 60;
      const type = Math.random() > 0.7 ? 'delete' : (Math.random() > 0.4 ? 'add' : 'edit');
      blocks.push({ x: currentX, w: blockWidth, type });
      currentX += blockWidth + 10 + Math.random() * 100;
    }
    return { file: f, blocks };
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 h-48 bg-[var(--bg2)] backdrop-blur-3xl border-t border-[var(--brd)] z-50 flex shadow-[0_-20px_40px_rgba(0,0,0,0.3)] animate-[slideUp_0.3s_ease-out]">
      {/* Track Labels (Left Panel) */}
      <div className="w-72 bg-[var(--bg)]/80 border-r-2 border-[var(--brd)] flex flex-col pt-8 overflow-hidden z-10 shrink-0 shadow-[8px_0_16px_rgba(0,0,0,0.4)]">
        <div className="h-8 flex items-center px-6 text-[11px] font-bold text-[var(--tx2)] uppercase tracking-widest absolute top-0 bg-[var(--bg2)]/50 w-full backdrop-blur-md">
          Watched Files
        </div>
        <div className="mt-2">
          {tracks.map((track, i) => (
            <div key={i} className="h-10 flex items-center px-6 font-mono text-[13px] font-semibold text-[var(--tx)] border-b border-[var(--brd)]/40 hover:bg-[var(--hover)] transition-colors cursor-pointer truncate">
              {track.file.name}.<span className="text-[var(--tx3)] font-normal">{track.file.ext}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline Area */}
      <div className="flex-1 relative overflow-hidden bg-[var(--bg)]/30" ref={containerRef}>
        {/* Time ruler */}
        <div className="absolute top-0 left-0 right-0 h-10 border-b-2 border-[var(--brd)] bg-[var(--bg2)] flex items-end px-2 pb-1 gap-16 overflow-hidden bg-opacity-90 z-0">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 opacity-70">
              <span className="text-[10px] font-mono font-bold text-[var(--tx2)]">14:{(i * 5).toString().padStart(2, '0')}</span>
              <div className="w-[2px] h-3 bg-[var(--tx3)] rounded-full"></div>
            </div>
          ))}
        </div>

        {/* Tracks area */}
        <div className="pt-10 z-0 relative">
          {tracks.map((track, i) => (
            <div key={i} className="h-10 border-b border-[var(--brd)]/20 relative flex items-center group hover:bg-[var(--hover)]/50 transition-colors">
              {track.blocks.map((b, j) => {
                let colorClass = 'bg-[#0A84FF] border-[#0A84FF] shadow-[0_0_8px_rgba(10,132,255,0.4)]'; // Bright Blue for edits
                if (b.type === 'delete') colorClass = 'bg-[#FF453A] border-[#FF453A] shadow-[0_0_8px_rgba(255,69,58,0.4)]'; // Bright Red
                if (b.type === 'add') colorClass = 'bg-[#30D158] border-[#30D158] shadow-[0_0_8px_rgba(48,209,88,0.4)]'; // Bright Green

                return (
                  <div 
                    key={j} 
                    className={`absolute h-6 rounded-md border-2 opacity-90 hover:opacity-100 hover:scale-y-110 hover:z-10 hover:brightness-125 transition-all cursor-pointer ${colorClass}`}
                    style={{ left: b.x, width: Math.max(12, b.w) }} // Ensure blocks are never hopelessly tiny
                  ></div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Scrubber / Playhead */}
        {width > 0 && (
          <motion.div
            className="absolute top-0 bottom-0 w-1 bg-[#FF9F0A] z-20 cursor-ew-resize group shadow-[0_0_16px_rgba(255,159,10,0.8)]"
            style={{ x }}
            drag="x"
            dragConstraints={{ left: 0, right: width - 20 }}
            dragElastic={0}
            dragMomentum={false}
          >
            {/* BIG Playhead Handle for ADHD focus */}
            <div className="absolute -top-1 -translate-x-1/2 w-8 h-8 rounded-md bg-[#FF9F0A] flex flex-col items-center justify-center gap-[3px] shadow-[0_4px_16px_rgba(255,159,10,0.8)] border-2 border-black/50 hover:scale-110 transition-transform">
              <div className="w-1.5 h-1.5 rounded-full bg-black/70"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-black/70"></div>
            </div>
            {/* Readout */}
            <div className="absolute top-10 -translate-x-1/2 px-3 py-1.5 rounded-md text-[12px] font-mono font-bold bg-[#FF9F0A]/90 text-black shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap backdrop-blur-md border border-black/20">
              Scrubbing...
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
