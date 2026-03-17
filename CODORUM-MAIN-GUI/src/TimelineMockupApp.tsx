import React, { useState } from "react";
import { GlobalTimeline } from "./components/GlobalTimeline";
import { FileTimeline } from "./components/FileTimeline";
import { EXT_COLORS } from "./mockData"; // Re-using colors

const FAKE_FILES = [
  { id: "1", name: "watcher", ext: "rs", added: 24, removed: 12 },
  { id: "2", name: "Toolbar", ext: "tsx", added: 8, removed: 0 },
  { id: "3", name: "App", ext: "tsx", added: 4, removed: 4 },
];

export function TimelineMockupApp() {
  const [showGlobal, setShowGlobal] = useState(true);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg)] text-[var(--tx)] font-sans relative overflow-hidden">
      {/* Background gradients from the theme */}
      <div className="absolute inset-0 z-0 bg-solid pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-grad pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full bg-[var(--bg)]/10">
        <header className="flex items-center justify-between px-8 py-4 border-b-2 border-[var(--brd)] bg-[var(--bg)]/90 backdrop-blur-3xl shadow-md z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black tracking-tight text-[var(--tx)]">Version History</h1>
            <span className="px-3 py-1 rounded-full bg-[var(--ac)]/20 text-[var(--ac)] text-[12px] font-bold tracking-wider uppercase">Beta Mockup</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowGlobal(!showGlobal)}
              className="px-6 py-2 text-[13px] font-bold bg-[var(--input-bg)] border-2 border-[var(--brd)] rounded-xl hover:bg-[var(--hover)] hover:scale-105 active:scale-95 transition-all text-[var(--tx)]"
            >
              {showGlobal ? "Hide Global Timeline" : "Show Global Timeline"}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 flex justify-center pb-64">
          <div className="w-full max-w-5xl flex flex-col gap-8">
            <div className="bg-[var(--warn)]/10 border-l-4 border-[var(--warn)] p-4 rounded-r-lg mb-4 flex items-start gap-4">
              <span className="text-[var(--warn)] mt-0.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </span>
              <p className="text-[14px] text-[var(--tx2)] font-medium leading-relaxed">
                <strong className="text-[var(--tx)]">ADHD-Friendly Redesign:</strong> The timelines below have been updated with massive playheads, high-contrast bright colors (Blue=Edit, Green=Add, Red=Delete), and unambiguous visual hierarchy. Drag the orange grabber to test.
              </p>
            </div>

            {FAKE_FILES.map((f) => (
              <div key={f.id} className="bg-[var(--bg2)] rounded-2xl border-2 border-[var(--brd)] shadow-xl overflow-hidden flex flex-col hover:border-[var(--ac)]/50 transition-colors">
                <div className="flex items-center gap-4 px-6 py-4 border-b-2 border-[var(--brd)]/50 bg-[var(--bg)]/80">
                  <span className="w-4 h-4 rounded-md shadow-sm" style={{ background: EXT_COLORS[f.ext as keyof typeof EXT_COLORS] || 'gray' }} />
                  <span className="font-bold text-[18px]">{f.name}.<span className="text-[var(--tx3)] font-medium">{f.ext}</span></span>
                  
                  <div className="ml-auto flex items-center gap-3 font-mono text-[13px] font-bold bg-[var(--bg)] px-3 py-1.5 rounded-lg border border-[var(--brd)]">
                    {f.added > 0 && <span className="text-[#30D158]">+{f.added} additions</span>}
                    {f.removed > 0 && <span className="text-[#FF453A] border-l border-[var(--brd)] pl-3">-{f.removed} deletions</span>}
                  </div>
                </div>

                <div className="p-8 text-[var(--tx2)] font-mono text-[14px] leading-relaxed border-b border-[var(--brd)]/50 bg-[var(--bg)]/30 min-h-[160px]">
                  <span className="text-[var(--ac2)]">{"// Real-time file content goes here..."}</span>
                  <br/><br/>
                  <span className="opacity-60">{"// Try scrubbing the timeline below to see how obvious"}<br/>{"// the hitboxes and colors are now."}</span>
                </div>

                {/* Provide the file mock to FileTimeline */}
                <FileTimeline file={f as any} />
              </div>
            ))}
          </div>
        </main>

        {/* Global Timeline */}
        {showGlobal && <GlobalTimeline />}
      </div>
    </div>
  );
}
