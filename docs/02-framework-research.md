# CODRUM/MDStalker — Framework Research

> Research findings for achieving a Figma-quality UI in an Electron + React desktop app.

---

## 1. Requirements for a Professional Desktop UI

What separates "half baked" from "Figma-quality":

| Requirement | Current State | Gap |
|-------------|---------------|-----|
| Resizable panels | Fixed 260px sidebar | No resize, no collapse |
| Dockable/draggable panels | Single pane layout | No tabs, no splits |
| Smooth 60fps animations | anime.js (good) | CSS transitions missing for hover/focus |
| Design tokens / theming | 55 CSS vars (good) | No systematic token system |
| Accessible components | Manual keyboard handling | No ARIA, no focus management |
| Dense information display | Adequate | Needs tighter spacing, better chrome |
| Professional interactions | Basic click handlers | No context menus, no command palette |

---

## 2. UI Component Libraries — Tier List

### Tier 1: Recommended for CODRUM

#### shadcn/ui + Radix UI

| Aspect | Detail |
|--------|--------|
| **Version** | v4.0.2 (March 2026) |
| **Stars** | ~109k (shadcn) / ~18.7k (Radix) |
| **Bundle** | Zero runtime — you copy source into project. Per-component ~sub-1kB |
| **Approach** | CLI copies component source code into your repo. Built on Radix primitives + Tailwind |

**Why it fits CODRUM:**
- Full code ownership — customize the terminal/hacker aesthetic without fighting a library
- Components are individually tiny (no unused code ships)
- Radix handles accessibility (keyboard nav, ARIA, focus trapping) — the biggest gap in CODRUM
- Tailwind pairs naturally with the existing CSS variable theme system
- 50+ components, extremely active community

**Trade-offs:**
- Requires Tailwind CSS (migration effort from inline styles)
- Vite config workaround needed (shadcn CLI looks for `vite.config` in root)
- Web/mobile-first design — needs styling to feel desktop-native
- Updates require re-running CLI or manual merge

#### Blueprint.js

| Aspect | Detail |
|--------|--------|
| **Version** | v6.9.1 (March 2026) |
| **Stars** | ~21.5k |
| **Bundle** | ~200-300kB (core). Not fully tree-shakeable |
| **Approach** | Pre-styled component library by Palantir, purpose-built for desktop |

**Why it fits CODRUM:**
- Only React library designed specifically for dense desktop/IDE UIs
- Includes components other libs lack: Tree, Table, HotkeysProvider, Breadcrumbs, ContextMenu
- Production-proven in Palantir products
- Built-in dark theme

**Trade-offs:**
- Opinionated visual design — looks like Blueprint, not your brand
- Large bundle
- Uses its own CSS system, not Tailwind-friendly
- Smaller community than shadcn/Mantine

---

### Tier 2: Strong Alternatives

#### Mantine

| Aspect | Detail |
|--------|--------|
| **Version** | v8.3.16 / v9.0 (March 2026) |
| **Stars** | ~30.8k |
| **Bundle** | Moderate, tree-shakeable. CSS Modules based |

**Strengths:** 100+ components, rich hooks library (useForm, useFocusTrap), Spotlight (command palette), notifications, rich text editor (Tiptap-based). Very comprehensive — less need for third-party components.

**For CODRUM:** Good if you want batteries-included. The Spotlight component is excellent for command palettes. But it's web-first, uses CSS Modules (not Tailwind), and the visual design is opinionated.

#### Ark UI

| Aspect | Detail |
|--------|--------|
| **Version** | v5.34.1 (March 2026) |
| **Stars** | ~5k |
| **Bundle** | Lightweight headless. Built on Zag.js state machines |

**Strengths:** 45+ headless components, state-machine driven for predictable behavior. More components than Radix (Combobox, TagsInput, ColorPicker). Multi-framework support.

**For CODRUM:** Strong alternative to Radix primitives. Fewer styled component sets built on top (no shadcn equivalent). Smaller community, newer.

---

### Tier 3: Not Recommended

