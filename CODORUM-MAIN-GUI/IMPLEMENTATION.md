# Codorum — Interactive Features Implementation Document

> Complete reference for every interactive behaviour in the Codorum desktop GUI.
> Source of truth: `src/` on branch `codorum-gui-refresh-v3`.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [State Management](#2-state-management)
3. [File Selection & Multi-Select](#3-file-selection--multi-select)
4. [File Card Expand / Collapse](#4-file-card-expand--collapse)
5. [Sidebar Drawers (Groups)](#5-sidebar-drawers-groups)
6. [Search & Filtering](#6-search--filtering)
7. [Sort Modes](#7-sort-modes)
8. [Command Palette](#8-command-palette)
9. [Theme Cycling](#9-theme-cycling)
10. [Eject Bar (Bulk Delete)](#10-eject-bar-bulk-delete)
11. [Drag-and-Drop (Native)](#11-drag-and-drop-native)
12. [Drag-and-Drop (Inter-Group)](#12-drag-and-drop-inter-group)
13. [File Watching & Live Reload](#13-file-watching--live-reload)
14. [File Editing & Save](#14-file-editing--save)
15. [File Create (New File)](#15-file-create-new-file)
16. [Tab Management](#16-tab-management)
17. [Group Rename](#17-group-rename)
18. [Toast Notifications](#18-toast-notifications)
19. [Resize Handle (Card Height)](#19-resize-handle-card-height)
20. [Keyboard Shortcuts](#20-keyboard-shortcuts)
21. [Context Menu](#21-context-menu)
22. [Scroll-Linked Active File](#22-scroll-linked-active-file)
23. [Hover-to-Activate](#23-hover-to-activate)
24. [Animated Background](#24-animated-background)
25. [Eye Blink Logo](#25-eye-blink-logo)
26. [Persistence](#26-persistence)
27. [File Type Detection & Rendering](#27-file-type-detection--rendering)
28. [Extension Color Dots](#28-extension-color-dots)
29. [Diff Badges](#29-diff-badges)
30. [Deleted File State](#30-deleted-file-state)
31. [Pinned Files](#31-pinned-files)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  App.tsx — Root shell                                           │
│  ├── Toolbar.tsx          — Top bar: brand, file count, ⌘K, theme │
│  ├── Sidebar.tsx          — File tree with drawers, search, sort │
│  │   └── DrawerSection    — Collapsible group with file rows    │
│  ├── ContentPane.tsx      — Scrollable card stream              │
│  │   └── FileCard.tsx     — Expand/collapse card with editor    │
│  │       ├── TiptapEditor — WYSIWYG markdown (md/mdx)          │
│  │       ├── CodeEditor   — CodeMirror 6 (code files)          │
│  │       └── <textarea>   — Plain text fallback                 │
│  ├── CommandPalette.tsx   — ⌘K overlay with commands            │
│  ├── EjectBar.tsx         — Bottom bar when files are selected  │
│  ├── Toasts.tsx           — Bottom-right notification stack     │
│  └── Drop overlay         — Inline div when dragging over app  │
├─────────────────────────────────────────────────────────────────┤
│  Stores (Zustand)                                               │
│  ├── app-store.ts    — Files, groups, selection, theme, UI state │
│  ├── toast-store.ts  — Toast queue with auto-dismiss            │
│  └── command-store.ts — Palette open/close toggle               │
├─────────────────────────────────────────────────────────────────┤
│  Tauri Backend (Rust)                                           │
│  ├── drop_paths      — Process drag-dropped paths              │
│  ├── add_directory    — Folder picker dialog                   │
│  ├── add_files        — File picker dialog                     │
│  ├── refresh_file     — Re-read file content from disk         │
│  ├── save_file        — Write content back to disk             │
│  ├── create_file      — Create new file on disk                │
│  ├── restore_files    — Reload files on app launch             │
│  └── remove_files     — Stop watching files                    │
│  Events: file-changed, file-renamed, file-removed              │
└─────────────────────────────────────────────────────────────────┘
```

**Tech stack**: Tauri 2.x, React 18, Zustand (persisted), TipTap (markdown), CodeMirror 6 (code), TypeScript.

---

## 2. State Management

**Store**: `src/stores/app-store.ts` — Zustand with `persist` middleware.

### Core State Shape

| Property | Type | Description |
|---|---|---|
| `files` | `WatchedFile[]` | All tracked files |
| `activeFileId` | `string \| null` | Currently focused file |
| `selectedIds` | `Set<string>` | Multi-selected file IDs |
| `lastSelectedId` | `string \| null` | Anchor for Shift-range select |
| `groups` | `FileGroup[]` | User tabs / folder groups |
| `theme` | `string` | Active theme name |
| `drawerOpen` | `Record<string, boolean>` | Drawer expansion state per group |
| `sortBy` | `"name" \| "modified" \| "changes"` | Current sort mode |
| `search` | `string` | Search query |
| `searchMode` | `"filename" \| "content"` | Search target |
| `cardCollapsed` | `Record<string, boolean>` | Card collapsed state per file |
| `cardHeights` | `Record<string, number \| null>` | Manual card heights (resize) |
| `cardDirty` | `Record<string, boolean>` | Unsaved edit tracking per file |
| `savedFilePaths` | `SavedFileEntry[]` | Persisted file paths for restore |

### Persisted Fields

Only these fields survive app restart (via `partialize`):
`theme`, `savedFilePaths`, `groups`, `drawerOpen`, `sortBy`, `searchMode`, `cardCollapsed`, `cardHeights`.

### WatchedFile Type

```typescript
interface WatchedFile {
  id: string;
  path: string;           // Absolute filesystem path
  name: string;           // Filename without extension
  extension: string;      // File extension (no dot)
  content: string;        // Raw file content
  modified: number;       // Unix timestamp (seconds)
  pinned: boolean;
  linesAdded?: number;
  linesRemoved?: number;
  _rev?: number;          // Internal revision counter for editor remount
  deleted?: boolean;      // Set when deleted from disk
}
```

### FileGroup Type

```typescript
interface FileGroup {
  id: string;
  name: string;
  sourcePath?: string;    // Filesystem path (folder-backed groups only)
  collapsed: boolean;
  fileIds: string[];
}
```

---

## 3. File Selection & Multi-Select

**Components**: `Sidebar.tsx` (DrawerSection), `App.tsx` (global keys)

### Selection Modes

| Input | Behaviour | Store Action |
|---|---|---|
| Click | Clear selection, activate file | `clearSelection()` + `openFile(id)` |
| ⌘/Ctrl + Click | Toggle individual selection | `toggleSelectFile(id)` |
| Shift + Click | Range select from anchor | `selectRange(id, orderedIds)` |
| ⌘A (not editing) | Select all files | `selectAll()` |
| Escape (not editing) | Clear selection | `clearSelection()` |

### Range Select Algorithm

```
selectRange(id, orderedIds):
  anchor = lastSelectedId ?? id
  from = orderedIds.indexOf(anchor)
  to = orderedIds.indexOf(id)
  selectedIds = orderedIds.slice(min(from,to), max(from,to)+1)
  // anchor stays unchanged for chained Shift-clicks
```

### Visual States

| State | Sidebar Style | Card Style |
|---|---|---|
| Active | `background: var(--ring)`, bold name | `box-shadow: 0 0 0 2px var(--ac)/50%` |
| Selected | `background: color-mix(var(--warn) 15%)` | `box-shadow: 0 0 0 2px var(--ac)/25%` |
| Hover | `background: var(--hover)` via `.file-row` class | Header bg lightens |

### Editing Guard

Selection shortcuts (`⌘A`, `Delete`, `Escape`) check `isEditing` before firing:

```typescript
const isEditing = tag === "INPUT" || tag === "TEXTAREA"
  || element.isContentEditable
  || element.closest(".cm-editor");
```

---

## 4. File Card Expand / Collapse

**Component**: `FileCard.tsx`, state in `app-store.cardCollapsed`

### Triggers

| Trigger | Action |
|---|---|
| Click chevron button | `toggleCardCollapse(fileId)` |
| Double-click card header | `toggleCardCollapse(fileId)` |
| Click file in sidebar | `openFile(id)` — does NOT auto-expand (card stays in current state) |

### Collapsed State

- Card body has `maxHeight: 0, overflow: hidden` with 250ms transition
- When collapsed, shows **subtitle** — first `# ` or `## ` heading extracted from content
- Subtitle styled: italic, Georgia serif, `var(--tx3)` colour
- Chevron icon rotates: `open={!isCollapsed}` → 90° rotation via CSS

### Expanded State

- Renders the appropriate editor based on file type (Tiptap/CodeMirror/textarea)
- Shows `ResizeHandle` at the bottom of the card body
- Body click is `stopPropagation()` to prevent re-activating the card while editing

---

## 5. Sidebar Drawers (Groups)

**Component**: `Sidebar.tsx` → `DrawerSection`

### Built-in Groups

| Group | ID | Description |
|---|---|---|
| Pinned | `"pinned"` | Files with `pinned: true`, cannot be dragged into |
| User groups | UUID | Created via "Create Tab", folder-backed from drops |
| Loose | `"loose"` | Files not in any group and not pinned |

### Drawer Toggle

- Click the drawer header → `toggleDrawer(groupId)`
- Chevron animates: `rotate(0)` ↔ `rotate(90deg)` with 150ms transition
- Body uses `maxHeight: 900px ↔ 0` with 250ms cubic-bezier transition
- Drawer state persisted in `drawerOpen` map

### ContentPane Sync

ContentPane only renders cards for groups where `drawerOpen[groupId] === true` (or when a search query is active, which overrides drawer state to show all matches).

### Eject Button

- Visible on hover (group header) via CSS `opacity: 0 → 1`
- **Folder-backed groups** (`sourcePath` set): `removeGroupAndFiles()` — removes group AND all its files from app + calls `invoke("remove_files")`
- **User tabs** (no `sourcePath`): `removeGroup()` — dissolves tab, files fall to Loose section

---

## 6. Search & Filtering

**Component**: `Sidebar.tsx`

### Search Modes

| Mode | Toggle | Behaviour |
|---|---|---|
| `"filename"` | "Name" button | Filters by `file.name.toLowerCase().includes(query)` |
| `"content"` | "Content" button | Filters by `file.content.toLowerCase().includes(query)` |

### Content Search Excerpts

When in content mode, matching files show a **highlighted excerpt** below their name in the sidebar:
- Extracts ~60 characters around the match
- Match text wrapped in `<mark>` with `background: var(--ac)` highlight
- HTML-escaped for safe rendering via `dangerouslySetInnerHTML`

### Filter Flow

1. Sidebar filters each group's files through `filterFiles()`
2. Empty groups are hidden when search is active (`if (q && filtered.length === 0) return null`)
3. ContentPane applies the same filter independently (both components read `search` + `searchMode` from store)

### State

```
search: string          — search query (not persisted)
searchMode: "filename" | "content"  — (persisted)
```

---

## 7. Sort Modes

**Component**: `Sidebar.tsx` sort buttons, `src/utils/sortFiles.ts`

| Mode | Algorithm |
|---|---|
| `"name"` | `a.name.localeCompare(b.name)` — alphabetical |
| `"modified"` | `b.modified - a.modified` — newest first |
| `"changes"` | `(b.added + b.removed) - (a.added + a.removed)` — most changed first |

- Sort applies to **both** Sidebar file lists and ContentPane card order
- Active sort button styled: `background: var(--hover)`, `color: var(--ac)`, `fontWeight: 600`
- Sort mode persisted across sessions

---

## 8. Command Palette

**Component**: `CommandPalette.tsx`, state in `command-store.ts`

### Open / Close

| Trigger | Action |
|---|---|
| `⌘K` / `Ctrl+K` | `toggle()` — opens if closed, closes if open |
| Right-click anywhere | `toggle()` — via contextmenu handler in App.tsx |
| Click toolbar search button | `toggle()` |
| `Escape` | `close()` |
| Click backdrop | `close()` |

### Commands

| ID | Label | Action |
|---|---|---|
| `add-folder` | Add Folder | `invoke("add_directory")` → `addFiles()` + `addGroup()` |
| `add-file` | Add Files | `invoke("add_files")` → `addFiles()` |
| `create-tab` | Create Tab | `createTab("Untitled")` → enter rename mode |
| `new-{groupId}` | New File in {name} | Enter filename input mode → `invoke("create_file")` |
| `theme` | Cycle Theme | `setTheme()` — shows current theme as subtitle |

### Dynamic Commands

- For each existing group, a "New File in {group.name}" command is generated dynamically
- The theme command shows the current theme name as `sub` text

### New File Flow

1. User selects "New File in {group}" → palette enters filename input mode
2. Input placeholder changes to `"filename (in {group.name})..."`
3. User types filename and presses Enter
4. If group has `sourcePath`: creates file directly in that directory
5. If group has no `sourcePath` (user tab): opens save dialog to pick location
6. Default extension `.md` appended if no extension provided
7. Created file added to files array and group's `fileIds`

### Keyboard Navigation

| Key | Action |
|---|---|
| `↑` / `↓` | Move highlight through selectable items |
| `Enter` | Execute highlighted command (or create file if in filename mode) |
| `Escape` | Exit filename mode → close palette |

### Auto-scroll

Selected item scrolls into view via `el.scrollIntoView({ block: "nearest" })` on index change.

### Filtering

Commands filtered by `item.label.toLowerCase().includes(query)`. Separators pass through but are removed if they have no child commands after filtering.

---

## 9. Theme Cycling

**Component**: `Toolbar.tsx`, store action `setTheme()`

### Themes (rotation order)

| Index | Name | Description | Key Colors |
|---|---|---|---|
| 0 | `n01z` | Apple Dark Mode | `--bg: #000`, `--ac: #0A84FF` |
| 1 | `paper` | Apple Light Mode | `--bg: #F5F5F7`, `--ac: #007AFF` |
| 2 | `phosphor` | Vibrant Green Aura | `--bg: #00120a`, `--ac: #34C759` |
| 3 | `ember` | Warm Orange/Red | `--bg: #1c0a00`, `--ac: #FF9500` |

### Implementation

1. `cycleTheme()` computes `(currentIndex + 1) % 4`
2. Calls `setTheme(THEMES[newIndex])`
3. `App.tsx` useEffect syncs: `document.documentElement.setAttribute("data-theme", theme)`
4. All colours switch instantly via CSS custom properties (body has `transition: background 200ms`)
5. Animated gradient background transitions via `transition: background-image .6s`

### Triggers

- Click theme button in toolbar (shows current theme name)
- `⌘T` / `Ctrl+T` keyboard shortcut
- "Cycle Theme" command in palette

### Persistence

`theme` is persisted — survives app restart.

---

## 10. Eject Bar (Bulk Delete)

**Component**: `EjectBar.tsx`

### Visibility

Renders only when `selectedIds.size > 0`. Returns `null` otherwise.

### Display

- Fixed at bottom center of viewport
- Shows file name (single selection) or "{N} files" (multi)
- Two buttons: **Eject** (danger) and **Cancel**

### Eject Action

```
handleEject():
  1. Capture count and IDs
  2. ejectSelected()      — removes from files[], groups.fileIds, clears selection
  3. invoke("remove_files", { ids })  — tells Rust backend to stop watching
  4. addToast("{N} file(s)", "ejected", "amber")
```

### Cancel Action

`clearSelection()` — empties `selectedIds` Set, bar disappears.

### Animation

Entry: `barIn` keyframe — 150ms cubic-bezier slide-up from bottom with scale.

---

## 11. Drag-and-Drop (Native)

**Component**: `App.tsx` — Tauri native drag-drop event listener

### Flow

1. `getCurrentWebview().onDragDropEvent()` registers handler
2. `type: "enter"` / `"over"` → `setDropHovering(true)` — shows overlay
3. `type: "drop"` → processes dropped paths
4. `type: "leave"` → hides overlay

### Drop Processing

```
invoke("drop_paths", { paths }) returns DropBatchResult {
  directories: DirectoryResult[]  // Folders → become groups
  loose_files: WatchedFile[]      // Individual files → added to loose
}
```

For each directory:
- Files added via `addFiles(dir.files)`
- New group created via `addGroup({ name: dir_name, sourcePath: dir.source_dir, fileIds })`

For loose files:
- Added via `addFiles(result.loose_files)`

### Drop Overlay

Simple centered div with `"drop files here"` text, shown conditionally via `{dropHovering && <div>...</div>}`.

---

## 12. Drag-and-Drop (Inter-Group)

**Component**: `Sidebar.tsx` — custom mouse-based drag system

### Drag State

```typescript
interface DragState {
  fileId: string;
  fileName: string;
  startY: number;
  active: boolean;  // becomes true after 4px movement threshold
}
```

### Flow

1. **mousedown** on file row → record `{ fileId, fileName, startY }`, set `active: false`
2. **mousemove** → if `|clientY - startY| >= 4px`, activate drag:
   - Show ghost element (floating pill with filename) following cursor
   - Hit-test: `document.elementsFromPoint()` to find `[data-section-id]` closest to cursor
   - Highlight target section: left blue border + tinted background
   - Pinned section blocked as drop target (`dragOverSectionId === "pinned" ? null`)
3. **mouseup** → if drag was active:
   - If target is `"loose"`: remove file from its current group (`removeFileFromGroup`)
   - Otherwise: `moveFileToGroup(fileId, targetGroupId)`
   - `suppressClick` ref prevents the mouseup from also triggering a click/activate
4. Clean up: clear drag state, remove ghost, clear highlight

### Visual Feedback

- **Ghost element**: Fixed-position pill following cursor at `(clientX + 12, clientY - 10)`, styled with `var(--card)` bg and `var(--ac)` border
- **Target section**: `borderLeft: 3px solid var(--ac)`, `background: color-mix(var(--ac) 8%)`, 100ms transition

---

## 13. File Watching & Live Reload

**Component**: `App.tsx` — Tauri event listeners

### Events from Backend

| Event | Payload | Handler |
|---|---|---|
| `file-changed` | `string` (path) | Re-read file via `invoke("refresh_file")`, compute diff, update store |
| `file-renamed` | `FileRenamedPayload` | Update file's `path`, `name`, `extension` in store |
| `file-removed` | `string` (path) | Set `deleted: true` on matching file |

### file-changed Flow

```
1. Normalize path slashes (\ → /)
2. Find matching file in store by path
3. invoke("refresh_file", { path }) → { content, modified }
4. Compare with current content (skip if identical — prevents feedback loop from own saves)
5. Compute simple diff: count lines in new not in old (added), lines in old not in new (removed)
6. updateFile(id, { content, modified, linesAdded, linesRemoved })
7. setCardDirty(file.id, false)  — external change clears dirty flag
8. addToast("Updated", file.name, "cyan")
```

### Revision Counter

`updateFile()` increments `file._rev` on each update. Editors use `key={\`editor-${file.id}-${file._rev}\`}` to force remount on external content change.

---

## 14. File Editing & Save

**Component**: `FileCard.tsx`

### Editor Selection

```typescript
function detectMode(ext: string): "markdown" | "code" | "text" {
  if (["md", "markdown", "mdx"].has(ext)) return "markdown";
  if (CODE_EXTS.has(ext)) return "code";  // ~30 extensions
  return "text";
}
```

| Mode | Component | Features |
|---|---|---|
| `markdown` | `TiptapEditor` | WYSIWYG editing, slash menu, bubble menu, tables, mermaid blocks |
| `code` | `CodeEditor` | CodeMirror 6, syntax highlighting, language-specific |
| `text` | `<textarea>` | Auto-sizing plain text, monospace font |

### Dirty Tracking

- Each editor calls `handleMarkdownChange()` or `handleTextChange()` on edit
- Compares current content to `file.content` (normalized newlines)
- Sets `cardDirty[fileId] = true/false` accordingly
- Dirty files show a "modified" badge in the card header

### Save (⌘S)

1. `App.tsx` dispatches `window.dispatchEvent(new CustomEvent("codorum:save"))` on `⌘S`
2. Active, dirty `FileCard` listens for this event
3. Calls `invoke("save_file", { id: file.id, content })`
4. On success: `setCardDirty(file.id, false)` + toast "Saved"

### Editability

Editors are editable only when: `isActive && !file.deleted`. Deleted files render as read-only.

### External Content Sync

```typescript
// In FileCard render phase (synchronous):
if (file.content !== trackedContent) {
  setContent(file.content);
  setTrackedContent(file.content);
  setCardDirty(file.id, false);
}
```

This ensures editors remount with correct content when file changes externally (via `_rev` key).

---

## 15. File Create (New File)

**Component**: `CommandPalette.tsx`

### Flow

1. Select "New File in {group}" from palette
2. Palette enters filename input mode (`newFileTarget` state set)
3. User types filename (default extension `.md` if none provided)
4. Press Enter:
   - **Folder-backed group**: `invoke("create_file", { dir: group.sourcePath, name })` directly
   - **User tab (no path)**: Opens native save dialog via `@tauri-apps/plugin-dialog`
5. Created file added to `files[]` and appended to group's `fileIds`
6. `openFile(created.id)` — activates the new file
7. Toast: "{filename} created"

### Escape Behaviour

- If in filename input mode: exits back to command list
- If in command list: closes palette entirely

---

## 16. Tab Management

**Store**: `app-store.ts` — `createTab()`, `removeGroup()`, `renameGroup()`

### Create Tab

```
createTab(name):
  1. Generate UUID id
  2. Push { id, name, collapsed: false, fileIds: [] } to groups
  3. Set drawerOpen[id] = true
  4. Return id (for rename trigger)
```

Triggered from:
- Sidebar "+" button → creates "Untitled" tab, enters rename mode
- Command palette "Create Tab" → creates "Untitled", dispatches `codorum:rename-tab` event

### Remove Tab

- **User tabs** (no `sourcePath`): `removeGroup(id)` — files move to Loose
- **Folder-backed**: `removeGroupAndFiles(id)` + `invoke("remove_files")` — removes files from app

### Reorder Groups

`reorderGroups(groupIds)` — reorders `groups` array by provided ID list.

---

## 17. Group Rename

**Component**: `Sidebar.tsx` (DrawerSection)

### Triggers

| Trigger | Flow |
|---|---|
| Double-click drawer header | `onStartRename()` → `setRenamingGroupId(group.id)` |
| "Create Tab" command | Dispatches `codorum:rename-tab` custom event → Sidebar listens and sets renaming state |

### Rename UI

- Drawer title replaced with `<input>` pre-filled with current name
- Input auto-focused and selected via `setTimeout(() => ref.focus(); ref.select(), 30)`
- Commit on: **Enter** key or **blur** event
- Cancel on: **Escape** key (reverts to original name)

### Commit Logic

```
commitRename():
  trimmed = value.trim()
  if (trimmed && trimmed !== title) → renameGroup(groupId, trimmed)
  else → onFinishRename(title)  // keep old name
```

---

## 18. Toast Notifications

**Store**: `src/stores/toast-store.ts`

### Toast Type

```typescript
interface Toast {
  id: string;
  text: string;      // Bold primary text
  detail: string;    // Muted secondary text
  color: "cyan" | "rose" | "amber";
  exiting: boolean;  // Animation state
}
```

### Colour Mapping

| Colour | CSS Variable | Usage |
|---|---|---|
| `cyan` | `var(--accent-cyan)` / `var(--ac)` | General actions (save, add, update) |
| `amber` | `var(--accent-amber)` / `var(--warn)` | Warnings (eject, already watching) |
| `rose` | `var(--accent-rose)` / `var(--danger)` | Destructive (deleted) |

### Lifecycle

```
add(text, detail, color):
  1. Create toast with unique ID, exiting: false
  2. Start exit timer (2600ms):
     a. Set exiting: true → triggers toastOut animation
     b. After 150ms → remove from array
  3. Timer stored in timerMap for cancellation
```

### dismiss(id)

Manual early dismissal — cancels auto-timer, triggers exit animation immediately.

### Animation

- Entry: `toastIn` — 200ms slide-in from right with scale
- Exit: `toastOut` — 140ms slide-out to right with fade

### Rendering

`Toasts.tsx` renders `flex-direction: column-reverse` for newest-on-top stacking. Position: fixed bottom-right.

---

## 19. Resize Handle (Card Height)

**Component**: `ResizeHandle.tsx`

### Visibility

- Only rendered when card is expanded (`!isCollapsed`)
- Hidden by default (`opacity: 0`), shows on hover with 150ms fade

### Drag Resize

```
onMouseDown:
  1. Record startY = event.clientY
  2. Record startHeight = bodyRef.current.offsetHeight
  3. Add mousemove listener:
     newHeight = max(80, startHeight + (clientY - startY))
     onResize(newHeight)  → setCardHeight(fileId, height)
  4. Add mouseup listener: clean up
```

### Reset

Double-click the handle → `onReset()` → `setCardHeight(fileId, null)` — removes custom height, card returns to natural sizing.

### Persistence

`cardHeights` map is persisted — manual card sizes survive app restart.

---

## 20. Keyboard Shortcuts

**Component**: `App.tsx` (global keydown), `CommandPalette.tsx` (palette-specific)

### Global Shortcuts

| Shortcut | Condition | Action |
|---|---|---|
| `⌘K` / `Ctrl+K` | Always | Toggle command palette |
| `⌘S` / `Ctrl+S` | Always | Dispatch `codorum:save` event (active card handles it) |
| `⌘A` / `Ctrl+A` | Not editing | `selectAll()` |
| `⌘T` / `Ctrl+T` | — | Cycle theme (handled in CommandPalette) |
| `Delete` / `Backspace` | Not editing, selection exists | `ejectSelected()` + `invoke("remove_files")` |
| `Delete` / `Backspace` | Not editing, no selection, active file | Remove active file |
| `Escape` | Not editing | `clearSelection()` |

### Editing Guard

All destructive shortcuts check `isEditing` to avoid triggering while user is typing in an editor, input, or CodeMirror.

### Command Palette Shortcuts

| Key | Action |
|---|---|
| `↑` / `↓` | Navigate items |
| `Enter` | Execute selected |
| `Escape` | Close (or exit filename mode) |

---

## 21. Context Menu

**Component**: `App.tsx`

### Implementation

```typescript
useEffect(() => {
  const handler = (e: MouseEvent) => {
    e.preventDefault();
    useCommandStore.getState().toggle();
  };
  window.addEventListener("contextmenu", handler);
  return () => window.removeEventListener("contextmenu", handler);
}, []);
```

Right-click anywhere in the app → prevents default browser menu → opens command palette.

---

## 22. Scroll-Linked Active File

**Component**: `ContentPane.tsx`

### IntersectionObserver Setup

```typescript
new IntersectionObserver(callback, {
  root: scrollContainer,
  rootMargin: "-10% 0px -70% 0px",  // Top 20% of viewport
  threshold: 0,
});
```

### Behaviour

- Observes all file card elements by ID
- As user scrolls, the topmost visible card becomes active
- **Programmatic scroll guard**: When clicking a sidebar item triggers `scrollIntoView()`, observer is paused via `programmaticScroll.current = true` to prevent feedback loop
- Guard resets on `scrollend` event (with 800ms fallback timeout)

---

## 23. Hover-to-Activate

**Component**: `FileCard.tsx`

### Implementation

```typescript
onMouseEnter={() => {
  if (!isActive) {
    hoverTimer.current = setTimeout(onActivate, 500);
  }
}}
onMouseLeave={() => {
  if (hoverTimer.current) {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }
}}
```

Hovering over a non-active card for 500ms activates it. Moving away cancels the timer.

---

## 24. Animated Background

**CSS**: `src/styles/app.css`

### Implementation

Each theme defines `--bg-gradient` with 2-3 radial gradients:

```css
--bg-gradient: radial-gradient(circle at 20% 0%, rgba(94,92,230,.5) 0%, transparent 50%),
               radial-gradient(circle at 80% 100%, rgba(10,132,255,.5) 0%, transparent 50%),
               radial-gradient(circle at 50% 50%, rgba(255,69,58,.3) 0%, transparent 50%);
```

Applied to a full-screen div behind the UI layer:

```css
.bg-grad {
  filter: blur(80px) saturate(1.5);
  background-size: 200% 200%;
  animation: gradientBG 15s ease infinite;
}

@keyframes gradientBG {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

GPU-composited via `filter` (runs on compositor thread). Each theme has different gradient colours that swap on theme change with a 600ms transition.

---

## 25. Eye Blink Logo

**CSS**: `src/styles/app.css`

### SVG Structure

```xml
<circle class="eye-iris" .../>    <!-- Pupil dot -->
<rect class="eye-lid" .../>      <!-- Eyelid covering eye -->
```

### Animations

```css
.eye-lid {
  transform-origin: center;
  animation: eyeBlink 6s ease-in-out infinite;
}
@keyframes eyeBlink {
  0%, 42%, 50%, 100% { transform: scaleY(0); }  /* Open */
  44%, 48%            { transform: scaleY(1); }  /* Closed */
}

.eye-iris {
  animation: eyeLook 6s ease-in-out infinite;
}
@keyframes eyeLook {
  0%, 40%, 50%, 100% { transform: translateX(0); }
  42%, 48%           { transform: translateX(2px); }  /* Glance right */
}
```

The eye blinks briefly at 44-48% of the 6s cycle, and the iris shifts slightly right during the blink.

---

## 26. Persistence

**Mechanism**: Zustand `persist` middleware with `localStorage` key `"codorum-state"`.

### Persisted

| Field | Why |
|---|---|
| `theme` | Remember user's preferred theme |
| `savedFilePaths` | Restore watched files on app restart |
| `groups` | Preserve tab structure |
| `drawerOpen` | Remember which drawers are expanded |
| `sortBy` | Remember sort preference |
| `searchMode` | Remember search mode preference |
| `cardCollapsed` | Remember card expansion state |
| `cardHeights` | Remember manual resize heights |

### NOT Persisted

| Field | Why |
|---|---|
| `files` | Re-read from disk on startup via `restore_files` |
| `activeFileId` | Fresh start each session |
| `selectedIds` | Selection is ephemeral |
| `search` | Search query is ephemeral |
| `cardDirty` | Dirty state resets on restart |

### Startup Restore

```
App.tsx useEffect:
  1. Read savedFilePaths from store
  2. invoke("restore_files", { saved: savedFilePaths })
  3. setFiles(restored)
  4. Toast: "{N} file(s) restored"
```

---

## 27. File Type Detection & Rendering

**Component**: `FileCard.tsx`

### Detection

```typescript
const MARKUP_EXTS = ["md", "markdown", "mdx"];
const CODE_EXTS = ["ts", "tsx", "js", "jsx", "rs", "py", "go", "c", "cpp", ...]; // ~30 extensions
```

### Rendering Matrix

| Mode | Extension | Editor | Features |
|---|---|---|---|
| `markdown` | md, markdown, mdx | `TiptapEditor` | WYSIWYG, slash commands (`/`), bubble menu (select text), floating menu, tables, task lists, mermaid diagrams, images, code blocks with syntax highlighting (lowlight) |
| `code` | ts, tsx, js, css, rs, py, go, json, yaml, html, sql, sh, ... | `CodeEditor` | CodeMirror 6, language-specific syntax highlighting, line numbers |
| `text` | everything else | `<textarea>` | Auto-sizing, monospace, plain text |

### Editor Editability

- Only the **active** file's editor is editable
- **Deleted** files are always read-only
- Condition: `editable={isActive && !file.deleted}`

---

## 28. Extension Color Dots

**Component**: `ExtDot.tsx`

### Color Map

| Extension | CSS Variable | Visual Colour |
|---|---|---|
| md, markdown, mdx | `var(--ac)` | Blue (n01z), Green (phosphor) |
| ts, tsx | `var(--ac2)` | Purple/Indigo |
| rs | `var(--danger)` | Red |
| css, scss, py, yaml, yml, toml | `var(--ac3)` | Green |
| js, jsx, json | `var(--warn)` | Orange/Yellow |
| html | `var(--danger)` | Red |
| go | `var(--ac)` | Blue |
| Unknown | `var(--tx3)` | Muted grey |

### Sizes

- Sidebar file rows: `size={6}` (6px)
- Card headers: `size={7}` (default, 7px)

---

## 29. Diff Badges

**Component**: `DiffBadge.tsx` (shared)

### Display

Shows `+N` in green (`var(--ac3)`) and `−N` in red (`var(--danger)`) next to file entries.

### Locations

- **Sidebar drawer header**: Aggregated total for all files in group
- **Sidebar file row**: Per-file `linesAdded` / `linesRemoved`
- **Card header**: Per-file stats

### Calculation

Simple line-set diff computed on `file-changed` event:

```typescript
const oldSet = new Set(oldLines);
const newSet = new Set(newLines);
let added = 0, removed = 0;
for (const line of newLines) { if (!oldSet.has(line)) added++; }
for (const line of oldLines) { if (!newSet.has(line)) removed++; }
```

---

## 30. Deleted File State

### Detection

Backend emits `file-removed` event when file is deleted from disk → sets `file.deleted = true`.

### Visual Treatment

| Location | Effect |
|---|---|
| Sidebar file name | `color: var(--deleted)`, `text-decoration: line-through` |
| Card header name | `color: var(--deleted)`, `text-decoration: line-through` |
| Card header | Shows "deleted" badge: `background: var(--hover)`, `color: var(--danger)` |

### Behaviour

- Deleted files remain visible in the UI (not auto-removed)
- Editors become read-only: `editable={isActive && !file.deleted}`
- Users can manually eject deleted files via Delete key or Eject bar

---

## 31. Pinned Files

### How It Works

- Files with `pinned: true` appear in the "Pinned" group (always first)
- Visual indicator: orange dot (`color: var(--warn)`) in card header
- `togglePin(id)` flips `file.pinned` and persists via `savedFilePaths`

### Drag Protection

Pinned section cannot be a drop target for inter-group drag:
```typescript
setDragOverSectionId(hitSection === "pinned" ? null : hitSection);
```

---

## Appendix: File Map

| File | Purpose |
|---|---|
| `src/App.tsx` | Root shell, global shortcuts, Tauri event listeners, drag-drop overlay |
| `src/stores/app-store.ts` | Primary Zustand store (persisted) — files, groups, selection, theme |
| `src/stores/toast-store.ts` | Toast queue with auto-dismiss timers |
| `src/stores/command-store.ts` | Command palette open/close toggle |
| `src/types/files.ts` | TypeScript interfaces (WatchedFile, FileGroup, etc.) |
| `src/utils/sortFiles.ts` | Sort utility for all three modes |
| `src/components/Toolbar.tsx` | Top bar — brand, file count, ⌘K button, theme button |
| `src/components/Sidebar.tsx` | File tree — search, sort, drawers, file rows, inter-group drag |
| `src/components/ContentPane.tsx` | Card stream — sections, IntersectionObserver scroll sync |
| `src/components/FileCard.tsx` | Individual file card — header, editor, resize, dirty tracking |
| `src/components/CommandPalette.tsx` | ⌘K overlay — commands, keyboard nav, new file creation |
| `src/components/EjectBar.tsx` | Bottom selection bar — eject/cancel buttons |
| `src/components/Toasts.tsx` | Notification stack renderer |
| `src/components/ExtDot.tsx` | Colour-coded extension indicator dot |
| `src/components/DiffBadge.tsx` | +N / −N diff stat display |
| `src/components/ResizeHandle.tsx` | Drag-to-resize card body height |
| `src/components/TiptapEditor.tsx` | TipTap WYSIWYG markdown editor |
| `src/components/CodeEditor.tsx` | CodeMirror 6 code editor |
| `src/components/SlashMenu.tsx` | TipTap slash command menu |
| `src/components/StatusBar.tsx` | Bottom sidebar status indicator |
| `src/components/ErrorBoundary.tsx` | React error boundary for editor crashes |
| `src/components/MermaidExtension.tsx` | TipTap mermaid diagram block |
| `src/styles/app.css` | All themes, animations, component styles, TipTap styles |
