# CODRUM/MDStalker — Current State Architecture

> Snapshot of the codebase as of March 2026. No code changes — pure analysis.

---

## 1. Project Overview

| Aspect | Detail |
|--------|--------|
| **Runtime** | Electron 40.8.0 + React 19.2.4 |
| **State** | Zustand 5.0.11 (2 stores) |
| **Build** | Vite 5.4.21 + Electron Forge 7.11.1 |
| **Language** | TypeScript 5.5 (strict) |
| **Production deps** | 10 packages |
| **Dev deps** | 17 packages |
| **Source files** | 81 TS/TSX files, 5,343 lines |
| **React components** | 36 across 6 categories |
| **CSS files** | 4 files, 106 lines |
| **Themes** | 6 themes, 55 CSS custom properties each |
| **File types supported** | 39 (with highlight.js mappings) |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│ Main Process (src/main/) — 13 files                  │
│                                                      │
│  main.ts ──→ WatchManager ──→ WatchedFile            │
│                  │                                   │
│                  ├─→ FileWatcher (chokidar)           │
│                  ├─→ DiffService (diff)               │
│                  └─→ SnapshotStore                    │
│                                                      │
│  IPC Layer:                                          │
│    ipc/file-handlers.ts (add/remove/select/save)     │
│    ipc/drop-handlers.ts (drag-drop paths)            │
│                                                      │
│  Utils: Debouncer, scan-directory                    │
│  Menu: native macOS/Windows menu                     │
│  Theme persistence: electron-store                   │
├──────────────────────────────────────────────────────┤
│ Preload (src/preload/preload.ts)                     │
│  12 methods bridging IPC → ElectronAPI interface     │
│  Context isolation enforced                          │
├──────────────────────────────────────────────────────┤
│ Renderer (src/renderer/) — ~65 files                 │
│                                                      │
│  App.tsx → ThemeProvider                              │
│    ├─ Toolbar (40px top bar)                         │
│    ├─ Sidebar (260px) + ContentPane (flex:1)         │
│    ├─ StatusBar (26px bottom)                        │
│    └─ SearchOverlay (modal)                          │
│                                                      │
│  Stores: app-store (13 fields, 15 actions)           │
│          theme-store (3 fields)                      │
│                                                      │
│  36 components across 6 directories                  │
│  Markdown pipeline: unified + remark → AST → React   │
│  Code editing: textarea overlay + highlight.js       │
│  Themes: 6 themes, CSS custom properties             │
│  Animations: anime.js (8 functions)                  │
├──────────────────────────────────────────────────────┤
│ Shared (src/shared/) — 4 files                       │
│  types.ts — WatchedFileInfo, ElectronAPI, etc.       │
│  file-types.ts — 39 file type plugins                │
│  constants.ts — IPC channels, timing constants       │
│  result.ts — Result<T,E> monad                       │
└──────────────────────────────────────────────────────┘
```

---

## 3. Component Inventory (36 components)

### Layout (6)

| Component | File | Purpose |
|-----------|------|---------|
| App | `App.tsx` | Root, drag-drop handler, ThemeProvider wrapper |
| ContentPane | `components/layout/ContentPane.tsx` | Editor area, render strategy dispatcher |
| Sidebar | `components/layout/Sidebar.tsx` | File list container, 260px fixed |
| Toolbar | `components/layout/Toolbar.tsx` | Header bar, file info, view mode toggle |
| StatusBar | `components/layout/StatusBar.tsx` | Footer, file stats, theme name |
| SearchOverlay | `components/layout/SearchOverlay.tsx` | Full-screen search modal |

### Markdown Rendering (17)

| Component | Purpose |
|-----------|---------|
| MarkdownRenderer | Parser + renderer orchestrator, InlineEditContext provider |
| Paragraph | Inline-editable paragraphs |
| Heading | H1-H6 with uppercase styling |
| SectionHeader | Custom `[[ID]]::Title` syntax |
| CodeBlock | Fenced code with language highlighting |
| Table | GFM table rendering |
| MetaTable | 2-column metadata table variant |
| ListBlock | Ordered/unordered lists with tasks |
| CheckItem | Checkbox items with bounce animation |
| Callout | `[!TYPE]` blockquotes (note, idea, warning, bug, tip) |
| Blockquote | Standard blockquote |
| Image | Image embedding with fallback |
| Link | Styled anchor tags |
| InlineCode | Backtick inline code |
| ProgressBar | Task completion (x/y done) |
| HorizontalRule | Thematic break |
| TagPill | Inline tag pill styling |

### Code Rendering (1)

| Component | Purpose |
|-----------|---------|
| CodeFileRenderer | Dual-layer textarea + `<pre><code>` with highlight.js, line numbers, scroll sync |

### Editing (4)

| Component | Purpose |
|-----------|---------|
| EditableText | Single-line inline editor |
| EditableMultiline | Multi-line textarea, markdown-aware |
| EditableCode | Code block inline editor |
| EditableTableCell | Table cell inline editor |

### Sidebar (4)

| Component | Purpose |
|-----------|---------|
| FileList | File list, click/shift/cmd selection, drag-drop |
| WatchedFileRow | File row with metadata badges |
| SidebarHeader | "Add Folder" / "Add File" buttons |
| SelectionBar | Multi-selection action bar |

### UI Utilities (4)

| Component | Purpose |
|-----------|---------|
| Bracket | Visual `[ ]` container |
| Sep | Separator character |
| FlashBadge | Animated badge for file changes |
| StalkingIndicator | Animated "stalking" eye in status bar |

---

## 4. Main Process Architecture

### Entry Point (`main.ts` — 74 lines)
- Creates BrowserWindow (1200x800, min 900x600)
- macOS: `titleBarStyle: 'hiddenInset'`, custom traffic light position
- Security: `contextIsolation: true`, `nodeIntegration: false`
- Registers IPC handlers, menu, theme persistence
- Graceful shutdown: destroys WatchManager on window close

### WatchManager (`watch-manager.ts` — 185 lines)
Core coordination hub:
- `Map<id, WatchedFile>` — file registry
- `Map<id, FileWatcher>` — watcher registry
- `Set<id> suppressReload` — post-save debounce set
- Key methods: `addFile`, `addDirectory`, `removeFile`, `selectFile`, `saveFile`, `destroy`
- Debounces file change events (100ms)
- Suppresses change events for 1s post-save to prevent reload loops

### FileWatcher (`file-watcher.ts` — 63 lines)
- Chokidar wrapper with `awaitWriteFinish` (100ms stability threshold)
- `FileWatcher` — single file observer
- `DirectoryWatcher` — recursive observer (depth: 10).  In the current codebase the
    `WatchManager` instantiates a `DirectoryWatcher` whenever a folder is added so that
    new files and deletions are detected automatically; change notifications are
    forwarded to the existing per‑file `FileWatcher` instances to keep events from
    firing twice.
- Filters via `isAcceptedFile()` before notifying

### WatchedFile (`watched-file.ts` — 113 lines)
Metadata container per file:
- `id`, `filePath`, `fileType`, `displayName`, `preview`
- `previousContent`, `lastModified`, `changeCount`
- `linesAdded`, `linesRemoved`, `wordCount`, `charCount`
- `showUpdatedBadge` — auto-hides after 2.5s timeout
- `toInfo()` — converts to DTO for renderer

### IPC Channels (13 total)

**Invoke (request-response):**
| Channel | Payload | Returns |
|---------|---------|---------|
| `stalker:add-directory` | — | `WatchedFileInfo[]` |
| `stalker:add-file` | — | `WatchedFileInfo \| null` |
| `stalker:remove-file` | `id` | `void` |
| `stalker:remove-files` | `ids[]` | `void` |
| `stalker:select-file` | `id` | `FileSelectedPayload \| null` |
| `stalker:get-file-list` | — | `WatchedFileInfo[]` |
| `stalker:save-file` | `id, content` | `SaveResult` |
| `stalker:drop-paths` | `paths[]` | `WatchedFileInfo[]` |
| `stalker:get-theme` | — | `string` |

**Send (one-way):** `stalker:set-theme`

**Subscriptions (main → renderer):**
| Channel | Payload |
|---------|---------|
| `stalker:file-changed` | `FileChangedPayload` |
| `stalker:file-list-changed` | `WatchedFileInfo[]` |
| `stalker:theme-changed` | `themeId` |
| `stalker:save-requested` | — |

---

## 5. Preload Bridge (`preload.ts`)

12 methods exposed as `window.electronAPI`:

```typescript
// File operations
addDirectory(): Promise<WatchedFileInfo[]>
addFile(): Promise<WatchedFileInfo | null>
removeFile(id: string): Promise<void>
removeFiles(ids: string[]): Promise<void>
selectFile(id: string): Promise<FileSelectedPayload | null>
getFileList(): Promise<WatchedFileInfo[]>
saveFile(id: string, content: string): Promise<SaveResult>
dropPaths(paths: string[]): Promise<WatchedFileInfo[]>
getPathForFile(file: File): string  // webUtils bridge

