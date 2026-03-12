import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Typography from "@tiptap/extension-typography";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { Markdown } from "tiptap-markdown";
import { all, createLowlight } from "lowlight";
import { MermaidExtension } from "./MermaidExtension";
import { createSlashExtension } from "./SlashMenu";

const lowlight = createLowlight(all);
const SlashCommand = createSlashExtension();

// Devil's Dictionary entries used as placeholder content for new files.
// Matches blockquote format: "> ***Word***, *n.* ..."
const DD_PATTERN = /^>\s+\*{3}[A-Z][a-z]+\*{3},\s+\*(?:n|adj|v\.\s?[ti]|adv|interj|pp|pron)\.\*/;

interface TiptapEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  fileId: string;
  editable?: boolean;
}

export function TiptapEditor({ content, onChange, fileId, editable = true }: TiptapEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [linkInput, setLinkInput] = useState<string | null>(null);

  // Track which file we've loaded to avoid re-setting on user edits
  const loadedFile = useRef<string>("");
  const suppressUpdate = useRef(false);
  const isPlaceholderContent = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
      }),
      Placeholder.configure({
        placeholder: "Start writing\u2026",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "plaintext",
      }),
      Typography,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Highlight,
      Image,
      MermaidExtension,
      SlashCommand,
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    // tiptap-markdown's onBeforeCreate parses the content option through
    // markdown-it.  Passing null/"" can produce a spurious codeBlock node.
    // A zero-width space is valid inline content that markdown-it renders as
    // <p>\u200B</p> — guaranteeing a paragraph, never a code block.
    // The useEffect below immediately replaces this with actual file content.
    content: "\u200B",
    editorProps: {
      attributes: {
        class: "tiptap-editor-content",
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor }) => {
      if (suppressUpdate.current) return;
      const md = (editor.storage as any).markdown.getMarkdown();
      onChangeRef.current(md);
    },
    onFocus: ({ editor }) => {
      if (!isPlaceholderContent.current) return;
      isPlaceholderContent.current = false;
      // Clear the placeholder quote without triggering a save to disk.
      // Raw ProseMirror dispatch bypasses tiptap-markdown's setContent hook.
      suppressUpdate.current = true;
      const emptyDoc = editor.schema.nodeFromJSON({
        type: "doc",
        content: [{ type: "paragraph" }],
      });
      const tr = editor.state.tr.replaceWith(
        0,
        editor.state.doc.content.size,
        emptyDoc.content,
      );
      tr.setMeta("addToHistory", false);
      editor.view.dispatch(tr);
      suppressUpdate.current = false;
    },
  });

  // Load markdown content when the file changes.
  // For empty files, dispatch a raw ProseMirror transaction (bypasses
  // tiptap-markdown's setContent override which would parse "" → code block).
  useEffect(() => {
    if (!editor) return;
    // Skip if we already loaded content for this file (user edits)
    if (loadedFile.current === fileId) return;

    // Always stamp the fileId so we don't re-enter on every render
    loadedFile.current = fileId;

    suppressUpdate.current = true;

    // Detect Devil's Dictionary placeholder content
    isPlaceholderContent.current = DD_PATTERN.test(content.trim());

    if (!content || !content.trim()) {
      // tiptap-markdown hooks into editor.commands.setContent() and
      // editor.commands.clearContent() — both run parser.parse("") which
      // turns an empty string into a spurious <pre><code> node.
      // Raw ProseMirror transactions bypass that hook entirely.
      const emptyDoc = editor.schema.nodeFromJSON({
        type: "doc",
        content: [{ type: "paragraph" }],
      });
      const tr = editor.state.tr.replaceWith(
        0,
        editor.state.doc.content.size,
        emptyDoc.content,
      );
      tr.setMeta("addToHistory", false);
      editor.view.dispatch(tr);
    } else {
      editor.commands.setContent(content);
      try {
        (editor.commands as any).clearHistory?.();
      } catch {
        // noop
      }
    }
    suppressUpdate.current = false;
  }, [fileId, content, editor]);

  // Reset tracking when fileId changes so we accept the next content load
  useEffect(() => {
    loadedFile.current = "";
  }, [fileId]);

  // Sync editable state
  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  if (!editor) return null;

  return (
    <div className="tiptap-wrap">
      {editable && <BubbleMenu
        editor={editor}
        className="tiptap-bubble-menu"
        {...{ tippyOptions: { appendTo: () => document.querySelector('.ui') || document.body } } as any}
      >
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "is-active" : ""}
          title="Bold (⌘B)"
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "is-active" : ""}
          title="Italic (⌘I)"
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive("strike") ? "is-active" : ""}
          title="Strikethrough"
        >
          S
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive("code") ? "is-active" : ""}
          title="Inline Code (⌘E)"
        >
          {"</>"}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={editor.isActive("highlight") ? "is-active" : ""}
          title="Highlight"
        >
          H
        </button>
        {linkInput !== null ? (
          <input
            autoFocus
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && linkInput) {
                editor.chain().focus().setLink({ href: linkInput }).run();
                setLinkInput(null);
              } else if (e.key === "Escape") {
                setLinkInput(null);
                editor.chain().focus().run();
              }
            }}
            placeholder="https://..."
            style={{
              width: 200,
              fontSize: 12,
              padding: "4px 8px",
              background: "var(--input-bg)",
              border: "1px solid var(--brd)",
              borderRadius: "var(--radius-sm)",
              color: "var(--tx)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        ) : (
          <button
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
              } else {
                setLinkInput("");
              }
            }}
            className={editor.isActive("link") ? "is-active" : ""}
            title="Link"
          >
            &#x1f517;
          </button>
        )}
      </BubbleMenu>}

      {editable && <FloatingMenu
        editor={editor}
        className="tiptap-floating-menu"
        {...{ tippyOptions: { appendTo: () => document.querySelector('.ui') || document.body } } as any}
      >
        <span style={{ fontSize: 12, color: "var(--tx3)", opacity: 0.6 }}>
          Type <kbd style={{ fontFamily: "monospace", padding: "0 4px", background: "var(--hover)", borderRadius: 3, fontSize: 11 }}>/</kbd> for commands
        </span>
      </FloatingMenu>}

      <EditorContent editor={editor} />
    </div>
  );
}
