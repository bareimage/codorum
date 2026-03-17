import React, { useEffect } from 'react';
import { AppProvider, useAppContext } from './AppContext';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { ContentPane } from './components/ContentPane';
import { CommandPalette } from './components/CommandPalette';
import { EjectBar } from './components/EjectBar';
import { Toasts } from './components/Toasts';
import { DropZone } from './components/DropZone';

function AppContent() {
  const { toggleCmd, selectAll, ejectSelected, activeFileId, selectedIds, addToast, clearSelection, files, isCmdOpen, isFullscreen } = useAppContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const tag = (e.target as HTMLElement).tagName;
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;

      // ⌘K — Command Palette
      if (mod && e.key === 'k') {
        e.preventDefault();
        toggleCmd();
      }

      // ⌘S — Save
      if (mod && e.key === 's') {
        e.preventDefault();
        const file = files.find((f) => f.id === activeFileId);
        if (file) addToast('Saved', file.name + '.' + file.ext, 'cyan');
      }

      // ⌘A — Select all (when not editing)
      if (mod && e.key === 'a' && !isEditing) {
        e.preventDefault();
        selectAll();
      }

      // Delete/Backspace — Eject
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditing) {
        e.preventDefault();
        if (selectedIds.size > 0) ejectSelected();
        else if (activeFileId) {
          const file = files.find((f) => f.id === activeFileId);
          if (file) addToast(file.name, 'ejected', 'amber');
        }
      }

      // Escape — Clear selection
      if (e.key === 'Escape' && !isEditing && !isCmdOpen) {
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleCmd, selectAll, ejectSelected, activeFileId, selectedIds, addToast, clearSelection, files, isCmdOpen]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toggleCmd();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [toggleCmd]);

  return (
    <div className="flex flex-col h-screen p-4 gap-4 text-[var(--tx)] transition-colors duration-200 relative overflow-hidden">
      {/* Base Background */}
      <div className="absolute inset-0 z-0 bg-[var(--bg)] transition-colors duration-300"></div>
      
      {/* Animated Gradient Bloom */}
      <div 
        className="absolute inset-0 z-0 opacity-100 blur-[80px] saturate-150 animate-[gradientBG_15s_ease_infinite]"
        style={{ 
          backgroundImage: 'var(--bg-gradient)',
          backgroundSize: '200% 200%' 
        }}
      ></div>
      
      {/* UI Layer */}
      <div className="relative z-10 flex flex-col h-full gap-4 w-full">
        {!isFullscreen && <Toolbar />}
        <div className="flex flex-1 overflow-hidden gap-4">
          {!isFullscreen && <Sidebar />}
          <ContentPane />
        </div>
      </div>
      
      <CommandPalette />
      <EjectBar />
      <Toasts />
      <DropZone />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