// Theme
setTheme(id: string): void
getTheme(): Promise<string>

// Subscriptions (return unsubscribe functions)
onFileChanged(cb): () => void
onFileListChanged(cb): () => void
onThemeChanged(cb): () => void
onSaveRequested(cb): () => void
```

---

## 6. State Management

### App Store (`app-store.ts`)

**13 state fields:**
| Field | Type | Purpose |
|-------|------|---------|
| `files` | `WatchedFileInfo[]` | Watched file list |
| `selectedFileId` | `string \| null` | Currently displayed file |
| `content` | `string` | Clean file content |
| `editContent` | `string` | Dirty/edited content |
| `dirty` | `boolean` | Has unsaved changes |
| `viewMode` | `'inline' \| 'source'` | Current view mode |
| `activeEditOffset` | `number \| null` | Inline edit cursor position |
| `searchQuery` | `string` | Search input text |
| `searchOpen` | `boolean` | Search overlay visible |
| `saving` | `boolean` | Save operation in progress |
| `selectedIds` | `string[]` | Multi-selected file IDs |
| `lastSelectedId` | `string \| null` | Last clicked (for range select) |

**15 actions:** `setFiles`, `setSelectedFileId`, `setContent`, `setEditContent`, `setDirty`, `setViewMode`, `setActiveEditOffset`, `updateFile`, `setSearchQuery`, `setSearchOpen`, `setSaving`, `toggleSelected`, `selectRange`, `clearSelection`, `selectAll`

**Key pattern:** `selectedIds` uses `string[]` (not `Set<string>`) because Zustand's `Object.is` shallow comparison can't detect Set mutations.

### Theme Store (`theme-store.ts`)

| Field | Type | Purpose |
|-------|------|---------|
| `current` | `ThemeDefinition` | Active theme object |
| `list` | `ThemeDefinition[]` | All available themes |
| `setTheme(id)` | action | Change theme + persist via IPC |

Helper: `initThemeFromMain(id)` hydrates store from main process on startup.

---

## 7. Theme System

### 6 Themes

| Theme | Style | Default |
|-------|-------|---------|
| n01z | Dark, cyberpunk, cyan/violet accents | Yes |
| phosphor | Light variant | |
| obsidian | Dark minimal | |
| paper | Light, paper-like | |
| dracula | Famous dark scheme | |
| nord | Arctic palette | |

### 55 CSS Custom Properties per Theme

| Category | Count | Examples |
|----------|-------|---------|
| Backgrounds | 5 | `bgDeep`, `bgBase`, `bgSurface`, `bgElevated`, `bgHover` |
| Text | 3 | `textPrimary`, `textSecondary`, `textMuted` |
| Accents | 5 | `accentCyan`, `accentViolet`, `accentMint`, `accentAmber`, `accentRose` |
| Code | 2 | `codeBg`, `codeText` |
| Tables | 3 | `tableHeaderBg`, `tableRowOdd`, `tableRowEven` |
| Sidebar | 3 | `sidebarBg`, `sidebarItemHover`, `sidebarItemActive` |
| Callouts | 15 | 5 types × 3 (bg, border, icon) |
| Blockquote | 2 | `blockquoteBorder`, `blockquoteText` |
| StatusBar | 2 | `statusBarBg`, `statusBarText` |
| Toolbar | 2 | `toolbarBg`, `toolbarText` |
| Flash/Badges | 3 | `flashColor`, `flashBg`, `flashBorder` |
| Diff | 2 | `diffAdded`, `diffRemoved` |
| Typography | 5 | `fontMono`, `fontBody`, `cornerRadius`, `isTerminalStyle`, `headingAllCaps` |

### Implementation
- `theme-types.ts` — TypeScript interface for all 55 properties
- `css-vars.ts` — `applyThemeVars()` maps TS keys → CSS variables on `:root`
- `theme-provider.tsx` — React wrapper, triggers glitch animation on change
- `theme-persistence.ts` — saves/loads theme ID via electron-store

---

## 8. Styling Audit

### Approach
- **90% inline styles** in React `style={}` props
- **10% CSS files** (4 files, 106 lines total)
- **No CSS-in-JS library** (no styled-components, no Emotion)
- **No Tailwind, no CSS Modules**
- Theme colors via CSS custom properties: `var(--bg-base)`, etc.
- `color-mix(in srgb, ...)` for overlays and tints

### CSS Files

| File | Lines | Purpose |
|------|-------|---------|
| `global.css` | 53 | Google Fonts (Inter, JetBrains Mono), box-sizing reset, scrollbar, selection |
| `animations.css` | 29 | 5 keyframes: fadeInOut, pulseGlow, slideIn, pulse, flash |
| `editor.css` | 24 | `[data-editable]` cursor, outline, focus, caret color |
| `hljs-theme.css` | — | highlight.js color overrides via CSS vars |

### Problems
1. Inline styles can't express `:hover`, `:focus`, `:active` — requires manual `onMouseEnter`/`onMouseLeave` handlers
2. No design tokens beyond CSS variables
3. No responsive breakpoints (fixed dimensions throughout)
4. Theming brittle — must manually reference `var(--...)` strings everywhere

---

## 9. Animation System (`anime-helpers.ts`)

8 animation functions using anime.js v4:

| Function | Effect | Duration |
|----------|--------|----------|
| `animateBlockEntrance` | Staggered fade-in for markdown blocks | 400ms, 30ms stagger |
| `animateEditToggle` | Scale + fade for edit mode toggle | 200ms |
| `animateSaveFlash` | Cyan glow pulse on file save | 600ms |
| `animateCheckboxBounce` | Bounce on task checkbox toggle | 300ms |
| `animateListStagger` | Staggered slide-in for list items | 300ms, 40ms stagger |
| `animateIdleEye` | Looping "stalking" indicator | 3s loop |
| `animateThemeGlitch` | Glitch effect on theme switch | 300ms |
| *(8th)* | Additional helper | — |

---

## 10. Markdown Pipeline

### Parser (`markdown-parser.ts`)
- **Foundation:** unified + remark-parse + remark-gfm
- Parses markdown → custom `MdNode` AST tree
- Custom transformations:
  - **Callouts:** `> [!TYPE]` blockquotes → callout nodes
  - **Section headers:** `[[ID]]::Title` → sectionHeader nodes
  - **Meta tables:** 2-column tables with bold first col → isMetaTable flag
  - **Task progress:** Scans tasks, computes done/total, injects taskProgress

### MdNode Type
- Core: `type`, `children`, `value`, `depth`, `position` (start/end offset)
- Markdown: `lang`, `meta`, `align`, `checked`
- Custom: `calloutType`, `sectionId`, `sectionTitle`, `isMetaTable`, `taskProgress`

### Rendering
- `MarkdownRenderer.tsx` orchestrates parse → render tree
- `renderInline()` — text, strong, emphasis, code, link, image, etc.
- `renderBlock()` — paragraph, heading, code, table, list, callout, etc.
- 17 dedicated components for each block type

### Content Strategy (`content-renderer.ts`)
```
'markup' + markdown → 'markdown-inline'
'text'              → 'plain-text'
code/config/data    → 'code-highlighted'
```

---

## 11. Code Editing System (`CodeFileRenderer.tsx`)

### Architecture: Transparent Textarea Over Highlighted Code

```
┌─────────────────────────────────────┐
│ Line Numbers │ Textarea (transparent) │  ← User types here
│ (gutter)     │ Pre+Code (behind)     │  ← Syntax highlighting shows here
│              │ Caret visible through  │
└─────────────────────────────────────┘
```

- **Textarea layer:** transparent background, visible caret (`caretColor: cyan`), transparent text
- **Pre+Code layer:** `position: absolute`, `pointer-events: none`, `dangerouslySetInnerHTML` with highlighted HTML
- **Scroll sync:** `syncScroll()` copies textarea scroll to pre + line numbers
- **Tab handling:** Tab key → 2 spaces + cursor repositioning
- **Enter handling:** preserves indentation from current line
- **highlight.js:** `hljs.highlight(content, { language })` per file type

---

## 12. Shared Types & Utilities

### types.ts (Core Interfaces)
- `WatchedFileInfo` — file metadata DTO (12 fields)
- `FileChangedPayload` — file change notification
- `FileSelectedPayload` — file + content pair
- `SaveResult` — success flag + updated file info
- `ElectronAPI` — full bridge contract
- Global: `Window.electronAPI` augmentation

### file-types.ts (39 File Types)
- Categories: markup, code, config, data, text
- Languages: Markdown, HTML, CSS, JS/TS/TSX, Python, Rust, C++, Java, SQL, YAML, JSON, Dockerfile, etc.
- highlight.js language mappings for 35+ languages
- Functions: `detectFileType()`, `isAcceptedFile()`, `getAcceptedExtensions()`

### constants.ts
```typescript
BADGE_TIMEOUT_MS = 2500    // Updated badge display duration
DEBOUNCE_MS = 100          // File change debounce
SAVE_SUPPRESS_MS = 1000   // Post-save reload suppression
IPC = { /* 13 channel names */ }
```

### result.ts
```typescript
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }
```

---

## 13. Layout Structure

```
<ThemeProvider>
  <div style="display:flex; flex-direction:column; height:100vh">

    <Toolbar />                           // 40px fixed top
      ├─ Left: CODRUM branding (traffic light spacing on macOS)
      ├─ Center: filename + type + dirty + saving status
      └─ Right: Source/Inline toggle, search (Cmd+K)

    <div style="display:flex; flex:1">
      <Sidebar />                         // 260px fixed width
        ├─ SidebarHeader (Add Folder / Add File buttons)
        ├─ FileList (flex:1, scrollable)
        │   └─ WatchedFileRow × N
        └─ SelectionBar (conditional, multi-select actions)

      <ContentPane />                     // flex:1
        ├─ Empty state: eye animation + instructions
        ├─ Markdown inline: <MarkdownRenderer /> (max-width: 780px)
        ├─ Code: <CodeFileRenderer /> (dual-layer)
        ├─ Source mode: raw <textarea />
        └─ Plain text: <textarea />
    </div>

    <StatusBar />                         // 26px fixed bottom
      ├─ Left: "[ STALKING ]" + file count
      ├─ Center: file name, type, word/char count
      └─ Right: modified/editing/theme

    <SearchOverlay />                     // Modal overlay
    {Drag overlay}                        // Conditional
  </div>
