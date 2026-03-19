# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Vite dev server + Tauri (hot reload on port 1420)
npm run build            # TypeScript check + Vite production build
npm run tauri build      # Full macOS app build (signed DMG)
cargo check              # Quick Rust type-check (run from src-tauri/)
```

No test suite exists yet — verify changes manually via `npm run dev`.

## Architecture

Codorum is a **Tauri v2 desktop app** (Rust backend + React 19 frontend) that watches text/markdown files for changes. Think "security camera for your codebase."

### Backend (Rust) — `src-tauri/src/`
- **lib.rs**: Tauri commands (`save_file`, `drop_paths`, `add_files`, `remove_files`, `refresh_file`, `toggle_pin`, `restore_files`). Manages a mutex-protected `Vec<WatchedFile>` as the file registry.
- **watcher.rs**: `FileWatcherManager` wraps the `notify` crate, debounces events (250ms), and handles macOS FSEvents quirks (spurious rename events). Emits Tauri events: `file-changed`, `file-renamed`, `file-removed`.

### Frontend (React/TypeScript) — `src/`
- **State**: Zustand with persist middleware. Three stores:
  - `app-store.ts` — files, groups, selection, theme, layout (persisted to localStorage as `codorum-state`)
  - `command-store.ts` — palette open/close
  - `toast-store.ts` — notification queue
- **Editors**: Tiptap (markdown/mdx), CodeMirror (190+ languages), plain textarea (fallback). Selection logic in `FileCard.tsx` via `detectMode(extension)`.
- **IPC pattern**: `invoke()` for request/response commands, `listen()` for backend→frontend event streams. Cross-component signals use `window.dispatchEvent(new CustomEvent("codorum:save"))` etc.

### Key data flow
1. Files enter via drag-drop → `drop_paths` command → backend reads content, starts watcher
2. External changes → watcher thread → debounce → Tauri event → `updateFile()` in store → React re-render
3. User edits → local `content` state in FileCard → Cmd+S → `save_file` command → disk write
4. `updateFile()` bumps `file._rev` which is part of editor component keys, causing editor remount on external changes

## Critical CSS Rule

**Never translate mockup CSS to Tailwind utilities.** This has failed multiple times.

When a mockup HTML file exists:
1. Copy the CSS block **verbatim** into `src/styles/app.css`
2. Use those class names directly in JSX (`className="fc-h"`)
3. Custom classes and Tailwind v4 coexist naturally — no conflict

The single `app.css` file contains all themes, animations, and component styles. Themes are defined as `[data-theme="..."]` blocks with CSS custom properties (`--bg`, `--tx`, `--ac`, etc.). Four themes: `n01z` (dark default), `paper` (light), `phosphor` (green), `ember` (warm).

## Design Philosophy

Codorum is explicitly **ADHD-friendly**. Every UI decision should prioritize: clear visual hierarchy, minimal cognitive load, obvious state indicators, smooth non-jarring animations, no visual noise. Features should be collapsed/minimal by default, expandable on demand.

## Dev Environment Gotcha

Vite watches the project directory. If a user's watched file lives inside the project folder, saving it triggers a full page reload. `vite.config.ts` has `server.watch.ignored` patterns for `*.md`, `*.txt`, and `src-tauri/` to mitigate this — extend if needed for other extensions.

## Keyboard Shortcuts (App.tsx)

| Shortcut | Action | Context |
|---|---|---|
| Cmd+S | Save active file to disk | Always |
| Cmd+K / right-click | Command palette | Always |
| Cmd+A | Select all files | When not editing |
| Delete/Backspace | Eject selected/active file | When not editing |
| Escape | Clear selection | When not editing |
| L | Return to live view | When not editing (DockTimeline) |
| Arrow Left/Right | Scrub history snapshots | When not editing (DockTimeline) |
