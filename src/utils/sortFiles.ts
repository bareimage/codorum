import type { WatchedFile } from "../types/files";

export function sortFiles(
  files: WatchedFile[],
  sortBy: "name" | "modified" | "changes",
): WatchedFile[] {
  const sorted = [...files];
  switch (sortBy) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "modified":
      sorted.sort((a, b) => b.modified - a.modified);
      break;
    case "changes":
      sorted.sort(
        (a, b) =>
          ((b.linesAdded || 0) + (b.linesRemoved || 0)) -
          ((a.linesAdded || 0) + (a.linesRemoved || 0)),
      );
      break;
  }
  return sorted;
}
