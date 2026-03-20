# Changelog — gui-improvements

## Syntax Highlighting & Code Editor
- Per-theme syntax color palettes for all 4 themes (n01z, paper, phosphor, ember)
- Live theme switching — syntax colors update instantly when cycling themes
- Shader file support (.fs, .vs, .glsl, .frag, .vert) with C++ highlighting mode
- Line numbers and full CodeMirror editor for all recognized code files
- Fix: language support now applies correctly even if file was loaded before extension was registered

## File Type Icons
- Notion-style file type icons replace colored dots throughout the UI
- 30+ extension mappings (FileText for markdown, Braces for JS/JSON, Cog for Rust, Terminal for Python, etc.)
- Icons in sidebar file items, drag overlay ghost, and file card headers
- Icons inherit file type colors, active file gets subtle glow

## Drag & Drop
- Replaced custom drag system with @dnd-kit/react for reliable drag-and-drop
- Smooth anime.js stagger animations on drawer open and file card load
- Subtle drop target — soft background tint instead of harsh borders
- Better drag ghost overlay with file icon and name

## Help & Navigation
- Help modal (?) in toolbar with app description and keyboard shortcuts listing
- Background blurs with swirl animation when help is open
- Shift+Cmd+Up/Down to switch between file cards
- Reveal in Finder via command palette (right-click or Cmd+K)

## Editor & Save
- Replaced Tiptap with MDXEditor for markdown editing
- Bulletproof Cmd+S save via editor ref — works reliably across all editor modes
- Save history tracking persists across app restarts

## Timeline & History
- Dock timeline with scrubber for navigating file history snapshots
- Micro-timeline dots in sidebar and card headers showing change density
- Arrow Left/Right to scrub history, L to return to live view
- Full-context diff view with inline red/green highlighting
- Fix: diff no longer duplicates trailing content after added lines

## Backend
- Clean Rust architecture: registry, commands, snapshot, watcher modules
- Race condition elimination via suppression set for save-then-watch
- Debounced file watcher (250ms) with macOS FSEvents quirk handling
- CodorumError enum — no panics on lock failure

## UI Polish
- Removed scrubber handle, clickable dots, better section label alignment
- 4 themes: n01z (dark), paper (light), phosphor (green), ember (warm)
- ADHD-friendly: clear hierarchy, minimal cognitive load, smooth animations