| Library | Stars | Why Not for CODRUM |
|---------|-------|--------------------|
| MUI / Material UI | ~97k | Google Material design doesn't fit terminal/hacker aesthetic |
| Chakra UI | ~39k | Ark UI supersedes it; Chakra v3 in flux |
| NextUI | ~25k | SSR/Next.js focused, less suited for Electron desktop |
| Ant Design | ~95k | Enterprise-grade but CJK-focused design, enormous bundle |

---

## 3. Layout & Panel Management

### Dockview — Full Docking Layout Manager

| Aspect | Detail |
|--------|--------|
| **Version** | v5.1.0 (March 2026) |
| **Stars** | ~3.1k |
| **Bundle** | ~656kB unpacked, zero dependencies |

**What it does:** Complete docking system — tabs, splits, grids, drag-and-drop docking, floating panels, popout windows, layout serialization/deserialization.

**For CODRUM:** Exactly what VS Code / Figma uses for panel management. Popout window support is powerful for Electron. Layout persistence built in. But smaller community, API learning curve, and visual styling requires work.

### react-resizable-panels — Split Panels

| Aspect | Detail |
|--------|--------|
| **Version** | v4.7.2 (March 2026) |
| **Stars** | ~5.2k |
| **Bundle** | ~10-15kB gzipped |

**What it does:** Declarative panel groups with resize handles. Horizontal/vertical. Collapsible panels. Min/max constraints. Keyboard accessible. Layout persistence.

**For CODRUM:** Perfect for the immediate need (resizable sidebar). By Brian Vaughn (former React core team). 333k+ dependent projects. Used by shadcn/ui's `<Resizable>` component. Simple mental model. But only does split panels — no tabs, no docking, no floating.

### allotment — VS Code-Style Splits

| Aspect | Detail |
|--------|--------|
| **Version** | v1.20.x |
| **Stars** | ~1.2k |
| **Bundle** | ~30-50kB gzipped |

**What it does:** Split views derived from VS Code's source. Min/max sizes, snap-to-close.

**For CODRUM:** Authentic VS Code feel but much smaller community than react-resizable-panels (1.2k vs 5.2k stars, 113k vs 7.8M weekly downloads). Less actively maintained. react-resizable-panels has won this category.

### Verdict

```
Immediate:  react-resizable-panels  (resizable sidebar, simple)
Later:      Dockview                (multi-tab, docking, floating panels)
Skip:       allotment              (react-resizable-panels is better supported)
```

---

## 4. Code Editor Options

### CodeMirror 6

| Aspect | Detail |
|--------|--------|
| **Version** | Modular `@codemirror/*` packages (actively updated) |
| **Stars** | ~7.7k |
| **Bundle** | ~93kB gzipped (basic setup), ~124kB with full extensions |

**Key features:**
- Modular architecture — include only what you need
- Virtualized rendering (handles millions of lines)
- Lezer parser — fast, modern syntax highlighting
- Extensions: autocomplete, search, lint, folding, bracket matching
- Fully themeable to match any design system

**For CODRUM:**
- Much smaller than Monaco (~93kB vs ~5MB)
- Highly customizable — can match the terminal aesthetic
- Lezer parser is more accurate than highlight.js
- Active development by Marijn Haverbeke
- Steeper learning curve (modular = more assembly)
- No built-in IntelliSense or minimap

### Monaco Editor

| Aspect | Detail |
|--------|--------|
| **Version** | ~0.52.x |
| **Stars** | ~45.7k |
| **Bundle** | 5-10MB uncompressed, minimum ~2-4MB stripped |

**Key features:** VS Code's editor. IntelliSense, minimap, diff editor, find/replace, multi-cursor, bracket matching, 80+ languages.

**For CODRUM:** Feature-complete code editor out of the box. But enormous bundle (can be 40%+ of total app), hard to tree-shake, and dominates the UI. Overkill unless you want full IDE-level editing.

### Shiki — Read-Only Syntax Highlighting

| Aspect | Detail |
|--------|--------|
| **Version** | v4.0.1 (March 2026) |
| **Stars** | ~13k |
| **Bundle** | Core ~250kB, lazy-loadable. JS engine (no WASM) option |

