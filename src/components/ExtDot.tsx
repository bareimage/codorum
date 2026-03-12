const EXT_COLORS: Record<string, string> = {
  md: "var(--accent)",
  markdown: "var(--accent)",
  mdx: "var(--accent)",
  ts: "var(--accent-2)",
  tsx: "var(--accent-2)",
  rs: "var(--accent-danger)",
  css: "var(--accent-3)",
  scss: "var(--accent-3)",
  js: "var(--accent-warn)",
  jsx: "var(--accent-warn)",
  py: "var(--accent-3)",
  go: "var(--accent)",
  html: "var(--accent-danger)",
  json: "var(--accent-warn)",
  yaml: "var(--accent-3)",
  yml: "var(--accent-3)",
  toml: "var(--accent-3)",
};

interface ExtDotProps {
  extension: string;
  size?: number;
}

export function ExtDot({ extension, size = 7 }: ExtDotProps) {
  const color = EXT_COLORS[extension.toLowerCase()] || "var(--text-muted)";
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

ExtDot.getColor = (extension: string): string => {
  return EXT_COLORS[extension.toLowerCase()] || "var(--text-muted)";
};
