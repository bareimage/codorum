# How I Use Sketch + Claude Code to Push Designs Directly Into My Tauri App

*A tutorial on using MCP servers to bridge the gap between design tools and code — with real examples, real frustrations, and the moment it actually clicked.*

---

## The Problem Nobody Talks About

Here's a scene that plays out every day when you're vibe-coding with an AI:

**You:** "Make the toolbar look like a pill shape with frosted glass"

**AI:** *generates a toolbar with 40px font, neon blue borders, and margins the size of Texas*

**You:** "No, smaller. Like... refined. Like iA Writer."

**AI:** *makes everything 8px and invisible*

**You:** *considers throwing laptop against wall*

The issue isn't that the AI is stupid. It's that **human language is fluid, code is strict, and design is visual**. When I say "frosted glass" I'm seeing a very specific thing in my head — the exact opacity, the backdrop blur radius, the border weight. The AI is guessing from a text description. It's like describing a painting over the phone.

I spent weeks building [Codorum](https://github.com/bareimage/codorum) — a Tauri desktop app for watching file changes — through vibe coding sessions with both Claude and Gemini. The code was solid. The architecture was clean. But the front-end? The front-end was where I lost my mind.

Every CSS iteration was a negotiation. "No, not THAT blue." "The padding is insane." "Why are the headings 2.4em? This is a text file, not a billboard." I have a background in magazine editing and desktop publishing, so every misplaced pixel was physically painful.

Then I discovered MCP servers, and everything changed.

---

## What is MCP?

MCP (Model Context Protocol) is a standard that lets AI assistants connect to external tools. Think of it as USB for AI — you plug in a tool, the AI can use it.

When Claude Code has access to a Sketch MCP server, it can:
- **Read** what's on your Sketch canvas (frames, layers, colors, text)
- **Write** new design elements programmatically (create frames, set fills, add text)
- **Export** frames as images to verify the output

Instead of describing your design in words (lossy), you can **show the AI your actual design** (lossless) and say "make the code look like THIS."

---

## The Setup

You need three things:

1. **Sketch** (macOS) with the MCP plugin installed
2. **Claude Code** CLI (`claude` command)
3. The Sketch MCP server registered in Claude Code

The Sketch MCP server appears as deferred tools in Claude Code:
- `mcp__sketch__run_code` — Execute JavaScript against the Sketch API
- `mcp__sketch__get_selection_as_image` — Screenshot what's selected

---

## The Real Workflow: Codorum's 4 Themes

Codorum has 4 color themes: **n01z** (dark), **paper** (light), **phosphor** (green), **ember** (warm). These weren't hand-designed in Sketch. Here's what actually happened:

### Step 1: Vibe Coding the Design

The themes were born in coding sessions with Gemini AI Studio and Claude. HTML mockups, CSS iterations, back-and-forth on colors. The design lived only in code — `app.css` with CSS custom properties:

```css
:root {
  --bg: #000;
  --bg2: rgba(30,30,35,.65);
  --card: rgba(45,45,50,.65);
  --tx: #fff;
  --ac: #0A84FF;
  /* ... */
}
[data-theme="paper"] {
  --bg: #F5F5F7;
  --tx: #1D1D1F;
  --ac: #007AFF;
  /* ... */
}
```

### Step 2: Pushing to Sketch via MCP

I told Claude: "Create a Sketch mockup of the Codorum app for all 4 themes."

Claude read the CSS, extracted the color tokens, and generated Sketch frames programmatically:

```javascript
// Claude generated this and ran it via mcp__sketch__run_code
const sketch = require('sketch')
const { Style, Group, Text, ShapePath } = sketch
const doc = sketch.getSelectedDocument()
const page = doc.pages.find(p => p.name === 'Templates')

const W = 1440, H = 900
const main = new Group.Frame({
  name: 'Codorum — n01z',
  parent: page,
  frame: { x: 0, y: 0, width: W, height: H }
})
main.style.fills = [{ color: '#000000ff', fillType: Style.FillType.Color }]

// Toolbar, sidebar, content pane, dock timeline...
// All created programmatically from the CSS variables
```

### Step 3: The Iteration Dance

This is where it got real. The first export looked wrong — gradients bleeding through panels, fonts too large, icons missing. But now I could **show Claude the Sketch frame** and say "look at this, fix it."

The conversation went something like:

> **Me:** *shares screenshot* "The sidebar items have a light blue tint. Where is it coming from?"
>
> **Claude:** *inspects Sketch layers* "Every `new Group.Frame()` in Sketch gets a default fill of `#D6DEFD`. I need to clear it with `frame.style.fills = []`."
>
> **Me:** "FIX ALL OF THEM."

We found 18 stale fills across 4 theme frames. One command cleared them all.

### Step 4: The Result

Four complete theme mockups, created and iterated entirely through conversation:

*(Screenshots: ember, n01z, paper, phosphor themes — all generated via CLAUDE → MCP → SKETCH)*

These aren't static mockups. They're editable Sketch files. I can open them, tweak a color, screenshot it, show it to Claude, and say "now make the code match this." The design and the code stay in sync because MCP is the bridge between them.

---

## Pulling Designs Into Code

The reverse flow is just as powerful. Say you're tweaking a mockup in Sketch — adjusting spacing, trying a different font — and you want the code to match.

```
You: "Look at the selected frame in Sketch and update the CSS to match"
```

Claude calls `mcp__sketch__get_selection_as_image`, sees your changes, and generates the CSS diff. No more eyeballing hex codes or measuring pixels.

---

## Building a Custom MCP Server

We went further and built a custom MCP server for Codorum itself (`codorum-mcp/`). It exposes the app's SQLite database to AI assistants:

```typescript
// 7 tools available to any MCP client
server.tool("list_files", ...);      // What files am I watching?
server.tool("read_file", ...);       // Read file content
server.tool("file_history", ...);    // Snapshot timeline
server.tool("view_diff", ...);       // View a specific diff
server.tool("add_file", ...);        // Start tracking a file
server.tool("save_file", ...);       // Write + create snapshot
server.tool("summarize_activity", ...); // Change velocity analysis
```

Now Claude can query Codorum's data directly:

```
Me: "What files am I currently watching?"
Claude: *calls codorum MCP* "8 files tracked. AUDIO_ENGINE_OVERVIEW.md
        has 2 snapshots, last modified 6 minutes ago..."
```

The MCP server shares the same SQLite database as the desktop app. Files added via MCP appear in the app. It's one source of truth.

---

## The Lesson: Why This Matters

The fundamental struggle with AI-assisted front-end development is the **translation gap**:

```
Your brain (visual) → Words (lossy) → AI (text) → Code (strict) → Screen (visual)
```

Every arrow is a place where meaning gets lost. "Make it look like GitHub" passes through 4 lossy translations before it hits pixels.

MCP short-circuits this:

```
Sketch (visual) → MCP → AI → Code (strict) → Screen (visual)
                   ↑                              ↓
                   └──────── MCP ←────────────────┘
```

The AI can SEE your design and WRITE to your design tool. The loop is visual-to-visual with code in the middle. The words become optional.

---

## Tips & Gotchas (The Hard Way)

Things we learned so you don't have to:

**Sketch API:**
- `new Group.Frame()` creates frames with a default fill of `#D6DEFD` (lavender). Always clear with `frame.style.fills = []` unless you want a visible background.
- `backdrop-filter` doesn't exist in Sketch. Use opaque fills to simulate frosted glass.
- `ShapePath.fromSVGPath()` + `multiplyBy()` scales stroke widths too — they go sub-pixel and invisible at small sizes. Use native shape primitives for small icons.
- SVG imported as `Image` layers kills thin strokes. Use native `ShapePath` for anything under 20px.

**Multi-colored text:**
```javascript
// Don't split syntax-highlighted code into 50 separate text layers.
// Use NSAttributedString for inline color runs:
const native = textLayer.sketchObject
const attrStr = native.attributedStringValue().mutableCopy()
attrStr.addAttribute_value_range_(
  'NSColor', hexNSColor('#C792EA'), NSMakeRange(0, 6)
)
native.setAttributedStringValue_(attrStr)
```

**Theme consistency:**
- Override Milkdown Crepe's `--crepe-color-*` variables to map to your app's CSS vars. Otherwise you get hardcoded light-mode colors on dark themes.
- All floating UI (menus, tooltips, popovers) should use the same frosted glass recipe: `background: var(--cmd-bg); backdrop-filter: blur(40px); border: 1px solid var(--brd)`.

---

## Try It Yourself

1. Install [Claude Code](https://claude.ai/claude-code)
2. Install Sketch + its MCP plugin
3. Open a project and tell Claude: "Read my CSS theme variables and create a Sketch mockup of the app"
4. Iterate visually — screenshot → feedback → regenerate

The source code for Codorum is open: [github.com/bareimage/codorum](https://github.com/bareimage/codorum)

The custom MCP server is in `codorum-mcp/` — clone it, build it, connect it.

---

*Built during a marathon vibe coding session with Claude Opus and Gemini. The design started as HTML mockups, became Sketch templates mid-flight, and ended up as a shipped macOS app. No designers were harmed in the making of this tutorial — though one laptop narrowly escaped defenestration.*
