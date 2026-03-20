import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChevronRight } from "lucide-react";
import { animate } from "animejs";
import { useAppStore, editorContentMap } from "../stores/app-store";
import { useToastStore } from "../stores/toast-store";
import { MarkdownEditor, type MarkdownEditorHandle } from "./MarkdownEditor";
import { MarkdownDiffView } from "./MarkdownDiffView";
import { CodeEditor } from "./CodeEditor";
import { ErrorBoundary } from "./ErrorBoundary";
import { FileIcon } from "./FileIcon";
import { ResizeHandle } from "./ResizeHandle";
import { reconstructAtSnapshot } from "../utils/reconstructContent";
import { buildAnnotatedLines } from "../utils/diffUtils";
import type { WatchedFile, FileSnapshot } from "../types/files";

function DiffView({ snap, content }: { snap: FileSnapshot; content?: string | null }) {
  const lines = useMemo(() => {
    if (content) {
      return buildAnnotatedLines(content, snap.patch ?? null).map((a) => ({
        text: a.text,
        cls: a.type === "add" ? "diff-add" : a.type === "del" ? "diff-del" : "diff-ctx",
      }));
    }
    return (snap.patch || "").split("\n").map((line) => {
      let cls = "diff-ctx";
      if (line.startsWith("+") && !line.startsWith("+++")) cls = "diff-add";
      else if (line.startsWith("-") && !line.startsWith("---")) cls = "diff-del";
      else if (line.startsWith("@@")) cls = "diff-hunk";
      return { text: line, cls };
    });
  }, [snap.timestamp, snap.patch, content]);

  return (
    <pre className="diff-view">
      <code>
        {lines.map((line, i) => (
          <div key={i} className={line.cls}>{line.text}</div>
        ))}
      </code>
    </pre>
  );
}

const MARKUP_EXTS = new Set(["md", "markdown", "mdx"]);
const CODE_EXTS = new Set([
  "ts", "tsx", "js", "jsx", "rs", "py", "go", "c", "cpp", "h", "hpp",
  "java", "rb", "swift", "kt", "cs", "css", "scss", "less", "html",
  "xml", "sql", "sh", "bash", "zsh", "lua", "zig", "toml", "yaml",
  "yml", "json", "jsonc", "dockerfile", "makefile",
  "fs", "vs", "frag", "vert", "glsl",
]);

