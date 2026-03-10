import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../stores/app-store";
import { useToastStore } from "../stores/toast-store";
import { TiptapEditor } from "./TiptapEditor";
import { CodeView } from "./CodeView";
import { ErrorBoundary } from "./ErrorBoundary";
import { Icons } from "./Icons";
import { ExtDot } from "./ExtDot";
import { DiffBadge } from "./DiffBadge";
import { ResizeHandle } from "./ResizeHandle";
import type { WatchedFile } from "../types/files";

const MARKUP_EXTS = new Set(["md", "markdown", "mdx"]);
const CODE_EXTS = new Set([
  "ts", "tsx", "js", "jsx", "rs", "py", "go", "c", "cpp", "h", "hpp",
  "java", "rb", "swift", "kt", "cs", "css", "scss", "less", "html",
  "xml", "sql", "sh", "bash", "zsh", "lua", "zig", "toml", "yaml",
  "yml", "json", "jsonc", "dockerfile", "makefile",
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
  const setCardHeight = useAppStore((s) => s.setCardHeight);
  const setCardDirty = useAppStore((s) => s.setCardDirty);
  const [content, setContent] = useState(file.content);
  const [trackedContent, setTrackedContent] = useState(file.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const mode = detectMode(file.extension);

  // Sync content synchronously during render when file changes externally.
  // This ensures editors mount with correct content (useEffect would be too late).
  if (file.content !== trackedContent) {
    setContent(file.content);
    setTrackedContent(file.content);
    setCardDirty(file.id, false);
  }

  // Listen for global save event (⌘S)
  useEffect(() => {
    if (!isActive || !dirty) return;
    const handler = (e: Event) => {
      e.preventDefault();
      invoke("save_file", { id: file.id, content }).then(() => {
        setCardDirty(file.id, false);
        addToast("Saved", file.name, "cyan");
      });
    };
    window.addEventListener("codorum:save", handler);
    return () => window.removeEventListener("codorum:save", handler);
  }, [isActive, dirty, file.id, file.name, content, addToast]);

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

  // Auto-size textarea to content
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [content]);

  // Extract first heading for collapsed subtitle
  const subtitle = (() => {
    if (!content) return null;
    const match = content.match(/^#{1,2}\s+(.+)$/m);
    return match ? match[1].trim() : null;
  })();


  return (
    <div
      id={file.id}
      className={`file-card${isActive ? " active" : ""}`}
      onClick={onActivate}
    >
      {/* Card header */}
      <div
        className="file-card-header"
        style={{ borderBottom: isCollapsed ? "none" : undefined }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onToggleCollapse();
        }}
      >
        <button
          className="file-card-chevron"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
        >
          <Icons.chevron open={!isCollapsed} />
        </button>
        <ExtDot extension={file.extension} />
        <span
          className="file-card-name"
          style={file.deleted ? { color: "var(--deleted)", textDecoration: "line-through" } : undefined}
        >
          {file.name}
          {file.extension && (
            <span style={{ color: file.deleted ? "var(--deleted)" : "var(--tx3)", fontWeight: 400 }}>
              .{file.extension}
            </span>
          )}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <span className="file-card-time">{timeAgo(file.modified)}</span>
          <DiffBadge added={file.linesAdded} removed={file.linesRemoved} />
          {file.pinned && (
            <span style={{ color: "var(--warn)", fontSize: 10, flexShrink: 0 }}>
              &#x25CF;
            </span>
          )}
          {file.deleted && (
            <span
              style={{
                color: "var(--danger)",
                fontSize: 11,
                flexShrink: 0,
                background: "var(--hover)",
                padding: "2px 8px",
                borderRadius: 4,
                opacity: 0.8,
              }}
            >
              deleted
            </span>
          )}
          {dirty && !file.deleted && (
            <span
              style={{
                color: "var(--ac)",
                fontSize: 11,
                flexShrink: 0,
                background: "var(--hover)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              modified
            </span>
          )}
        </div>
      </div>

      {/* Collapsed subtitle */}
      {isCollapsed && subtitle && (
        <div
          style={{
            padding: "0 20px 12px 48px",
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

      {/* Card body — hidden when collapsed */}
      {!isCollapsed && (
        <div
          ref={bodyRef}
          className="file-card-body"
          onClick={(e) => e.stopPropagation()}
          style={cardHeight ? { maxHeight: cardHeight, overflowY: "auto" } : undefined}
        >
          <ErrorBoundary>
          {mode === "markdown" && typeof content === "string" && (
            <TiptapEditor
              key={`tiptap-${file.id}-${file._rev ?? 0}`}
              content={content}
              onChange={handleMarkdownChange}
              fileId={file.id}
              editable={isActive && !file.deleted}
            />
          )}
          {mode === "code" && typeof content === "string" && (
            <CodeView
              key={`code-${file.id}-${file._rev ?? 0}`}
              content={content}
              language={file.extension}
            />
          )}
          {mode === "text" && typeof content === "string" && (
            <textarea
              key={`text-${file.id}-${file._rev ?? 0}`}
              ref={textareaRef}
              className="source-editor"
              value={content}
              onChange={(e) => handleTextChange(e.target.value)}
              readOnly={!isActive || file.deleted}
              spellCheck={false}
            />
          )}
          </ErrorBoundary>
        </div>
      )}

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
