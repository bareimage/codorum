# Lessons Learned

## Vite HMR causes "disappearing files" in dev mode

**Symptom:** Pressing Cmd+S to save a file makes it vanish from the UI.

**Root cause:** When a user-watched file lives inside the project directory (e.g. `chat.md`), saving it to disk triggers Vite's file watcher, which forces a full page reload. The app restarts, wiping the current view.

**Red herrings explored:**
- macOS FSEvents spurious remove/rename events during `std::fs::write`
- Watcher race conditions between save_file mutex and watcher thread
- TiptapEditor remounting due to `_rev` bumps
- ErrorBoundary catching render errors
- IntersectionObserver changing active file after layout shift
- Native macOS Cmd+S menu responder chain in WKWebView

**Fix:** Added `server.watch.ignored` patterns in `vite.config.ts` for `*.md`, `*.txt`, and `src-tauri/`. This is dev-mode only — production builds are unaffected.

**Lesson:** When a file "disappears" after save in a Tauri dev environment, check Vite's HMR logs first. The line `[vite] (client) page reload <filename>` is the smoking gun.

---

## Never translate mockup CSS to Tailwind utilities

**Symptom:** GUI looks "off" — subtle visual regressions, lost gradients, broken animations.

**Root cause:** Translating ~270 lines of battle-tested mockup CSS into Tailwind utility classes is lossy. Specific failures:
- `backdrop-filter` values approximated or dropped
- Theme-specific `--bg-gradient` radial gradients can't be expressed in Tailwind
- A single `.fc-h` class becomes 15+ utilities, making JSX unreadable
- Multiple iterations each produced a degraded approximation

**Fix:** Paste mockup CSS verbatim into `app.css`, use class names directly in JSX. Custom classes and Tailwind v4 coexist with zero conflict.

**Lesson:** If a mockup HTML file has working CSS, treat it as production code — copy it, don't translate it.