function detectMode(ext: string): "markdown" | "code" | "text" {
  if (MARKUP_EXTS.has(ext.toLowerCase())) return "markdown";
  if (CODE_EXTS.has(ext.toLowerCase())) return "code";
  return "text";
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface FileCardProps {
  file: WatchedFile;
  isActive: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onActivate: () => void;
}

export function FileCard({
  file,
  isActive,
  isCollapsed,
  onToggleCollapse,
  onActivate,
}: FileCardProps) {
  const addToast = useToastStore((s) => s.add);
  const cardHeight = useAppStore((s) => s.cardHeights[file.id] ?? null);
  const dirty = useAppStore((s) => s.cardDirty[file.id] ?? false);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const isSelected = selectedIds.has(file.id);
  const setCardHeight = useAppStore((s) => s.setCardHeight);
  const setCardDirty = useAppStore((s) => s.setCardDirty);
  const patchFileMeta = useAppStore((s) => s.patchFileMeta);
  const [content, setContent] = useState(file.content);
  const [trackedContent, setTrackedContent] = useState(file.content);
  const mdEditorRef = useRef<MarkdownEditorHandle>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const mode = detectMode(file.extension);
  const activeSnapshotTs = useAppStore((s) => s.activeSnapshots[file.id]) ?? null;
  const setActiveSnapshot = useAppStore((s) => s.setActiveSnapshot);
  const [snapshots, setSnapshots] = useState<FileSnapshot[]>([]);

  // Load snapshots from DB when needed (timeline scrubbing)
  useEffect(() => {
    if (activeSnapshotTs !== null) {
      invoke<FileSnapshot[]>("get_snapshots", { filePath: file.path }).then(setSnapshots);
    }
  }, [activeSnapshotTs, file.path]);

  // Entrance animation
  useEffect(() => {
    if (cardRef.current) {
      animate(cardRef.current, {
        translateY: [6, 0],
        opacity: [0, 1],
        duration: 200,
        ease: "outCubic",
      });
    }
  }, []);

  // Sync content synchronously during render when file changes externally.
  if (file.content !== trackedContent) {
    setContent(file.content);
    setTrackedContent(file.content);
    setCardDirty(file.id, false);
  }

  // Listen for global save event (Cmd+S)
  useEffect(() => {
    if (!isActive) return;
    const handler = () => {
      let latest: string;
      if (mode === "markdown" && mdEditorRef.current) {
        latest = mdEditorRef.current.getMarkdown();
      } else {
        latest = editorContentMap.get(file.id) ?? content;
      }

      invoke<WatchedFile>("save_file", { id: file.id, content: latest }).then((saved) => {
        patchFileMeta(file.id, {
          content: latest,
          linesAdded: saved.lines_added ?? 0,
          linesRemoved: saved.lines_removed ?? 0,
          modified: saved.modified,
        });
        setContent(latest);
        setTrackedContent(latest);
        setCardDirty(file.id, false);
        addToast("Saved", file.name, "cyan");
      }).catch((err) => {
        addToast("Save failed", String(err), "rose");
      });
    };
    window.addEventListener("codorum:save", handler);
    return () => window.removeEventListener("codorum:save", handler);
  }, [isActive, file.id, file.name, content, mode, addToast, patchFileMeta, setCardDirty]);

  const handleMarkdownChange = useCallback((md: string) => {
    setContent(md);
    if (md.replace(/\r\n/g, '\n').trim() !== file.content.replace(/\r\n/g, '\n').trim()) {
      setCardDirty(file.id, true);
    } else {
      setCardDirty(file.id, false);
    }
  }, [file.id, file.content, setCardDirty]);

  const handleTextChange = useCallback((value: string) => {
    setContent(value);
    if (value !== file.content) {
      setCardDirty(file.id, true);
    } else {
      setCardDirty(file.id, false);
    }
  }, [file.id, file.content, setCardDirty]);

  const subtitle = (() => {
    if (!content) return null;
    const match = content.match(/^#{1,2}\s+(.+)$/m);
    return match ? match[1].trim() : null;
  })();

  const historicalSnap = activeSnapshotTs
    ? snapshots.find((s) => s.timestamp === activeSnapshotTs)
    : null;

  const reconstructedContent = useMemo(() => {
    if (!historicalSnap) return null;
    const snapIdx = snapshots.findIndex(
      (s) => s.timestamp === activeSnapshotTs,
    );
    if (snapIdx === -1) return null;
    return reconstructAtSnapshot(file.content, snapshots, snapIdx);
  }, [historicalSnap, file.content, snapshots, activeSnapshotTs]);

  const isReadOnly = !isActive || file.deleted;

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [content, activeSnapshotTs, file._rev]);

  return (
    <div
      ref={cardRef}
      id={file.id}
      className={`fc${isActive ? " active" : ""}${isSelected ? " selected" : ""}`}
      onClick={onActivate}
    >
      {/* Card header */}
      <div
        className="fc-h"
        onDoubleClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
      >
        <button
          className={`chev ${!isCollapsed ? "open" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
        >
          <ChevronRight size={16} />
        </button>
        <FileIcon extension={file.extension} size={16} />
        <span
          className="ftitle"
          style={file.deleted ? { color: "var(--deleted)", textDecoration: "line-through" } : undefined}
        >
          {file.name}
          {file.extension && <span className="ext">.{file.extension}</span>}
        </span>
        <div className="fmeta">
          {file.pinned && <span className="pin" />}
          {file.deleted && <span className="del-badge">deleted</span>}
          {dirty && !file.deleted && (
            <span style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 9999,
              background: "var(--hover)",
              color: "var(--ac)",
              fontWeight: 600,
            }}>
              modified
            </span>
          )}
          <span className="ts">{timeAgo(file.modified)}</span>
          {(file.linesAdded || file.linesRemoved) ? (
            <span className="diff">
              {(file.linesAdded ?? 0) > 0 && <span className="d-add">+{file.linesAdded}</span>}
              {(file.linesRemoved ?? 0) > 0 && <span className="d-del">{"\u2212"}{file.linesRemoved}</span>}
            </span>
          ) : null}
        </div>
      </div>

      {/* History mode banner */}
      {historicalSnap && (
        <div className="history-banner">
          <span className="hb-dot" />
          <span className="hb-text">
            Viewing snapshot from {new Date(historicalSnap.timestamp * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            {historicalSnap.lines_added > 0 && ` · +${historicalSnap.lines_added}`}
            {historicalSnap.lines_removed > 0 && ` · −${historicalSnap.lines_removed}`}
          </span>
          <button className="hb-btn" onClick={() => setActiveSnapshot(file.id, null)}>
            Return to Live
          </button>
        </div>
      )}

      {/* Collapsed subtitle */}
      {isCollapsed && subtitle && (
        <div
          style={{
            padding: "0 24px 12px 52px",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--tx3)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Card body */}
      <div
        ref={bodyRef}
        className={`fc-body ${isCollapsed ? "closed" : "open"}`}
        onClick={(e) => e.stopPropagation()}
        style={!isCollapsed && cardHeight ? { maxHeight: cardHeight, overflowY: "auto" } : undefined}
      >
        {!isCollapsed && (
          <ErrorBoundary>
            {historicalSnap ? (
              mode === "markdown" ? (
                <MarkdownDiffView
                  key={`diff-${file.id}-${historicalSnap.timestamp}`}
                  snap={historicalSnap}
                  content={reconstructedContent}
                />
              ) : (
                <DiffView snap={historicalSnap} content={reconstructedContent} />
              )
            ) : (
              <>
                {mode === "markdown" && (
                  <MarkdownEditor
                    key={`md-${file.id}-${file._rev ?? 0}`}
                    ref={mdEditorRef}
                    content={content}
                    onChange={handleMarkdownChange}
                    fileId={file.id}
                    editable={!isReadOnly}
                  />
                )}
                {mode === "code" && (
                  <CodeEditor
                    key={`code-${file.id}-${file._rev ?? 0}`}
                    content={content}
                    language={file.extension}
                    onChange={handleTextChange}
                    fileId={file.id}
                    editable={!isReadOnly}
                  />
                )}
                {mode === "text" && (
                  <textarea
                    key={`text-${file.id}-${file._rev ?? 0}`}
                    ref={textareaRef}
                    className="source-editor"
                    value={content}
                    onChange={(e) => handleTextChange(e.target.value)}
                    readOnly={isReadOnly}
                    spellCheck={false}
                  />
                )}
              </>
            )}
          </ErrorBoundary>
        )}
      </div>

      {/* Resize handle — only when expanded */}
      {!isCollapsed && (
        <ResizeHandle
          bodyRef={bodyRef}
          onResize={(h) => setCardHeight(file.id, h)}
          onReset={() => setCardHeight(file.id, null)}
        />
      )}
    </div>
  );
}