</ThemeProvider>
```

---

## 14. Custom Hooks

| Hook | Purpose |
|------|---------|
| `useKeyboard` | Global keyboard shortcuts (Cmd+S, Cmd+K, Cmd+Z, etc.) |
| `useFileWatcher` | IPC subscription lifecycle (file changes, list changes, theme, save) |
| `useRelativeTime` | Human-readable relative timestamps |

---

## 15. Known Issues & Technical Debt

1. **Selection system** — reported non-functional despite correct store code. Likely a rendering/hydration issue.
2. **Inline styles** — 90% of styling inline, making hover/focus/active states awkward (`onMouseEnter`/`onMouseLeave`).
3. **No testing** — zero test files in the project.
4. **No error boundaries** — renderer crashes propagate silently.
5. **Fixed sidebar** (260px) — not resizable.
6. **No keyboard file navigation** — arrow keys don't move through file list.
7. **Limited editor** — textarea overlay for code, contentEditable for markdown. No LSP, no multi-cursor.
8. **No file tree** — flat list only, no folder hierarchy.
9. **No tabs** — single file view only.
10. **Silent error handling** — main process swallows errors, renderer has no explicit catch handlers.

---

## 16. Dependency Health

| Dependency | Version | Status | Notes |
|------------|---------|--------|-------|
| Electron | 40.8.0 | Current | Active support |
| React | 19.2.4 | Current | Latest stable |
| Zustand | 5.0.11 | Current | Latest stable |
| anime.js | 4.3.6 | Current | v4 rewrite |
| chokidar | 5.0.0 | Current | Latest stable |
| highlight.js | 11.11.1 | Current | Latest stable |
| Vite | 5.4.21 | Supported | Vite 6 exists, 5.x still maintained |
| unified | 11.0.5 | Current | Latest stable |
| remark-parse | 11.0.0 | Current | Latest stable |
| electron-store | 11.0.2 | Current | Latest stable |
| diff | 8.0.3 | Current | Latest stable |
| TypeScript | 5.5 | Current | Latest stable |

All dependencies are on current major versions with no known deprecations.