**Key features:** TextMate grammar-based highlighting (same engine as VS Code). 200+ languages, 40+ themes. Lazy loading. Decorations/transformers API.

**For CODRUM:** VS Code-quality highlighting without Monaco's weight. Perfect for rendering fenced code blocks in markdown preview. Could replace highlight.js for more accurate coloring. But read-only only — not an editor.

### Verdict

```
Code editing:     CodeMirror 6    (replace textarea + highlight.js)
Markdown preview: Keep highlight.js or upgrade to Shiki (read-only blocks)
Skip:             Monaco          (too heavy for CODRUM's needs)
```

---

## 5. Canvas / Rich Rendering

### tldraw SDK

| Aspect | Detail |
|--------|--------|
| **Version** | v4.4.0 (February 2026) |
| **Stars** | ~45.7k |
| **Bundle** | 1-3MB+ (complete canvas framework) |

Infinite canvas engine with drawing tools, shapes, extensible systems. Has an official Electron desktop app. Overkill unless adding visual/canvas features.

### Others

| Library | What | Bundle | When to Use |
|---------|------|--------|-------------|
| Konva.js | 2D canvas, shapes as JSX | ~50kB | Visual previews |
| Fabric.js | Imperative canvas, mature | ~100kB | Image/design editing |
| PixiJS | WebGL renderer | ~150kB | Graphics-heavy features |

### Verdict

**Not needed for CODRUM's current scope** (text/code editor). Revisit only if adding diagram rendering, visual markdown preview, or image manipulation.

---

## 6. Recommendation Matrix

### Current Stack

```
Layout:     Fixed 260px sidebar + flex:1 content (inline styles)
Components: 36 hand-rolled React .tsx files
Editing:    textarea + highlight.js / contentEditable
Theming:    55 CSS custom properties, 6 themes
Animation:  anime.js v4 (8 functions)
Styling:    90% inline React styles, 4 CSS files
```

### Recommended Stack

```
Layout:     react-resizable-panels (splits) → Dockview (tabs/docking later)
Components: shadcn/ui + Radix primitives (accessible, themeable, owned source)
Editing:    CodeMirror 6 (code files) + keep inline editing (markdown)
Theming:    Tailwind CSS + CSS vars (design tokens bridged from existing 55 vars)
Animation:  Keep anime.js (purposeful, well-implemented)
Styling:    Tailwind utility classes (replace inline styles)
```

### Alternative Stack (more turnkey, less customizable)

```
Layout:     Blueprint.js panels + Tree
Components: Blueprint.js full component set
Editing:    Monaco Editor
Theming:    Blueprint.js dark theme + custom overrides
Animation:  Keep anime.js
Styling:    Blueprint.js CSS + overrides
```

### Why the Recommended Stack Wins

| Factor | shadcn + Radix | Blueprint.js |
|--------|---------------|-------------|
| Visual control | Full (you own the source) | Limited (their design language) |
| Terminal aesthetic | Easy to achieve | Would fight the styling |
| Bundle size | Minimal (~30kB Radix) | Heavy (~200-300kB) |
| Tailwind compat | Native | Poor |
| Community size | Massive (109k stars) | Moderate (21.5k) |
| Desktop components | Fewer (supplement from Blueprint selectively) | Excellent |
| Learning curve | Moderate | Low |

**Hybrid approach:** Use shadcn/ui as the primary component system, but cherry-pick Blueprint.js components for desktop-specific needs (Tree, HotkeysProvider) if shadcn equivalents are insufficient.

---

## 7. Summary

### Must-Have for Next Phase
1. **Tailwind CSS** — replace inline styles, enable hover/focus/active states
2. **react-resizable-panels** — resizable sidebar immediately
3. **shadcn/ui + Radix** — accessible component primitives

### Strong Upgrade Path
4. **CodeMirror 6** — replace textarea + highlight.js for code editing
5. **Dockview** — multi-tab support when ready

### Nice to Have
6. **Shiki** — upgrade syntax highlighting accuracy for preview
7. **Blueprint.js Tree** — if building file tree component

### Skip
- Monaco (too heavy), MUI/Chakra/NextUI (wrong aesthetic), Canvas libraries (wrong scope)
