# CODRUM/MDStalker — Migration & Upgrade Strategy

> Incremental migration plan from current state to professional-quality UI. No rewrites.

---

## 1. Core Principle: Incremental, Not Rewrite

The Electron main process, IPC layer, file watching, state management, theme system, and markdown pipeline are **solid**. Do not touch them. Upgrade the renderer layer piece by piece, validating at each step.

### What to Keep (do not touch)

| System | Why It's Good |
|--------|---------------|
| Main process (WatchManager, FileWatcher, IPC) | Clean separation, debounced, well-structured |
| Preload bridge | Context isolation, correct API surface |
| Shared types (types.ts, file-types.ts, result.ts) | Readonly interfaces, comprehensive file detection |
| Theme definitions (6 themes, 55 properties) | Good coverage, will bridge to Tailwind |
| anime.js animations (8 functions) | Purposeful, well-tuned, not overused |
| Zustand stores (app-store, theme-store) | Simple, correct, right abstraction level |
| Markdown pipeline (unified + remark) | Unique, works well, custom AST extensions |

---

## 2. Migration Phases

### Phase A: Foundation (No Visual Changes)

**Goal:** Add Tailwind CSS and resizable panels without breaking anything visible.

#### A1. Add Tailwind CSS

```bash
npm install -D tailwindcss @tailwindcss/vite
```

**Files to create:**
- `tailwind.config.ts` — map existing 55 CSS variables to Tailwind theme

```typescript
// Example: bridge CSS vars to Tailwind
theme: {
  extend: {
    colors: {
      bg: {
        deep: 'var(--bg-deep)',
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        hover: 'var(--bg-hover)',
      },
      text: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
      },
      accent: {
        cyan: 'var(--accent-cyan)',
        violet: 'var(--accent-violet)',
        mint: 'var(--accent-mint)',
        amber: 'var(--accent-amber)',
        rose: 'var(--accent-rose)',
      },
      // ... all 55 properties
    },
    fontFamily: {
      mono: 'var(--font-mono)',
      body: 'var(--font-body)',
    },
    borderRadius: {
      theme: 'var(--corner-radius)',
    },
  },
}
```

**Files to modify:**
- `src/renderer/styles/global.css` — add `@tailwind base; @tailwind components; @tailwind utilities;`
- Vite config — add Tailwind plugin

**Validation:** App looks identical. Tailwind classes available but not yet used.

#### A2. Add react-resizable-panels

```bash
npm install react-resizable-panels
```

**Files to modify:**
- `src/renderer/App.tsx` — wrap Sidebar + ContentPane in `PanelGroup`
- `src/renderer/components/layout/Sidebar.tsx` — remove fixed `width: 260`, wrap in `Panel`

```tsx
// App.tsx change (conceptual)
<PanelGroup direction="horizontal">
  <Panel defaultSize={20} minSize={15} maxSize={40} collapsible>
    <Sidebar />
  </Panel>
  <PanelResizeHandle />
  <Panel>
    <ContentPane />
  </Panel>
</PanelGroup>
```

**Validation:** Sidebar resizes by dragging. Collapse/expand works.

#### A3. Add Development Tooling

```bash
npm install -D vitest @testing-library/react prettier
```

**Files to create:**
- `vitest.config.ts`
- `.prettierrc`

**Validation:** `npm test` runs (even with zero tests). Prettier formats code.

---

### Phase B: Component Upgrade (Gradual Visual Improvement)

**Goal:** Replace hand-rolled components with shadcn/ui, migrate inline styles to Tailwind.

#### B1. Install shadcn/ui

```bash
npx shadcn@latest init
```

This scaffolds:
- `components.json` — shadcn config
- `src/renderer/components/ui/` — component source directory
- Updates `tailwind.config.ts` with shadcn's design tokens

#### B2. Add Core Components

```bash
npx shadcn@latest add button input dialog tooltip context-menu scroll-area
```

**Files to modify (per component migration):**

| Current | Replace With | Key File |
|---------|-------------|----------|
| `<button style={...}>` (inline) | `<Button variant="ghost">` | Throughout sidebar, toolbar |
| Manual hover handlers | Tailwind `hover:bg-bg-hover` | WatchedFileRow, buttons |
| No focus rings | shadcn `focus-visible:ring` | All interactive elements |

#### B3. Migrate Sidebar Components

**Files to modify:**
- `src/renderer/components/sidebar/WatchedFileRow.tsx`
  - Replace inline `style={}` with Tailwind classes
  - Replace `onMouseEnter`/`onMouseLeave` with `hover:` utilities
  - Add `focus-visible:` ring for keyboard navigation
