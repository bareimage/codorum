import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FileItem, Group, Command, Toast } from './types';
import { THEMES, MOCK_FILES, GROUPS, COMMANDS } from './mockData';

interface AppState {
  themeIndex: number;
  theme: string;
  files: FileItem[];
  groups: Group[];
  activeFileId: string | null;
  selectedIds: Set<string>;
  collapsedCards: Set<string>;
  searchQuery: string;
  openDrawers: Set<string>;
  isCmdOpen: boolean;
  toasts: Toast[];
  isFullscreen: boolean;
}

interface AppContextType extends AppState {
  setSearchQuery: (q: string) => void;
  cycleTheme: () => void;
  activateFile: (id: string) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  ejectSelected: () => void;
  toggleDrawer: (id: string) => void;
  toggleCollapse: (id: string) => void;
  ejectGroup: (id: string) => void;
  toggleCmd: () => void;
  addToast: (text: string, detail?: string, color?: string) => void;
  removeToast: (id: string) => void;
  toggleFullscreen: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [themeIndex, setThemeIndex] = useState(0);
  const [files, setFiles] = useState<FileItem[]>(MOCK_FILES);
  const [groups, setGroups] = useState<Group[]>(GROUPS);
  const [activeFileId, setActiveFileId] = useState<string | null>('f1');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set(['f3', 'f4', 'f7']));
  const [searchQuery, setSearchQuery] = useState('');
  const [openDrawers, setOpenDrawers] = useState<Set<string>>(new Set(['pinned', 'src', 'loose']));
  const [isCmdOpen, setIsCmdOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const addToast = useCallback((text: string, detail?: string, color: string = 'cyan') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, detail, color }]);
    setTimeout(() => {
      removeToast(id);
    }, 2500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeIndex((prev) => {
      const next = (prev + 1) % THEMES.length;
      document.documentElement.setAttribute('data-theme', THEMES[next]);
      addToast('Theme', THEMES[next], 'cyan');
      return next;
    });
  }, [addToast]);

  const activateFile = useCallback((id: string) => {
    setActiveFileId(id);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(files.map((f) => f.id)));
  }, [files]);

  const ejectSelected = useCallback(() => {
    addToast(`${selectedIds.size} file(s)`, 'ejected', 'amber');
    setSelectedIds(new Set());
  }, [selectedIds, addToast]);

  const toggleDrawer = useCallback((id: string) => {
    setOpenDrawers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const ejectGroup = useCallback((id: string) => {
    const group = groups.find((g) => g.id === id);
    if (group) {
      addToast(group.name, 'ejected', 'amber');
    }
  }, [groups, addToast]);

  const toggleCmd = useCallback(() => {
    setIsCmdOpen((prev) => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const value: AppContextType = {
    themeIndex,
    theme: THEMES[themeIndex],
    files,
    groups,
    activeFileId,
    selectedIds,
    collapsedCards,
    searchQuery,
    setSearchQuery,
    openDrawers,
    isCmdOpen,
    toasts,
    isFullscreen,
    cycleTheme,
    activateFile,
    toggleSelect,
    clearSelection,
    selectAll,
    ejectSelected,
    toggleDrawer,
    toggleCollapse,
    ejectGroup,
    toggleCmd,
    addToast,
    removeToast,
    toggleFullscreen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
