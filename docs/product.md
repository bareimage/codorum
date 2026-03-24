# Codorum - Product Documentation

## Overview
Codorum is a desktop text and markdown file watcher designed to provide immediate, transparent visibility into file changes on disk. Built for users who want to explicitly track modifications—especially those made by AI or background processes—Codorum ensures no silent rewrites go unnoticed. It functions as a security camera for your codebase and text files.

## Features
- **Live File Watching:** Instantaneous detection and display of disk changes, including modifications, creations, renames, and deletions.
- **Drag & Drop Surveillance:** Easily start watching individual files or entire folders by dragging them into the application.
- **Dual Editing Experiences:**
  - **WYSIWYG Markdown Editor:** Powered by Tiptap for rich markdown editing with inline Mermaid diagram support and a slash command menu.
  - **Code Editor:** Powered by CodeMirror, intelligently supporting over 190 syntax languages.
- **Command Palette:** Quick actions accessible via `⌘K` or right-click, featuring Apple-style glass blur aesthetics for a native macOS feel.
- **Multi-select & Eject:** Manage watched files efficiently with selection modifiers (`Ctrl+click`, `Shift+click`, `⌘A`) and a straightforward ejection process when you're done watching them.
- **State Persistence:** Remembers watched files, pinned items, themes, and window layout across app restarts.
- **Themes:** Four distinct interfaces tailored to user preference: `n01z` (dark), `paper` (light), `phosphor` (green terminal style), and `ember` (warm dark).

## Architecture
Codorum employs a Tauri backend written in Rust for native OS integration and highly performant file system watching, paired with a React frontend built with TypeScript and Vite.

### Backend (Tauri / Rust)
- **Core State (`lib.rs`):** Manages a mutex-protected registry of watched files and the active watcher instance. Exposes Tauri commands (e.g., `add_files`, `drop_paths`, `save_file`, `refresh_file`, `toggle_pin`) that the frontend invokes to communicate with the OS.
- **File Watcher (`watcher.rs`):** Utilizes the `notify` crate to monitor file system events on a separate thread. It implements debouncing and advanced event correlation (especially handling macOS `FSEvents` peculiarities for renames Mode::Any) to accurately construct and emit `Changed`, `Removed`, and `Renamed` payloads to the frontend via Tauri's event system.

### Frontend (React / TypeScript)
- **State Management (Zustand):**
  - `app-store.ts`: Serves as the central nervous system, persisting watched files, pinned status, and UI layout preferences.
  - `command-store.ts`: Manages the visibility and context of the Command Palette.
  - `toast-store.ts`: Handles application-wide notification toasts.
- **Key Components:**
  - `Sidebar.tsx` & `FileCard.tsx`: Presents the list of watched files with real-time status indicators and handles file selection and ejection.
  - `ContentPane.tsx`: Dynamically routes the selected file to the appropriate editor based on its file extension.
  - `TiptapEditor.tsx` & `SlashMenu.tsx`: Delivers the rich markdown editing experience.
  - `CodeEditor.tsx` & `CodeView.tsx`: Delivers the syntax-highlighted code editing and viewing experience.
  - `CommandPalette.tsx`: The centralized, keyboard-first command interface for app navigation and file management.

## Tech Stack
- **Backend:** Rust, Tauri v2, `notify`
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React (icons)
- **State Management:** Zustand
- **Editors:** Tiptap (Markdown), CodeMirror (Source Code)
- **Diagrams:** Mermaid.js

## Getting Started
- **Pre-built binaries:** Download the `.dmg` from the GitHub Releases page and move it to your Applications folder.
- **Building from Source:**
  ```bash
  npm install
  npm run tauri build
  ```
