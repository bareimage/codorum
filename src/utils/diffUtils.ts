export type AnnotatedLine = { text: string; type: "ctx" | "add" | "del" };

export function buildAnnotatedLines(
  content: string,
  patch: string | null,
): AnnotatedLine[] {
  const contentLines = content.split("\n");
  if (!patch) return contentLines.map((text) => ({ text, type: "ctx" }));

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
        } else if (pl.startsWith(" ")) {
          result.push({ text: pl.slice(1), type: "ctx" });
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