- `src/renderer/components/sidebar/FileList.tsx`
  - Add Radix `ScrollArea` for better scrolling
  - Add keyboard navigation (arrow keys, Enter to select)
- `src/renderer/components/sidebar/SidebarHeader.tsx`
  - Replace hand-rolled buttons with shadcn `Button`
- `src/renderer/components/sidebar/SelectionBar.tsx`
  - Replace with shadcn `Button` + `Badge`

#### B4. Add Context Menus

```bash
npx shadcn@latest add context-menu dropdown-menu
```

**Files to modify:**
- `src/renderer/components/sidebar/WatchedFileRow.tsx` — right-click context menu (Remove, Reveal in Finder, Copy Path)
- `src/renderer/components/layout/Toolbar.tsx` — dropdown for view mode, theme selector

#### B5. Add Error Boundaries

**Files to create:**
- `src/renderer/components/ErrorBoundary.tsx`

**Files to modify:**
- `src/renderer/App.tsx` — wrap ContentPane and Sidebar in boundaries

**Validation:** Components use shadcn. Hover/focus states work via Tailwind. Context menus function. Error boundaries catch render errors.

---

### Phase C: Editor Upgrade

**Goal:** Replace textarea + highlight.js with CodeMirror 6 for code files.

#### C1. Install CodeMirror 6

```bash
npm install @codemirror/state @codemirror/view @codemirror/language \
  @codemirror/commands @codemirror/search @codemirror/autocomplete \
  @codemirror/lang-javascript @codemirror/lang-python @codemirror/lang-css \
  @codemirror/lang-html @codemirror/lang-json @codemirror/lang-markdown \
  @codemirror/lang-rust @codemirror/lang-sql @codemirror/lang-xml \
  @codemirror/lang-yaml @codemirror/lang-cpp @codemirror/lang-java
```

#### C2. Create CodeMirror Wrapper

**Files to create:**
- `src/renderer/components/code/CodeMirrorEditor.tsx` — React wrapper component

Key integration points:
- Theme: Map CODRUM's 55 CSS variables to CodeMirror theme
- Save: Wire `Cmd+S` to existing save flow (dirty state → IPC → main process)
- Content sync: Two-way bind with `editContent` in Zustand store
- Language detection: Map `fileType.highlightLanguage` to CodeMirror language packages
- Extensions: bracket matching, auto-indent, line numbers, search (Cmd+F)

#### C3. Replace CodeFileRenderer

**Files to modify:**
- `src/renderer/components/layout/ContentPane.tsx` — swap `<CodeFileRenderer>` for `<CodeMirrorEditor>`
- `src/renderer/components/code/CodeFileRenderer.tsx` — deprecate (keep for fallback)

**Keep:**
- Inline markdown editing (MarkdownRenderer + EditableMultiline etc.) — this is unique and good
- highlight.js for markdown fenced code block previews (lighter than CodeMirror for read-only)

**Validation:** Code files open in CodeMirror. Tab, indent, bracket matching work. Save flow unchanged. Theme matches.

---

### Phase D: Layout System

**Goal:** Multi-tab editing with dockable panels.

#### D1. Install Dockview

```bash
npm install dockview
```

#### D2. Create Tab System

**Files to create:**
- `src/renderer/components/layout/DockLayout.tsx` — Dockview wrapper
- `src/renderer/components/layout/EditorTab.tsx` — individual tab content

**Files to modify:**
- `src/renderer/App.tsx` — replace single ContentPane with DockLayout
- `src/renderer/stores/app-store.ts` — add `openTabs: string[]`, `activeTabId: string | null`

#### D3. Layout Features

- Open multiple files in tabs (click in sidebar opens tab)
- Close tabs (X button, middle-click)
- Drag tabs to reorder
- Split view (drag tab to side to create split)
- Serialize layout state to electron-store (persist across sessions)

#### D4. Floating Panels (Optional)

- Popout panels for secondary views (file info, diff)
- Dockview supports this natively with Electron's multi-window

**Validation:** Multiple files open in tabs. Drag to split works. Layout persists across restart.

---

### Phase E: Professional Polish

**Goal:** Command palette, file tree, context menus, notifications, keyboard system.

#### E1. Command Palette

```bash
npx shadcn@latest add command
```

**Files to create:**
- `src/renderer/components/CommandPalette.tsx`

Features:
- `Cmd+K` to open (already wired in `useKeyboard`)
- Search files by name (fuzzy)
- Switch theme
- Toggle view mode
- Run commands (save, close tab, reload)

#### E2. File Tree View

**Files to create:**
- `src/renderer/components/sidebar/FileTree.tsx`

