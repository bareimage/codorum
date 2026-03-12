
![LOGO](https://github.com/user-attachments/assets/d06f4e61-8ab3-4993-a2b7-75231e30b74e)


# CODORUM
**Ordo Novus Codorum. The New Order of Coding.**

---

Hy folks, I have ADHD.

I'm highly functioning. Adapted. I've worked with it long enough to stop calling it a disorder and start calling it what it actually is — a different operating mode. Right now, while writing this, I'm running three parallel threads: a DSP architecture problem in C++, a documentation structure for a client project, and a flow arts sequence I want to drill later. Simultaneously. Not as a flex — just as a fact of how I work. The multi-track mind is the whole feature.

But there's a cost.

Clutter is genuinely hard for me. Not a preference — a problem. Physical clutter. File clutter. Even emotional clutter. All of it. I need to maintain rigid structures constantly, in every domain, just to keep the threads from tangling. And even then it doesn't always hold. Life moves fast, projects multiply, and the structures that were supposed to help start requiring maintenance of their own.

For files, I finally figured out something that works: **flat and simple, and nothing moves**. No elaborate folder hierarchies. No "I'll reorganize this later." Files live where they land, and I find them through search and observation, not navigation. The moment I start physically relocating things, I lose them — not because they're gone, but because my mental map of the project no longer matches reality, and that mismatch compounds every time I open the folder.

This already works badly with normal development. With AI agents, it gets brutal.

Agentic AI is fast. That's the whole point. But it also rewrites your files silently, hallucinates paragraphs into your spec docs, "tidies up" functions it shouldn't touch, and presents all of it with the confidence of someone who definitely knows what they're doing. You look away for twenty minutes and the project is technically the same but subtly wrong in ways that will take an hour to find.

I needed to see my files. Not in a terminal. Not by manually invoking a diff tool after something already broke. Just — watching, always, in plain language, right there.

So I built that.

---

### Ordo Novus Codorum

**CODORUM** is a file watcher and text editor organized around one idea: observation without overhead. You drop files in. It watches them. When something changes on disk — you, your editor, or an agent that just decided your README needed a "light rewrite" — you see it immediately. Diffs, line counts, the whole picture, no ceremony required.

The name is a phrase I made up: *Ordo Novus Codorum* — The New Order of Coding. The order isn't discipline in the military sense. It's structure that serves the work instead of fighting it. Flat, visible, honest. A tool that stays quiet until you need it, then shows you exactly what happened.

---

### Features

- **Drag & drop** files and folders into the watch list
- **Live file watching** — disk changes surface instantly with diff indicators
- **WYSIWYG Markdown editor** — Tiptap-based, because sometimes you want to fix it yourself
- **190+ syntax languages** — yes, including GLSL
- **Mermaid diagrams** — rendered inline
- **Multi-select & eject** — Ctrl+click, Shift+click, ⌘A, then remove what you're done with
- **Command Palette** — ⌘K or right-click, with glass blur because details matter
- **4 themes** — `n01z` (dark), `paper` (light), `phosphor` (terminal green), `ember` (warm dark)
- **State persistence** — remembers your files, theme, and layout. Unlike some tools in your pipeline, it has memory
- **Rename & delete tracking** — if a file moves or disappears, you'll know

---

### Stack

Tauri v2 (Rust backend) + React + TypeScript + Zustand. Native macOS, signed and notarized. 5MB.

### Install

Grab the DMG from [Releases](https://github.com/bareimage/codorum/releases). Drag to Applications. Done.

### Build from source

```bash
npm install
npm run tauri build
```

---

### Philosophy

The multi-track mind works best when the environment is honest. CODORUM doesn't reorganize your project. It doesn't have opinions about your folder structure. It just shows you what's true — what changed, when, in a form you can read without decoding it first.

Trust, but verify. Especially verify.

---

*Made by [bareimage](https://github.com/bareimage) — a human, with mass and volume and trust issues.*
