import { useMemo } from "react";
import { marked } from "marked";
import { buildAnnotatedLines } from "../utils/diffUtils";
import type { FileSnapshot } from "../types/files";

export function MarkdownDiffView({ snap, content }: { snap: FileSnapshot; content?: string | null }) {
  const blocks = useMemo(() => {
    const lines = buildAnnotatedLines(content ?? null, snap.patch ?? null);
    const groups: { type: "ctx" | "add" | "del"; text: string }[] = [];
    for (const line of lines) {
      const last = groups[groups.length - 1];
      if (last && last.type === line.type) last.text += "\n" + line.text;
      else groups.push({ type: line.type, text: line.text });
    }
    return groups.map((g) => ({
      type: g.type,
      html: marked.parse(g.text) as string,
    }));
  }, [snap.timestamp]);

  return (
    <div className="md-diff-view">
      {blocks.map((block, i) => (
        <div
          key={i}
          className={`mdd-block mdd-${block.type}`}
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      ))}
    </div>
  );
}
