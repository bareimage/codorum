import { useEffect, useRef } from "react";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, StreamLanguage, HighlightStyle } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { tags } from "@lezer/highlight";

// Language imports
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { sql } from "@codemirror/lang-sql";
import { yaml } from "@codemirror/lang-yaml";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { go } from "@codemirror/lang-go";
// Legacy mode for shell
import { shell } from "@codemirror/legacy-modes/mode/shell";

// ─── Theme ────────────────────────────────────────

const codorumTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--bg2)",
    color: "var(--tx)",
    fontSize: "12.5px",
    fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
  },
  ".cm-content": {
    caretColor: "var(--ac)",
    lineHeight: "1.55",
    padding: "16px 0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--ac)",
  },
  ".cm-gutters": {
    backgroundColor: "color-mix(in srgb, var(--bg2) 80%, var(--card))",
    color: "var(--tx3)",
    border: "none",
    borderRight: "1px solid var(--brd)",
    opacity: "0.35",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "var(--tx2)",
    opacity: "1",
  },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--hover) 50%, transparent)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "color-mix(in srgb, var(--ac) 25%, transparent) !important",
  },
  ".cm-matchingBracket": {
    backgroundColor: "color-mix(in srgb, var(--ac) 20%, transparent)",
    outline: "1px solid color-mix(in srgb, var(--ac) 30%, transparent)",
  },
  ".cm-searchMatch": {
    backgroundColor: "color-mix(in srgb, var(--warn) 30%, transparent)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "color-mix(in srgb, var(--ac) 30%, transparent)",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--hover)",
    color: "var(--tx3)",
    border: "1px solid var(--brd)",
  },
  ".cm-scroller": {
    overflowX: "auto",
  },
});

const codorumHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--ac)" },
  { tag: tags.name, color: "var(--ac)" },
  { tag: tags.string, color: "var(--ac3)" },
  { tag: tags.comment, color: "var(--tx3)", fontStyle: "italic" },
  { tag: tags.number, color: "var(--warn)" },
  { tag: tags.typeName, color: "var(--warn)" },
  { tag: tags.className, color: "var(--warn)" },
  { tag: tags.function(tags.variableName), color: "var(--ac)" },
  { tag: tags.attributeName, color: "var(--ac2)" },
  { tag: tags.variableName, color: "var(--danger)" },
  { tag: tags.regexp, color: "var(--danger)" },
  { tag: tags.bool, color: "var(--warn)" },
  { tag: tags.operator, color: "var(--tx2)" },
  { tag: tags.punctuation, color: "var(--tx3)" },
  { tag: tags.meta, color: "var(--tx3)" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.heading, color: "var(--ac)", fontWeight: "600" },
  { tag: tags.propertyName, color: "var(--tx)" },
]);

// ─── Language detection ───────────────────────────

function getLanguageSupport(ext: string) {
  switch (ext.toLowerCase()) {
    case "sh": case "bash": case "zsh":
      return StreamLanguage.define(shell);
    case "ts": case "tsx":
      return javascript({ jsx: ext === "tsx", typescript: true });
    case "js": case "jsx":
      return javascript({ jsx: ext === "jsx" });
    case "py":
      return python();
    case "rs":
      return rust();
    case "go":
      return go();
    case "c": case "cpp": case "h": case "hpp":
      return cpp();
    case "java":
      return java();
    case "css": case "scss": case "less":
      return css();
    case "html": case "xml":
      return html();
    case "sql":
      return sql();
    case "json": case "jsonc":
      return json();
    case "yaml": case "yml":
      return yaml();
    default:
      return null;
  }
}

// ─── Component ────────────────────────────────────

interface CodeEditorProps {
  content: string;
  language: string;
  onChange: (value: string) => void;
  fileId: string;
  editable?: boolean;
}

export function CodeEditor({ content, language, onChange, fileId, editable = true }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const suppressUpdate = useRef(false);
  const loadedFile = useRef("");
  const editableComp = useRef(new Compartment());

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const langSupport = getLanguageSupport(language);
    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      history(),
      foldGutter(),
      drawSelection(),
      rectangularSelection(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      highlightSelectionMatches(),
      codorumTheme,
      syntaxHighlighting(codorumHighlight),
      editableComp.current.of(EditorView.editable.of(editable)),
      EditorView.lineWrapping,
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        indentWithTab,
      ]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !suppressUpdate.current) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
    ];

    if (langSupport) {
      extensions.push(langSupport);
    }

    const state = EditorState.create({
      doc: content,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    loadedFile.current = fileId;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only recreate on mount — content/fileId changes handled by the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync content when file changes (external reload)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (loadedFile.current === fileId) return;
    loadedFile.current = fileId;

    suppressUpdate.current = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content },
    });
    suppressUpdate.current = false;
  }, [fileId, content]);

  // Sync editable state
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: editableComp.current.reconfigure(EditorView.editable.of(editable)),
    });
  }, [editable]);

  return <div ref={containerRef} className="code-editor-wrap" />;
}
