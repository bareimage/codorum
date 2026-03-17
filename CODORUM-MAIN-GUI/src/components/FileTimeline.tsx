import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue } from 'motion/react';
import type { FileItem } from '../types';

interface FileTimelineProps {
  file: FileItem;
}

export function FileTimeline({ file }: FileTimelineProps) {
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

  const x = useMotionValue(width > 0 ? width - 20 : 0);

  // Fake timeline blocks
  const blocks = React.useMemo(() => {
    const arr = [];
    let currentX = Math.random() * 50;
    while (currentX < 800) { // Assuming typical width
      const blockWidth = 15 + Math.random() * 40;
      const type = Math.random() > 0.7 ? 'delete' : (Math.random() > 0.4 ? 'add' : 'edit');
      arr.push({ x: currentX, w: blockWidth, type });
      currentX += blockWidth + 5 + Math.random() * 40;
    }
    return arr;
  }, []);

  return (
    <div className="px-8 pb-4">
      <div className="bg-[var(--bg)]/40 border border-[var(--brd)] rounded-[12px] p-4 flex flex-col gap-2 relative overflow-hidden group">
        
        {/* Header */}
        <div className="flex items-center justify-between px-2">
          <span className="text-[12px] font-bold text-[var(--tx2)] uppercase tracking-widest flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            File History
          </span>
          <div className="flex gap-4 font-mono text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-[#30D158]"><span className="w-2.5 h-2.5 rounded-sm bg-[#30D158]"></span> Added</span>
            <span className="flex items-center gap-1.5 text-[#0A84FF]"><span className="w-2.5 h-2.5 rounded-sm bg-[#0A84FF]"></span> Edited</span>
            <span className="flex items-center gap-1.5 text-[#FF453A]"><span className="w-2.5 h-2.5 rounded-sm bg-[#FF453A]"></span> Deleted</span>
          </div>
        </div>

        {/* Track Container */}
        <div className="relative h-14 bg-[var(--bg)] rounded-xl border-2 border-[var(--brd)] overflow-hidden shadow-inner mt-2" ref={containerRef}>
          
          {/* Tick marks */}
          <div className="absolute inset-0 flex items-center gap-[4%] px-2 opacity-30 pointer-events-none">
            {[...Array(25)].map((_, i) => (
              <div key={i} className="w-[2px] h-full bg-[var(--tx3)] rounded-full"></div>
            ))}
          </div>

          {/* Blocks */}
          <div className="absolute inset-y-0 left-0 right-0 flex items-center">
            {blocks.map((b, i) => {
              let colorClass = 'bg-[#0A84FF] border-[#0A84FF] shadow-[0_0_8px_rgba(10,132,255,0.4)]';
              if (b.type === 'delete') colorClass = 'bg-[#FF453A] border-[#FF453A] shadow-[0_0_8px_rgba(255,69,58,0.4)]';
              if (b.type === 'add') colorClass = 'bg-[#30D158] border-[#30D158] shadow-[0_0_8px_rgba(48,209,88,0.4)]';

              return (
                <div 
                  key={i} 
                  className={`absolute h-8 rounded-md border-2 opacity-90 hover:opacity-100 hover:scale-y-110 hover:z-10 transition-all cursor-pointer ${colorClass}`}
                  style={{ left: b.x, width: Math.max(16, b.w) }}
                ></div>
              );
            })}
          </div>

          {/* Scrubber / Playhead */}
          {width > 0 && (
            <motion.div
              className="absolute top-0 bottom-0 w-1 bg-[#FF9F0A] z-20 cursor-ew-resize flex flex-col items-center group shadow-[0_0_12px_rgba(255,159,10,0.8)]"
              style={{ x }}
              drag="x"
              dragConstraints={{ left: 0, right: width - 24 }}
              dragElastic={0}
              dragMomentum={false}
            >
              {/* Playhead Grabber */}
              <div className="w-6 h-full absolute flex items-center justify-center">
                <div className="w-6 h-10 rounded-md bg-[#FF9F0A] border-2 border-black/50 shadow-[0_4px_12px_rgba(255,159,10,0.8)] flex flex-col items-center justify-center gap-1 hover:scale-110 transition-transform">
                  <div className="w-[3px] h-2 bg-black/60 rounded-full"></div>
                  <div className="w-[3px] h-2 bg-black/60 rounded-full"></div>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
