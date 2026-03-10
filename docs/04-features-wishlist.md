# CODRUM/MDStalker — Features Wishlist

> Prioritized feature backlog for reaching professional-quality UX.

---

## High Priority — Core UX Gaps

These features address the biggest gaps between current state and a professional tool.

### 1. Resizable Sidebar
**What:** Drag-to-resize sidebar, collapse/expand with toggle button or `Cmd+\`.
**Why:** Fixed 260px feels rigid. Users need control over their layout.
**How:** `react-resizable-panels` — wrap Sidebar + ContentPane in PanelGroup.
**Effort:** Small (Phase A)

### 2. Multi-Tab Editing
**What:** Open multiple files in tabs. Tab bar with close buttons, drag to reorder, middle-click to close.
**Why:** Single-file view is the #1 limitation. Every editor supports tabs.
**How:** Dockview for full docking, or simpler custom tab bar initially.
**Effort:** Large (Phase D)

### 3. Command Palette (Cmd+K)
**What:** Quick-search overlay for files, commands, theme switching.
**Why:** Power users expect it. Reduces mouse dependency.
**How:** shadcn/ui Command component (built on cmdk).
**Effort:** Medium (Phase E)

### 4. File Tree View
**What:** Collapsible folder hierarchy instead of flat file list.
**Why:** Flat list doesn't scale past ~20 files. No directory context.
**How:** Custom tree component with Radix primitives, or Blueprint.js Tree.
**Effort:** Medium (Phase E)

### 5. Context Menus
**What:** Right-click on files, tabs, editor regions for contextual actions.
**Why:** Expected desktop interaction. Currently zero right-click support.
**How:** shadcn/ui ContextMenu (Radix-based).
**Effort:** Small (Phase B)

### 6. Keyboard Navigation
**What:** Arrow keys to navigate file list, Tab through panels, Enter to open.
**Why:** Keyboard users can't navigate files at all currently.
**How:** Add `onKeyDown` handler to FileList, focus management with Radix.
**Effort:** Small-Medium (Phase B)

### 7. Split View
**What:** Editor + preview side by side for markdown files.
**Why:** Standard for markdown editors. See changes in real-time.
**How:** Dockview split, or simpler PanelGroup horizontal split.
**Effort:** Medium (Phase D)

### 8. Fix Selection System
**What:** Debug why multi-select visual state doesn't propagate despite correct store updates.
**Why:** Reported as non-functional. May be a rendering/hydration issue.
**How:** Investigate WatchedFileRow's subscription to `selectedIds`. Add debugging. Check if component re-renders.
**Effort:** Small (bug fix)

### 9. CodeMirror Code Editor
**What:** Replace textarea + highlight.js overlay with CodeMirror 6.
**Why:** Real bracket matching, auto-indent, multi-cursor, search, extensions.
**How:** Create CodeMirrorEditor wrapper, theme bridge, save integration.
**Effort:** Medium-Large (Phase C)

---

## Medium Priority — Professional Polish

These features make the difference between "works" and "feels professional."

### 10. Git Integration
**What:** Show git status per file (modified, untracked, staged). Diff against HEAD.
**Why:** Every code editor shows git status. Users need this context.
**How:** `simple-git` or spawn `git` from main process. Add status field to WatchedFileInfo.
**Effort:** Medium

### 11. Global Search Across Files
**What:** Search content across all watched files. Results panel with file + line.
**Why:** Current search is single-file only (Cmd+F in editor).
**How:** Main process reads all file contents, filters. Results component in sidebar or panel.
**Effort:** Medium

### 12. Breadcrumb Navigation
**What:** `folder / subfolder / file.md` breadcrumb in toolbar.
**Why:** Shows location context, allows quick navigation up the tree.
**How:** Parse file path, render clickable segments in Toolbar.
**Effort:** Small

### 13. Notification Toasts
**What:** Visual feedback for save success, external file changes, errors.
**Why:** Currently silent — user doesn't know if save worked.
**How:** shadcn/ui Toast or Sonner.
**Effort:** Small

### 14. Drag-to-Reorder Files
**What:** Drag files in sidebar to custom order.
**Why:** Users want to organize files by importance, not just by date.
**How:** `@dnd-kit/core` or HTML5 drag API. Persist order in store.
**Effort:** Medium

### 15. Pin Files
**What:** Pin important files to top of sidebar list.
**Why:** Quick access to frequently edited files.
**How:** Add `pinned: boolean` to file state. Sort pinned files first.
**Effort:** Small

### 16. File Type Icons
**What:** Colored language icons next to file names in sidebar.
**Why:** Visual scanning is faster than reading extensions.
**How:** `vscode-icons` or custom SVG set. Map from `fileType.category`.
**Effort:** Small

### 17. Recent Files
**What:** Quick access to recently opened/closed files.
**Why:** Common workflow — close a file, need to reopen it.
**How:** Persist recent file paths in electron-store. Show in command palette.
**Effort:** Small

### 18. Auto-Save
**What:** Configurable auto-save (on blur, on interval, or disabled).
**Why:** Prevents data loss, reduces manual save friction.
**How:** Debounced save trigger in ContentPane. Setting in electron-store.
**Effort:** Small

---

## Low Priority — Delight Features

These are "nice to have" — they differentiate but aren't expected.

### 19. Zen Mode
**What:** Hide all chrome (sidebar, toolbar, status bar), full-screen editor.
**Why:** Distraction-free writing.
**How:** Toggle state that hides layout elements. `Cmd+Shift+Z` or from command palette.
**Effort:** Small

### 20. Typewriter Mode
**What:** Keep cursor vertically centered while typing.
**Why:** Comfortable for long-form writing. Typora has this.
**How:** `scrollIntoView` with block: 'center' on cursor position change.
**Effort:** Small

### 21. Focus Mode
**What:** Dim all paragraphs except the one being edited.
**Why:** Helps focus during writing. Literary writing apps have this.
**How:** CSS opacity transition on non-active blocks in MarkdownRenderer.
**Effort:** Small

### 22. Custom Keybindings
**What:** User-configurable keyboard shortcuts.
**Why:** Power users want their preferred bindings.
**How:** Keybinding config in electron-store. UI to edit in settings panel.
**Effort:** Medium

### 23. Plugin System
**What:** User-installable extensions for custom functionality.
**Why:** Extensibility without core changes.
**How:** Define plugin API, load from user directory. Major architecture decision.
**Effort:** Very Large

### 24. Markdown Export
**What:** Export to PDF, HTML, styled output.
**Why:** Useful for sharing rendered markdown.
**How:** Puppeteer/Playwright for PDF. String template for HTML.
**Effort:** Medium

### 25. Image Paste
**What:** Paste clipboard images into markdown, auto-save to assets folder.
**Why:** Screenshots are common in documentation.
**How:** Intercept paste event, save blob to disk, insert `![](path)`.
**Effort:** Medium

### 26. Mermaid / Diagram Rendering
**What:** Render Mermaid diagrams inline in markdown preview.
**Why:** Many markdown docs include diagrams.
**How:** `mermaid` npm package, render in CodeBlock when `lang === 'mermaid'`.
**Effort:** Small-Medium

### 27. Collaborative Editing
**What:** Real-time multi-user editing via WebSocket.
**Why:** Long-term differentiator.
**How:** Yjs or Automerge CRDT. Major architecture addition.
**Effort:** Very Large

### 28. AI Integration
**What:** Claude API for writing assistance, code completion, summarization.
**Why:** Natural fit for a text/code editor.
**How:** Anthropic SDK, sidebar panel or inline suggestions.
**Effort:** Medium-Large

---

## Performance & Quality

### 29. Test Suite
**What:** Vitest unit tests + Playwright E2E tests.
**Why:** Zero tests currently. Any migration risks regressions.
**How:** Vitest for stores/utils, Playwright for full app.
**Priority:** High — do before major migrations.
**Effort:** Medium (ongoing)

### 30. Error Boundaries
**What:** React error boundaries around major sections (ContentPane, Sidebar, MarkdownRenderer).
**Why:** Currently, any render error crashes the whole app silently.
**How:** React `ErrorBoundary` component with fallback UI.
**Priority:** High.
**Effort:** Small

### 31. Virtual Scrolling
**What:** Virtualized file list for 1000+ files.
**Why:** Current FileList renders all rows. Slow with many files.
**How:** `@tanstack/react-virtual` or `react-window`.
**Priority:** Medium (only matters at scale).
**Effort:** Small

### 32. Lazy Loading / Code Splitting
**What:** Lazy load CodeMirror, highlight.js, heavy components.
**Why:** Faster initial startup.
**How:** `React.lazy()` + `Suspense`. Dynamic `import()` for CodeMirror language packs.
**Priority:** Medium.
**Effort:** Small

### 33. Memory Profiling
**What:** Audit file watchers and content storage for leaks.
**Why:** Long-running Electron apps must manage memory carefully.
**How:** Electron DevTools memory tab. Check WatchManager cleanup on removeFile.
**Priority:** Medium.
**Effort:** Small

### 34. Accessibility Audit
**What:** Screen reader support, contrast ratios, ARIA labels.
**Why:** Professional apps need accessibility.
**How:** axe-core automated audit. Manual VoiceOver testing. Radix primitives help.
**Priority:** Medium.
**Effort:** Medium

---

## Priority Matrix

```
                        Low Effort ──────────────────── High Effort
                        │                                         │
