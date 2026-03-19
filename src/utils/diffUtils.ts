export type AnnotatedLine = { text: string; type: "ctx" | "add" | "del" };

/**
 * Build annotated lines from content + patch, or from patch alone.
 * When content is null, only patch lines (context, added, removed) are returned.
 */
export function buildAnnotatedLines(
  content: string | null,
  patch: string | null,
): AnnotatedLine[] {
  // No patch: show content as context (or empty)
  if (!patch) {
    if (content) return content.split("\n").map((text) => ({ text, type: "ctx" }));
    return [];
  }

  // Patch-only mode: parse diff lines directly
  if (!content) {
    return parsePatchLines(patch);
  }

  // Full mode: merge content with patch for rich annotated view
  const contentLines = content.split("\n");
  const patchLines = patch.split("\n");
  const result: AnnotatedLine[] = [];
  const hunkRe = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
  let newLinePos = 0;
  let i = 0;

  // skip file headers
  while (i < patchLines.length && !patchLines[i].startsWith("@@")) i++;

  while (i < patchLines.length) {
    const hunkMatch = patchLines[i].match(hunkRe);
    if (hunkMatch) {
      const hunkNewStart = parseInt(hunkMatch[1]) - 1;
      while (newLinePos < hunkNewStart && newLinePos < contentLines.length) {
        result.push({ text: contentLines[newLinePos], type: "ctx" });
        newLinePos++;
      }
      i++;
      while (i < patchLines.length && !patchLines[i].startsWith("@@")) {
        const pl = patchLines[i];
        if (pl.startsWith("+") && !pl.startsWith("+++")) {
          result.push({ text: pl.slice(1), type: "add" });
          newLinePos++;
        } else if (pl.startsWith("-") && !pl.startsWith("---")) {
          result.push({ text: pl.slice(1), type: "del" });
        } else if (pl.startsWith(" ") || pl === "") {
          // Empty string handles diff tools that strip leading space from blank context lines
          result.push({ text: pl.startsWith(" ") ? pl.slice(1) : "", type: "ctx" });
          newLinePos++;
        }
        i++;
      }
    } else {
      i++;
    }
  }

  while (newLinePos < contentLines.length) {
    result.push({ text: contentLines[newLinePos], type: "ctx" });
    newLinePos++;
  }

  return result;
}

/** Parse a unified diff patch into annotated lines (no full content needed). */
function parsePatchLines(patch: string): AnnotatedLine[] {
  const lines = patch.split("\n");
  const result: AnnotatedLine[] = [];
  for (const line of lines) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("@@")) continue;
    if (line.startsWith("+")) {
      result.push({ text: line.slice(1), type: "add" });
    } else if (line.startsWith("-")) {
      result.push({ text: line.slice(1), type: "del" });
    } else if (line.startsWith(" ")) {
      result.push({ text: line.slice(1), type: "ctx" });
    }
  }
  return result;
}
