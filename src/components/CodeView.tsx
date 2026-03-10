import { useMemo } from "react";
import hljs from "highlight.js";
import DOMPurify from "dompurify";

// Map file extensions to highlight.js language names
const LANG_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  rs: "rust",
  py: "python",
  rb: "ruby",
  go: "go",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  java: "java",
  cs: "csharp",
  swift: "swift",
  kt: "kotlin",
  css: "css",
  scss: "scss",
  less: "less",
  html: "html",
  xml: "xml",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  lua: "lua",
  zig: "zig",
  toml: "ini",
  yaml: "yaml",
  yml: "yaml",
  json: "json",
  jsonc: "json",
  dockerfile: "dockerfile",
  makefile: "makefile",
  md: "markdown",
};

interface CodeViewProps {
  content: string;
  language: string;
}

export function CodeView({ content, language }: CodeViewProps) {
  const lang = LANG_MAP[language.toLowerCase()] || language;
  const lines = content.split("\n");

  const highlighted = useMemo(() => {
    const raw = hljs.getLanguage(lang)
      ? hljs.highlight(content, { language: lang }).value
      : hljs.highlightAuto(content).value;
    return DOMPurify.sanitize(raw);
  }, [content, lang]);

  const gutterWidth = String(lines.length).length;

  return (
    <div
      className="rounded-md overflow-hidden border"
      style={{
        background: "var(--bg-deep)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex">
        {/* Line numbers */}
        <div
          className="shrink-0 text-right select-none font-mono text-[12px] leading-[1.55] py-4 pr-3"
          style={{
            color: "var(--text-muted)",
            opacity: 0.35,
            paddingLeft: "12px",
            minWidth: `${gutterWidth + 3}ch`,
            background:
              "color-mix(in srgb, var(--bg-deep) 80%, var(--bg-card))",
            borderRight: "1px solid var(--border)",
          }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code */}
        <pre
          className="flex-1 overflow-x-auto font-mono text-[12.5px] leading-[1.55] p-4 m-0"
          style={{ color: "var(--text-primary)" }}
        >
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  );
}