Replace flat FileList with tree:
- Group files by directory
- Collapsible folder nodes
- Indent nested files
- Keep existing selection behavior

#### E3. Breadcrumb Navigation

**Files to modify:**
- `src/renderer/components/layout/Toolbar.tsx` — add breadcrumb showing `folder / subfolder / file.md`

#### E4. Notification Toasts

```bash
npx shadcn@latest add toast
```

Replace silent save operations with visible feedback:
- Save success: "Saved file.md"
- External change: "file.md changed externally"
- Error: "Failed to save — permission denied"

#### E5. Keyboard Shortcut System

**Files to modify:**
- `src/renderer/hooks/use-keyboard.ts` — expand to cover all shortcuts
- Add visual hints (show shortcut in tooltips, command palette, menu items)

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `Cmd+S` | Save |
| `Cmd+W` | Close tab |
| `Cmd+Z` / `Cmd+Shift+Z` | Undo / Redo |
| `Cmd+\` | Toggle sidebar |
| `Cmd+Shift+E` | Focus file list |
| `Up/Down` | Navigate file list |
| `Enter` | Open selected file |

**Validation:** Command palette works. File tree shows hierarchy. Toasts appear on actions. Keyboard shortcuts documented and functional.

---

## 3. What Gets Replaced

| Current | Replace With | Phase | Why |
|---------|-------------|-------|-----|
| 90% inline styles | Tailwind CSS classes | A/B | hover/focus/active states, maintainability |
| Fixed 260px sidebar | react-resizable-panels | A | User-controlled layout |
| Hand-rolled buttons | shadcn/ui Button | B | Accessible, themeable, consistent |
| Manual hover handlers | Tailwind `hover:` | B | Cleaner, more states |
| No focus management | Radix focus trapping | B | Accessibility |
| No context menus | shadcn ContextMenu | B | Right-click interactions |
| No error boundaries | React ErrorBoundary | B | Graceful error recovery |
| textarea + highlight.js | CodeMirror 6 | C | Multi-cursor, bracket matching, extensions |
| Single file view | Dockview tabs | D | Multi-file editing |
| Flat file list | Tree view | E | Folder hierarchy |
| No command palette | shadcn Command | E | Quick actions, file switching |
| Silent operations | Toast notifications | E | User feedback |

---

## 4. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tailwind conflicts with existing CSS vars | Low | Medium | Bridge vars to Tailwind theme; coexist during migration |
| shadcn components don't match terminal aesthetic | Low | Medium | Full source control — customize heavily |
| CodeMirror bundle size (~93kB) | Low | Low | Lazy load, only for code files |
| Dockview complexity | Medium | Medium | Add after core components stabilized (Phase D, not A) |
| Migration breaks existing features | Medium | High | Add Vitest tests before migration; validate each phase |
| Inline style → Tailwind migration tedious | High | Low | Do incrementally per component, not big-bang |
| Vite + Tailwind + Electron config issues | Medium | Medium | Known working configs exist; shadcn has Vite templates |

---

## 5. Estimated Scope per Phase

| Phase | Components Touched | New Dependencies | Complexity |
|-------|--------------------|------------------|------------|
| A: Foundation | 3-4 files | tailwindcss, react-resizable-panels, vitest | Low |
| B: Components | 10-15 files | shadcn/ui, @radix-ui/* | Medium |
| C: Editor | 3-5 files | @codemirror/* (12+ packages) | Medium-High |
| D: Layout | 5-8 files | dockview | High |
| E: Polish | 8-12 files | (shadcn sub-components) | Medium |

**Each phase is independently deployable.** You can ship after any phase and still have a working app.

---

## 6. Phase A — Specific File Changes

This is the first phase to implement. Here are the exact files:

### New Files
```
tailwind.config.ts          — Tailwind config with CSS var bridge
postcss.config.js           — PostCSS config for Tailwind
vitest.config.ts            — Test runner config
.prettierrc                 — Code formatter config
```

### Modified Files
```
package.json                — Add tailwindcss, postcss, autoprefixer,
                              react-resizable-panels, vitest, prettier
src/renderer/styles/global.css  — Add @tailwind directives at top
src/renderer/App.tsx            — Wrap sidebar+content in PanelGroup
src/renderer/components/layout/Sidebar.tsx — Remove fixed width: 260
```

### Validation Checklist
- [ ] `npm run dev` starts without errors
- [ ] App looks identical to current state
- [ ] Sidebar can be resized by dragging
- [ ] Sidebar can be collapsed
- [ ] Tailwind classes work when applied to any element
- [ ] `npm test` runs (even with zero tests)
- [ ] All 6 themes still work correctly
- [ ] File watching, selection, editing unchanged
