
![LOGO](https://github.com/user-attachments/assets/d06f4e61-8ab3-4993-a2b7-75231e30b74e)
# CODORUM

**Because you can't trust the machines.**

---

CODORUM is a desktop text/md file watcher for people who want to *actually see* what's happening to their text files. Markdown especially — because that's where the chaos lives.

You drop files in. You drop folders in. CODORUM watches them. When something changes on disk, you see it *immediately* — diffs, line counts, the whole crime scene. No mystery commits. No silent rewrites. No "I just tidied up your prose a little" surprises.

### Why does this exist?

Because AI will absolutely rewrite your entire file and act like nothing happened. It will delete a function and call it "cleanup." It will hallucinate a paragraph into your spec doc and present it with the confidence of a tenured professor. It will "improve" your shader code into something that compiles but produces a solid magenta rectangle.

CODORUM sits there, watching, like a paranoid security camera for your codebase.

---

## Features

- **Drag & drop** files and folders — they're now under surveillance
- **Live file watching** — changes on disk show up instantly with diff indicators
- **WYSIWYG Markdown editor** — Tiptap-based, because sometimes you want to fix things yourself
- **190+ syntax languages** — yes, including GLSL, because we write shaders and we're not sorry
- **Mermaid diagrams** — rendered inline, for when your markdown gets ambitious
- **Multi-select & eject** — Ctrl+click, Shift+click, ⌘A, then yeet files out when you're done watching them
- **Command Palette** — ⌘K or right-click, with Apple-style glass blur because we have taste
- **4 themes** — `n01z` (dark), `paper` (light), `phosphor` (green terminal for the paranoid), `ember` (warm dark)
- **State persistence** — remembers your files, theme, and layout across restarts. Unlike some AIs, it has memory
- **Rename & delete tracking** — if a file moves or disappears, you'll know

---

## Install

Grab the DMG from [Releases](https://github.com/bareimage/codorum/releases). Double-click. Drag to Applications. Done.

> **Requires macOS 11.0 (Big Sur) or later.**

---

## Usage

### Adding Files

| Method | How |
|---|---|
| **Drag & drop** | Drag files or folders directly onto the CODORUM window |
| **Command Palette** | Press `⌘K` → *Add Files* or *Add Folder* |
| **Right-click** | Right-click anywhere to open the Command Palette |

Dropping a **folder** creates a named group in the sidebar. All files inside the folder are added and watched together.

### Editors

CODORUM picks the right editor based on file type:

| File type | Editor | Features |
|---|---|---|
| `.md`, `.mdx`, `.markdown` | **Tiptap WYSIWYG** | Rich text, tables, task lists, code blocks with syntax highlighting, inline Mermaid diagrams, `/` slash-command menu |
| Source code (`.ts`, `.rs`, `.py`, `.go`, `.cpp`, `.glsl`, …) | **CodeMirror 6** | 190+ languages, syntax highlighting, line numbers |
| Everything else | **Plain textarea** | Unformatted text |

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` | Open Command Palette |
| `⌘S` | Save active file |
| `⌘A` | Select all files (when not in an editor) |
| `Delete` / `Backspace` | Eject selected files (when not in an editor) |
| `Escape` | Clear file selection |
| `Ctrl+click` | Add/remove a single file from selection |
| `Shift+click` | Select a range of files |
| Right-click | Open Command Palette |

### Slash Commands (Markdown Editor)

Type `/` inside the Tiptap editor to insert blocks:

`/heading` · `/code` · `/bullet` · `/ordered` · `/task` · `/quote` · `/table` · `/mermaid` · `/divider` · `/image`

### Themes

| Theme | Description |
|---|---|
| `n01z` | Dark, cyan/violet accents — the default |
| `paper` | Light theme |
| `phosphor` | Green-on-dark terminal aesthetic |
| `ember` | Warm dark theme |

Cycle themes with the theme button in the toolbar or via *Change Theme* in the Command Palette.

### Diff Badges

Every file card shows a **diff badge** when the file changes on disk: `+N −N` lines. This resets when you save or re-open the file.

### Ejecting Files

CODORUM *watches* files — it doesn't own them. To stop watching a file, eject it:
- Select files (`Ctrl+click`, `Shift+click`, or `⌘A`), then press `Delete`/`Backspace`
- Or use the Eject Bar that appears at the bottom when files are selected

---

## Stack

| Layer | Technology |
|---|---|
| Desktop runtime | [Tauri v2](https://tauri.app) (Rust) |
| UI framework | React 19 + TypeScript |
| State management | Zustand |
| Markdown editor | Tiptap 3 |
| Code editor | CodeMirror 6 |
| Diagrams | Mermaid |
| Styling | Tailwind CSS v4 |
| Build tool | Vite 6 |

Native macOS app, signed & notarized. ~5 MB.

---

## Build from Source

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Xcode Command Line Tools | latest | `xcode-select --install` |
| Tauri CLI | v2 | installed automatically via `npm install` |

### Development

```bash
# 1. Install JS dependencies
npm install

# 2. Start the dev server (hot-reload frontend + native window)
npm run tauri dev
```

The dev window opens at `http://localhost:1420` inside a native macOS shell.

### Production Build

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/` — contains the signed `.app` and `.dmg`.

> **macOS signing**: The production build requires a valid *Developer ID Application* certificate in your keychain. Without it, remove the `signingIdentity` from `src-tauri/tauri.conf.json` or the build will fail.

### Frontend Only (no native window)

```bash
npm run build      # TypeScript compile + Vite bundle → dist/
npm run preview    # Preview the built frontend in a browser
```

---

## Architecture

```
CODORUM
├── Frontend  (React + TypeScript, src/)
│   ├── App.tsx              — event wiring, keyboard/drag-drop handlers
│   ├── components/          — UI components (Sidebar, ContentPane, FileCard, …)
│   ├── stores/              — Zustand state (app-store, toast-store, command-store)
│   ├── types/               — TypeScript interfaces
│   └── utils/               — helper functions (sort, etc.)
│
└── Backend  (Rust + Tauri v2, src-tauri/src/)
    ├── lib.rs               — Tauri commands (save, read, watch, create, restore)
    └── watcher.rs           — FSEvents/inotify watcher with rename correlation
```

### IPC Commands (Frontend → Backend)

| Command | Description |
|---|---|
| `drop_paths` | Process drag-dropped files/folders, start watching |
| `add_files` | Open file picker, add selected files |
| `add_directory` | Open folder picker, add all files inside |
| `save_file` | Write file content to disk |
| `refresh_file` | Re-read file content and mtime from disk |
| `create_file` | Create a new file in a watched directory |
| `restore_files` | Reload persisted file list on startup |
| `remove_file` | Stop tracking a single file |
| `remove_files` | Stop tracking multiple files |
| `toggle_pin` | Pin/unpin a file to the top of the sidebar |

### Tauri Events (Backend → Frontend)

| Event | Payload | Description |
|---|---|---|
| `file-changed` | `string` (path) | File content changed on disk |
| `file-removed` | `string` (path) | File was deleted or moved away |
| `file-renamed` | `{ old_path, new_path, new_name, new_extension }` | File was renamed |

### State Persistence

The following state is saved to `localStorage` and restored on next launch:

- Watched file paths and pinned status
- Active groups (name, member files, collapsed state)
- Selected theme
- Sort order
- Sidebar drawer open/closed states
- Search mode (filename vs. content)
- Per-card collapsed and height preferences

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Philosophy

Trust, but verify. Especially verify.

---

*Made by [bareimage](https://github.com/bareimage) — a human, with mass and volume and trust issues.*
