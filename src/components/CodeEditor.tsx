import { useEffect, useRef } from "react";
import { editorContentMap, useAppStore } from "../stores/app-store";
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

// ─── Per-theme syntax palettes ───────────────────

const SYNTAX_THEMES: Record<string, Record<string, string>> = {
  n01z: {
    keyword: "#569CD6", string: "#CE9178", comment: "#6A9955",
    number: "#B5CEA8", type: "#4EC9B0", fn: "#DCDCAA",
    variable: "#9CDCFE", property: "#9CDCFE", operator: "#C8C8C8",
    punctuation: "#808080", meta: "#C586C0", regexp: "#D16969",
  },
  paper: {
    keyword: "#1A1A8B", string: "#B33000", comment: "#8E8E93",
    number: "#7A3E00", type: "#6E358B", fn: "#2D6B4F",
    variable: "#2B4570", property: "#2D6B4F", operator: "#333333",
    punctuation: "#AAAAAA", meta: "#6E358B", regexp: "#B33000",
  },
  phosphor: {
    keyword: "#00FF88", string: "#A8FF60", comment: "#338833",
    number: "#FFDD00", type: "#00DDFF", fn: "#44FFAA",
    variable: "#AAFFDD", property: "#66FFCC", operator: "#88CC88",
    punctuation: "#447744", meta: "#00CC99", regexp: "#FF8866",
  },
  ember: {
    keyword: "#FF7B72", string: "#A5D6FF", comment: "#8B949E",
    number: "#79C0FF", type: "#FFA657", fn: "#D2A8FF",
    variable: "#C9D1D9", property: "#79C0FF", operator: "#C9D1D9",
    punctuation: "#6E7681", meta: "#FFA657", regexp: "#FF7B72",
  },
};

function buildHighlightStyle(theme: string) {
  const c = SYNTAX_THEMES[theme] || SYNTAX_THEMES.n01z;
  return HighlightStyle.define([
    { tag: tags.keyword, color: c.keyword, fontWeight: "600" },
    { tag: tags.name, color: c.variable },
    { tag: tags.string, color: c.string },
    { tag: tags.comment, color: c.comment, fontStyle: "italic" },
    { tag: tags.number, color: c.number },
    { tag: tags.typeName, color: c.type },
    { tag: tags.className, color: c.type },
    { tag: tags.function(tags.variableName), color: c.fn },
    { tag: tags.attributeName, color: c.property },
    { tag: tags.variableName, color: c.variable },
    { tag: tags.regexp, color: c.regexp },
    { tag: tags.bool, color: c.number },
    { tag: tags.operator, color: c.operator },
    { tag: tags.punctuation, color: c.punctuation },
    { tag: tags.meta, color: c.meta },
    { tag: tags.strong, fontWeight: "700" },
    { tag: tags.emphasis, fontStyle: "italic" },
    { tag: tags.heading, color: c.keyword, fontWeight: "600" },
    { tag: tags.propertyName, color: c.property },
  ]);
}

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
    case "fs": case "vs": case "frag": case "vert": case "glsl":
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
  const fileIdRef = useRef(fileId);
  fileIdRef.current = fileId;
  const suppressUpdate = useRef(false);
  const loadedFile = useRef("");
  const editableComp = useRef(new Compartment());
  const highlightComp = useRef(new Compartment());
  const theme = useAppStore((s) => s.theme);

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
      highlightComp.current.of(syntaxHighlighting(buildHighlightStyle(theme))),
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
          const doc = update.state.doc.toString();
          editorContentMap.set(fileIdRef.current, doc);
          onChangeRef.current(doc);
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
    // Recreate when language changes so highlighting applies correctly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

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

  // Swap syntax highlighting when theme changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: highlightComp.current.reconfigure(syntaxHighlighting(buildHighlightStyle(theme))),
    });
  }, [theme]);

  return <div ref={containerRef} className="code-editor-wrap" />;
}
