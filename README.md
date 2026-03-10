# 👁️⃤ CODORUM

**Because you can't trust the machines.**

---

CODORUM is a desktop file watcher for people who want to *actually see* what's happening to their text files. Markdown especially — because that's where the chaos lives.

You drop files in. You drop folders in. CODORUM watches them. When something changes on disk, you see it *immediately* — diffs, line counts, the whole crime scene. No mystery commits. No silent rewrites. No "I just tidied up your prose a little" surprises.

### Why does this exist?

Because AI will absolutely rewrite your entire file and act like nothing happened. It will delete a function and call it "cleanup." It will hallucinate a paragraph into your spec doc and present it with the confidence of a tenured professor. It will "improve" your shader code into something that compiles but produces a solid magenta rectangle.

CODORUM sits there, watching, like a paranoid security camera for your codebase.

### Features

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

### Stack

Tauri v2 (Rust backend) + React + TypeScript + Zustand. Native macOS app, signed & notarized. 5MB.

### Install

Grab the DMG from [Releases](https://github.com/bareimage/codorum/releases). Double-click. Drag to Applications. Done.

### Build from source

```bash
npm install
npm run tauri build
```

### Philosophy

Trust, but verify. Especially verify.

---

*Made by [bareimage](https://github.com/bareimage) — a human, with mass and volume and trust issues.*
