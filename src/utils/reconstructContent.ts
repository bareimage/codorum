import { applyPatch } from "diff";
import type { FileSnapshot } from "../types/files";

/**
 * Reconstruct file content at a given snapshot index.
 * Applies patches forward from empty to build the target state.
 * Falls back to reverse from current content if forward fails.
 */
export function reconstructAtSnapshot(
  currentContent: string,
  history: FileSnapshot[],
  targetIdx: number,
): string {
  // If target is the last snapshot, current content IS the answer
  if (targetIdx >= history.length - 1) return currentContent;

  // Forward: start from empty, apply patches 0..targetIdx
  let content = "";
  let forwardOk = true;
  for (let i = 0; i <= targetIdx; i++) {
    const patch = history[i].patch;
    if (!patch) continue;
    const result = applyPatch(content, patch);
    if (typeof result === "string") {
      content = result;
    } else {
      forwardOk = false;
      break;
    }
  }
  if (forwardOk) return content;

  // Fallback: reverse from current content
  content = currentContent;
  for (let i = history.length - 1; i > targetIdx; i--) {
    const patch = history[i].patch;
    if (!patch) continue;
    // Manually reverse: swap + and - lines, swap hunk old/new
    const reversed = reverseUnifiedPatch(patch);
    const result = applyPatch(content, reversed);
    if (typeof result === "string") {
      content = result;
    }
  }
  return content;
}

/** Reverse a unified diff patch string: swap +/- lines and hunk headers. */
function reverseUnifiedPatch(patch: string): string {
  return patch.split("\n").map((line) => {
    if (line.startsWith("--- ")) return "+++ " + line.slice(4);
    if (line.startsWith("+++ ")) return "--- " + line.slice(4);
    if (line.startsWith("@@")) {
      return line.replace(
        /@@ -(\d+(?:,\d+)?) \+(\d+(?:,\d+)?) @@/,
        "@@ -$2 +$1 @@",
      );
    }
    if (line.startsWith("+") && !line.startsWith("+++")) return "-" + line.slice(1);
    if (line.startsWith("-") && !line.startsWith("---")) return "+" + line.slice(1);
    return line;
  }).join("\n");
}