High    ┌───────────────┼─────────────────────────────────────────┤
Impact  │ 1. Resizable sidebar     │ 2. Multi-tab editing        │
        │ 5. Context menus         │ 9. CodeMirror editor        │
        │ 6. Keyboard nav          │ 4. File tree view           │
        │ 8. Fix selection bug     │ 3. Command palette          │
        │ 30. Error boundaries     │ 29. Test suite              │
        │ 13. Notification toasts  │                             │
        ├───────────────┼─────────────────────────────────────────┤
Medium  │ 12. Breadcrumbs          │ 10. Git integration         │
Impact  │ 15. Pin files            │ 11. Global search           │
        │ 16. File type icons      │ 14. Drag-to-reorder         │
        │ 17. Recent files         │ 7. Split view               │
        │ 18. Auto-save            │ 22. Custom keybindings      │
        │ 31. Virtual scrolling    │ 34. Accessibility audit     │
        │ 32. Lazy loading         │                             │
        ├───────────────┼─────────────────────────────────────────┤
Low     │ 19. Zen mode             │ 24. Markdown export         │
Impact  │ 20. Typewriter mode      │ 25. Image paste             │
        │ 21. Focus mode           │ 28. AI integration          │
        │ 26. Mermaid diagrams     │ 23. Plugin system           │
        │ 33. Memory profiling     │ 27. Collaborative editing   │
        └───────────────┴─────────────────────────────────────────┘
```

### Recommended Sequence

**Do first (quick wins):**
1, 5, 6, 8, 13, 30

**Do next (major upgrades):**
9, 3, 4, 2, 29

**Do when stable:**
10, 11, 7, 12, 14, 15, 16, 17, 18

**Do for delight:**
19, 20, 21, 26, 24, 25

**Do if ambitious:**
22, 28, 23, 27
