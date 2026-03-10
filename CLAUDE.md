# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development

```bash
npm run tauri dev       # Dev mode: Vite HMR (port 1420) + Rust backend + desktop window
npm run tauri build     # Production: tsc + vite build + Rust release binary
npx tsc --noEmit        # Type-check frontend only
cargo build --manifest-path src-tauri/Cargo.toml  # Build Rust backend only
```

Tauri's `beforeDevCommand` runs `npm run dev` (Vite) automatically. The Rust backend recompiles on changes to `src-tauri/src/`.

## Architecture

**Tauri v2 desktop app**: Rust backend for filesystem operations, React frontend for UI.

```
React (Vite + TypeScript)  ←→  invoke() / listen()  ←→  Rust (Tauri v2)
       UI + State                    JSON IPC                fs, dialogs, watcher
```

### Rust Backend (`src-tauri/src/`)

- **lib.rs**: `AppState` holds `Mutex<Vec<WatchedFile>>` + `Mutex<FileWatcherManager>`. All Tauri commands (`#[tauri::command]`) defined here: `get_files`, `select_file`, `save_file`, `remove_file`, `add_files`, `add_directory`, `drop_paths`, `toggle_pin`.
- **watcher.rs**: `FileWatcherManager` wraps the `notify` crate. Emits `"file-changed"` Tauri events to the frontend on fs Modify/Create.
- Plugins: `tauri-plugin-dialog` (native file pickers), `tauri-plugin-fs` (filesystem access).
- Capabilities defined in `src-tauri/capabilities/default.json`.

### React Frontend (`src/`)

- **State**: Two Zustand stores in `src/stores/`. `app-store.ts` manages files, tabs, selection, theme. `toast-store.ts` manages transient notifications with auto-dismiss.
- **IPC**: `invoke<T>(command, args)` calls Rust commands. `listen<T>(event, handler)` subscribes to Rust-emitted events.
- **ContentPane** routes files by extension: `.md/.markdown/.mdx` → TiptapEditor (WYSIWYG), code files → CodeView (highlight.js + line numbers), text → raw textarea.
- **TiptapEditor**: ProseMirror-based (via `@tiptap/react`). Extensions: StarterKit, TaskList, Table, CodeBlockLowlight (syntax highlighting), Typography, Link, Highlight, Image, Markdown (tiptap-markdown for round-trip markdown). BubbleMenu for inline formatting, FloatingMenu for block types. `MermaidExtension` renders `mermaid` code blocks as SVG diagrams.
- **CommandPalette**: `⌘K` toggle. Has its own Zustand store (`useCommandStore`). Searches files, commands, themes.

### Theming

Four themes defined as CSS custom properties in `src/styles/app.css` under `[data-theme="..."]` selectors: `n01z` (dark default), `paper` (light), `phosphor` (green terminal), `ember` (warm dark). Theme switching sets `data-theme` attribute on `<html>`. highlight.js tokens also use CSS vars.

### Selection Model

Single click opens file. Ctrl/Cmd+click toggles selection. Shift+click selects range using `lastSelectedId` as anchor. Delete/Backspace ejects selected files. `⌘A` selects all.

## Key Conventions

- Components use inline styles for dynamic/theme values via `var(--token)`, Tailwind classes for layout.
- Custom CSS classes (`.tbtn`, `.sbtn`, `.sel-btn-*`) in `app.css` for interactive elements that need `:hover` states.
- Rust `WatchedFile` struct and TypeScript `WatchedFile` interface must stay in sync (serialized via serde).
- File IDs are UUIDs generated in Rust (`uuid::Uuid::new_v4()`).
- Window uses `titleBarStyle: "Overlay"` with `hiddenTitle: true` — toolbar has a 68px left spacer for macOS traffic lights.
