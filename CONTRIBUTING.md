# Contributing to CODORUM

Thanks for your interest. CODORUM is a small, opinionated project — contributions are welcome as long as they fit the spirit of the thing (paranoid, lightweight, no surprises).

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| Rust | stable | `rustup update stable` |
| Xcode Command Line Tools | latest | `xcode-select --install` |

---

## Local Development

```bash
# Install JS dependencies
npm install

# Start dev mode — opens a native window with hot-reload
npm run tauri dev
```

The frontend dev server runs on `http://localhost:1420`. Tauri wraps it in a native macOS window. Frontend changes hot-reload instantly; Rust changes trigger a full recompile (takes ~10–30 s on first build, faster afterwards).

---

## Project Structure

```
codorum/
├── src/                        # React + TypeScript frontend
│   ├── App.tsx                 # Root component — event listeners, keyboard/drag-drop
│   ├── components/             # UI components
│   │   ├── Toolbar.tsx         # Top bar (branding, file count, ⌘K, theme toggle)
│   │   ├── Sidebar.tsx         # File list with groups, multi-select, search
│   │   ├── ContentPane.tsx     # Renders FileCard for each visible file
│   │   ├── FileCard.tsx        # Individual file card — header, diff badge, editor
│   │   ├── TiptapEditor.tsx    # WYSIWYG markdown editor (Tiptap)
│   │   ├── CodeEditor.tsx      # CodeMirror 6 code editor
│   │   ├── CommandPalette.tsx  # ⌘K command palette
│   │   ├── EjectBar.tsx        # Multi-select eject confirmation bar
│   │   └── ...                 # Supporting components (Icons, Toasts, SlashMenu, …)
│   ├── stores/
│   │   ├── app-store.ts        # Main Zustand store (files, groups, theme, selection)
│   │   ├── command-store.ts    # Command palette open/close state
│   │   └── toast-store.ts      # Toast notifications
│   ├── types/
│   │   └── files.ts            # TypeScript interfaces (WatchedFile, FileGroup, …)
│   ├── utils/
│   │   └── sortFiles.ts        # File sorting (name, modified, changes)
│   ├── data/
│   │   └── devils-dictionary.json  # Placeholder quotes for new markdown files
│   └── styles/
│       └── app.css             # Themes, component styles, Tailwind imports
│
├── src-tauri/                  # Rust backend (Tauri v2)
│   ├── src/
│   │   ├── lib.rs              # Tauri commands + AppState
│   │   ├── watcher.rs          # FSEvents/inotify file watcher with rename correlation
│   │   └── main.rs             # Entry point
│   ├── tauri.conf.json         # App config (window size, bundle targets, signing)
│   ├── Cargo.toml              # Rust dependencies
│   └── capabilities/
│       └── default.json        # Tauri permission declarations
│
├── index.html                  # Vite entry point
├── vite.config.ts              # Vite + Tailwind + Tauri dev host config
├── tsconfig.json               # TypeScript config
└── package.json                # JS dependencies and scripts
```

---

## Making Changes

### Frontend

The frontend is standard React + TypeScript. State lives in Zustand stores in `src/stores/`. Components are in `src/components/`.

**Adding a new action to the app store:**

1. Add the action signature to the store type in `app-store.ts`
2. Implement it in the `create()` call
3. Call it from the relevant component via `useAppStore()`

**Adding a new Tauri command call:**

1. Add the Rust command in `src-tauri/src/lib.rs`
2. Register it in the `invoke_handler!` macro at the bottom of `lib.rs`
3. Call it from the frontend with `invoke<ReturnType>('command_name', { ...args })`

### Backend (Rust)

The Rust side is intentionally minimal — it reads and writes files, watches directories, and emits events to the frontend. Heavy logic belongs in the frontend.

**Key types:**

- `WatchedFile` — the file record passed over IPC
- `AppState` — app-wide `Mutex<Vec<WatchedFile>>` + `FileWatcherManager`
- `FileEvent` — `Changed`, `Removed`, `Renamed` — emitted by the watcher thread

**File watcher behaviour:**

- Uses the `notify` crate (`RecommendedWatcher` → FSEvents on macOS, inotify on Linux)
- 250 ms debounce window — rapid bursts of events are collapsed
- Rename correlation: macOS FSEvents emits `Modify(Name(Any))` on *both* old and new paths; the watcher checks disk existence after debounce to pair them
- Linux/Windows fallback: correlates `Remove` + `Create` events in the same directory

---

## Code Style

- **TypeScript**: no `any`, prefer explicit types on function signatures
- **Rust**: `rustfmt` defaults, no `unwrap()` in command handlers (use `?` or `.ok()`)
- **CSS**: CSS custom properties for all theme-dependent colours (see `--bg`, `--ac`, etc. in `app.css`)
- Keep components focused — if a component is growing past ~300 lines, it's probably doing too much

---

## Submitting a PR

1. Fork the repo and create a branch (`git checkout -b my-feature`)
2. Make your changes
3. Run a quick sanity check:
   ```bash
   npm run build        # TypeScript + Vite — must succeed with no errors
   cargo check --manifest-path src-tauri/Cargo.toml   # Rust lint
   ```
4. Open a pull request with a clear description of *what* and *why*

---

## Things That Fit This Project

- Bug fixes
- Additional keyboard shortcuts or command palette actions
- New slash-menu commands for the Tiptap editor
- Performance improvements to file watching or diff calculation
- Additional syntax language support in CodeEditor
- Theme improvements

## Things That Probably Don't Fit

- Cloud sync, accounts, or any kind of network feature — CODORUM is intentionally local-only
- Mobile or web support — it's a native desktop app
- Auto-update mechanisms — keep it simple, grab a DMG from Releases

---

*CODORUM is built and maintained by [bareimage](https://github.com/bareimage).*
