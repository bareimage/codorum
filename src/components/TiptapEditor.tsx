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

const lowlight = createLowlight(all);

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
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: "", // Start empty — markdown set via setContent() below
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
  });

  // Load markdown content via setContent (goes through tiptap-markdown parser).
  // Runs when fileId changes OR when content arrives for a new file.
  useEffect(() => {
    if (!editor || !content) return;
    // Skip if we already loaded content for this file (user edits)
    if (loadedFile.current === fileId) return;

    loadedFile.current = fileId;
    suppressUpdate.current = true;
    editor.commands.setContent(content);
    suppressUpdate.current = false;
    try {
      (editor.commands as any).clearHistory?.();
    } catch {
      // noop
    }
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
      >
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive("heading", { level: 1 }) ? "is-active" : ""}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive("heading", { level: 3 }) ? "is-active" : ""}
        >
          H3
        </button>
        <span className="tiptap-menu-sep" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "is-active" : ""}
        >
          &#x2022;
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "is-active" : ""}
        >
          1.
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={editor.isActive("taskList") ? "is-active" : ""}
        >
          &#x2611;
        </button>
        <span className="tiptap-menu-sep" />
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive("codeBlock") ? "is-active" : ""}
        >
          {"```"}
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive("blockquote") ? "is-active" : ""}
        >
          &gt;
        </button>
        <button
          onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 3 }).run()}
        >
          &#x229e;
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          &#x2015;
        </button>
      </FloatingMenu>}

      <EditorContent editor={editor} />
    </div>
  );
}
