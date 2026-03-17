import { FileItem, Group, Command } from './types';

export const THEMES = ['n01z', 'paper', 'phosphor', 'ember'];

export const EXT_COLORS: Record<string, string> = {
  md: 'var(--ac)', markdown: 'var(--ac)', mdx: 'var(--ac)',
  ts: 'var(--ac2)', tsx: 'var(--ac2)', rs: 'var(--danger)',
  css: 'var(--ac3)', scss: 'var(--ac3)', js: 'var(--warn)',
  jsx: 'var(--warn)', py: 'var(--ac3)', go: 'var(--ac)',
  html: 'var(--danger)', json: 'var(--warn)', yaml: 'var(--ac3)',
  yml: 'var(--ac3)', toml: 'var(--ac3)',
};

export const MOCK_FILES: FileItem[] = [
  { id: 'f1', name: 'README', ext: 'md', pinned: true, modified: Date.now()/1000 - 120,
    added: 12, removed: 3, deleted: false,
    content: `<h1>Codorum</h1>
<p>A desktop file watcher that monitors text and markdown files in real-time with diff visualization.</p>
<blockquote><p>Transparency for your codebase</p></blockquote>
<h2>Quick Start</h2>
<p>Install dependencies and run the dev server:</p>
<pre><code>npm install
npm run tauri dev</code></pre>
<ul><li>Live file monitoring with drag-and-drop</li>
<li>Real-time diff visualization</li>
<li>WYSIWYG Markdown editor</li>
<li>4 built-in themes</li></ul>` },
  { id: 'f2', name: 'App', ext: 'tsx', group: 'src', modified: Date.now()/1000 - 300,
    added: 28, removed: 5, deleted: false,
    content: `<span class="cmt">// Root application component</span>
<span class="kw">import</span> { useEffect, useState } <span class="kw">from</span> <span class="str">"react"</span>;
<span class="kw">import</span> { invoke } <span class="kw">from</span> <span class="str">"@tauri-apps/api/core"</span>;
<span class="kw">import</span> { Toolbar } <span class="kw">from</span> <span class="str">"./components/Toolbar"</span>;
<span class="kw">import</span> { Sidebar } <span class="kw">from</span> <span class="str">"./components/Sidebar"</span>;

<span class="kw">export default function</span> <span class="fn">App</span>() {
  <span class="kw">const</span> { addFiles } = <span class="fn">useAppStore</span>();
  <span class="kw">const</span> theme = <span class="fn">useAppStore</span>(s => s.theme);

  <span class="kw">return</span> (
    &lt;<span class="type">div</span> <span class="attr">className</span>=<span class="str">"flex flex-col h-screen"</span>&gt;
      &lt;<span class="type">Toolbar</span> /&gt;
      &lt;<span class="type">Sidebar</span> /&gt;
      &lt;<span class="type">ContentPane</span> /&gt;
    &lt;/<span class="type">div</span>&gt;
  );
}` },
  { id: 'f3', name: 'main', ext: 'tsx', group: 'src', modified: Date.now()/1000 - 3600,
    added: 0, removed: 0, deleted: false,
    content: `<span class="kw">import</span> React <span class="kw">from</span> <span class="str">"react"</span>;
<span class="kw">import</span> ReactDOM <span class="kw">from</span> <span class="str">"react-dom/client"</span>;
<span class="kw">import</span> App <span class="kw">from</span> <span class="str">"./App"</span>;
<span class="kw">import</span> <span class="str">"./styles/app.css"</span>;

ReactDOM.<span class="fn">createRoot</span>(
  document.<span class="fn">getElementById</span>(<span class="str">"root"</span>)!
).<span class="fn">render</span>(
  &lt;<span class="type">React.StrictMode</span>&gt;
    &lt;<span class="type">App</span> /&gt;
  &lt;/<span class="type">React.StrictMode</span>&gt;
);` },
  { id: 'f4', name: 'app', ext: 'css', group: 'src', modified: Date.now()/1000 - 7200,
    added: 0, removed: 0, deleted: false,
    content: `<span class="cmt">/* ═══ THEMES ═══ */</span>
<span class="fn">:root</span> {
  <span class="attr">--bg</span>: <span class="str">#18181b</span>;
  <span class="attr">--bg2</span>: <span class="str">#111113</span>;
  <span class="attr">--card</span>: <span class="str">#1f1f23</span>;
  <span class="attr">--ac</span>: <span class="str">#5bc4c4</span>;
  <span class="attr">--ac2</span>: <span class="str">#a78bfa</span>;
}

<span class="fn">.file-card</span> {
  <span class="attr">background</span>: <span class="fn">var</span>(<span class="attr">--card</span>);
  <span class="attr">border-radius</span>: <span class="num">12px</span>;
  <span class="attr">border</span>: <span class="num">1px</span> solid <span class="fn">var</span>(<span class="attr">--brd</span>);
  <span class="attr">transition</span>: all <span class="num">150ms</span> ease;
}` },
  { id: 'f5', name: 'Sidebar', ext: 'tsx', group: 'src', modified: Date.now()/1000 - 600,
    added: 8, removed: 0, deleted: false,
    content: `<span class="kw">import</span> { useMemo, useState } <span class="kw">from</span> <span class="str">"react"</span>;
<span class="kw">import</span> { useAppStore } <span class="kw">from</span> <span class="str">"../stores/app-store"</span>;

<span class="kw">export function</span> <span class="fn">Sidebar</span>() {
  <span class="kw">const</span> { files, groups } = <span class="fn">useAppStore</span>();
  <span class="kw">const</span> [search, setSearch] = <span class="fn">useState</span>(<span class="str">""</span>);

  <span class="kw">return</span> (
    &lt;<span class="type">div</span> <span class="attr">style</span>={{ width: <span class="num">240</span> }}&gt;
      &lt;<span class="type">SearchBox</span> /&gt;
      &lt;<span class="type">DrawerSection</span> /&gt;
    &lt;/<span class="type">div</span>&gt;
  );
}` },
  { id: 'f6', name: 'notes', ext: 'md', modified: Date.now()/1000 - 86400,
    added: 0, removed: 0, deleted: false,
    content: `<h2>Development Notes</h2>
<p>Some quick notes about the architecture and design decisions made during development.</p>
<h3>File Watching</h3>
<p>Using the <code>notify</code> crate with FSEvents backend on macOS for native performance.</p>
<p>Events are debounced at 200ms to prevent rapid-fire updates during batch saves.</p>` },
  { id: 'f7', name: 'config', ext: 'json', modified: Date.now()/1000 - 172800,
    added: 0, removed: 0, deleted: true,
    content: `{
  <span class="attr">"appName"</span>: <span class="str">"Codorum"</span>,
  <span class="attr">"version"</span>: <span class="str">"0.1.0"</span>,
  <span class="attr">"window"</span>: {
    <span class="attr">"width"</span>: <span class="num">1200</span>,
    <span class="attr">"height"</span>: <span class="num">800</span>
  }
}` },
];

export const GROUPS: Group[] = [
  { id: 'pinned', name: 'Pinned', fileIds: ['f1'] },
  { id: 'src', name: 'src', fileIds: ['f2', 'f3', 'f4', 'f5'], ejectable: true },
  { id: 'loose', name: 'Loose', fileIds: ['f6', 'f7'] },
];

export const COMMANDS: Command[] = [
  { type: 'sep', label: 'Actions' },
  { type: 'cmd', id: 'add-folder', label: 'Add Folder', icon: '📁' },
  { type: 'cmd', id: 'add-file', label: 'Add Files', icon: '📄' },
  { type: 'cmd', id: 'create-tab', label: 'Create Tab', icon: '＋' },
  { type: 'cmd', id: 'new-src', label: 'New File in src', icon: '＋' },
  { type: 'sep', label: 'Appearance' },
  { type: 'cmd', id: 'theme', label: 'Cycle Theme', icon: '🎨', kbd: '⌘T', sub: '' },
];
