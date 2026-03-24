#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { basename, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { createPatch } from "diff";
import {
  listTrackedFiles,
  getSnapshots,
  getSnapshotById,
  getLatestSnapshot,
  pushSnapshot,
  removeSnapshots,
  type FileSnapshot,
  type TrackedFile,
} from "./db.js";

// ── Server ──

const server = new McpServer({
  name: "codorum",
  version: "0.1.0",
});

// ── Helpers ──

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toISOString();
}

function readFileSafe(path: string): string {
  if (!existsSync(path)) throw new Error(`File not found: ${path}`);
  return readFileSync(path, "utf-8");
}

function fileMeta(path: string) {
  const stat = statSync(path);
  return {
    name: basename(path, extname(path)),
    extension: extname(path).replace(".", "").toLowerCase(),
    size: stat.size,
    modified: Math.floor(stat.mtimeMs / 1000),
  };
}

// ── Tools ──

// 1. List all tracked files
server.tool(
  "list_files",
  "List all files Codorum is tracking, with snapshot counts and change stats",
  {},
  async () => {
    const files = listTrackedFiles();
    if (files.length === 0) {
      return { content: [{ type: "text", text: "No files are being tracked. Use add_file to start tracking." }] };
    }

    const lines = files.map((f) => {
      const alive = existsSync(f.file_path) ? "" : " [MISSING]";
      return [
        `${f.file_path}${alive}`,
        `  snapshots: ${f.snapshot_count}  |  +${f.total_added} -${f.total_removed}`,
        `  first: ${formatTimestamp(f.first_seen)}  |  last: ${formatTimestamp(f.last_modified)}`,
      ].join("\n");
    });

    return {
      content: [{ type: "text", text: `## Tracked Files (${files.length})\n\n${lines.join("\n\n")}` }],
    };
  }
);

// 2. Read a file's current content
server.tool(
  "read_file",
  "Read the current content of a tracked (or any) file from disk",
  { path: z.string().describe("Absolute file path") },
  async ({ path }) => {
    const content = readFileSafe(path);
    const meta = fileMeta(path);
    const latest = getLatestSnapshot(path);

    let header = `## ${meta.name}.${meta.extension}\n`;
    header += `Size: ${meta.size} bytes  |  Modified: ${formatTimestamp(meta.modified)}`;
    if (latest) {
      header += `\nLast snapshot: ${formatTimestamp(latest.timestamp)}  |  +${latest.lines_added} -${latest.lines_removed}`;
    }

    return {
      content: [
        { type: "text", text: header },
        { type: "text", text: `\`\`\`${meta.extension}\n${content}\n\`\`\`` },
      ],
    };
  }
);

// 3. File snapshot history
server.tool(
  "file_history",
  "Get the snapshot timeline for a file — shows when changes happened and their size",
  {
    path: z.string().describe("Absolute file path"),
    limit: z.number().optional().describe("Max snapshots to return (default: all)"),
  },
  async ({ path, limit }) => {
    let snaps = getSnapshots(path);
    if (snaps.length === 0) {
      return { content: [{ type: "text", text: `No snapshots found for ${path}` }] };
    }

    if (limit) snaps = snaps.slice(-limit);

    const lines = snaps.map((s, i) => {
      const kind = s.patch === null ? "initial" : "change";
      return `${i + 1}. [${formatTimestamp(s.timestamp)}] ${kind}  +${s.lines_added} -${s.lines_removed}  id:${s.id}`;
    });

    return {
      content: [{
        type: "text",
        text: `## History: ${path}\n${snaps.length} snapshot(s)\n\n${lines.join("\n")}`,
      }],
    };
  }
);

// 4. View a specific snapshot's diff
server.tool(
  "view_diff",
  "View the unified diff (patch) of a specific snapshot",
  { snapshot_id: z.string().describe("Snapshot UUID from file_history") },
  async ({ snapshot_id }) => {
    const snap = getSnapshotById(snapshot_id);
    if (!snap) {
      return { content: [{ type: "text", text: `Snapshot ${snapshot_id} not found` }] };
    }

    if (!snap.patch) {
      return {
        content: [{
          type: "text",
          text: `Snapshot ${snapshot_id} is the initial capture (no diff). +${snap.lines_added} lines.`,
        }],
      };
    }

    return {
      content: [{
        type: "text",
        text: `## Diff — ${formatTimestamp(snap.timestamp)}\n+${snap.lines_added} -${snap.lines_removed}\n\n\`\`\`diff\n${snap.patch}\n\`\`\``,
      }],
    };
  }
);

// 5. Add a file to tracking
server.tool(
  "add_file",
  "Start tracking a file — reads its content and creates an initial snapshot in the Codorum database",
  { path: z.string().describe("Absolute file path to start tracking") },
  async ({ path }) => {
    const content = readFileSafe(path);
    const lineCount = content.split("\n").length;

    const snap = {
      id: randomUUID(),
      timestamp: Math.floor(Date.now() / 1000),
      patch: null,
      lines_added: lineCount,
      lines_removed: 0,
    };

    pushSnapshot(path, snap);

    return {
      content: [{
        type: "text",
        text: `Now tracking: ${path}\nInitial snapshot created (${lineCount} lines).\nThe file will appear in Codorum next time it loads.`,
      }],
    };
  }
);

// 6. Save file content + create snapshot
server.tool(
  "save_file",
  "Write new content to a file and record a snapshot of the change in Codorum's history",
  {
    path: z.string().describe("Absolute file path"),
    content: z.string().describe("New file content to write"),
  },
  async ({ path, content }) => {
    const oldContent = existsSync(path) ? readFileSync(path, "utf-8") : "";

    if (oldContent === content) {
      return { content: [{ type: "text", text: "Content unchanged — no snapshot created." }] };
    }

    // Write to disk
    writeFileSync(path, content, "utf-8");

    // Create diff snapshot (mirrors Rust's create_snapshot)
    const patch = createPatch(path, oldContent, content, "", "", { context: 3 });
    const lines = patch.split("\n");
    const added = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
    const removed = lines.filter((l) => l.startsWith("-") && !l.startsWith("---")).length;

    const snap = {
      id: randomUUID(),
      timestamp: Math.floor(Date.now() / 1000),
      patch,
      lines_added: added,
      lines_removed: removed,
    };

    pushSnapshot(path, snap);

    return {
      content: [{
        type: "text",
        text: `Saved ${path}\nSnapshot: +${added} -${removed} lines`,
      }],
    };
  }
);

// 7. Summarize file activity
server.tool(
  "summarize_activity",
  "Analyze a file's change history and return an activity summary — velocity, patterns, and insights",
  {
    path: z.string().describe("Absolute file path"),
  },
  async ({ path }) => {
    const files = listTrackedFiles();
    const tracked = files.find((f) => f.file_path === path);
    if (!tracked) {
      return { content: [{ type: "text", text: `${path} is not tracked.` }] };
    }

    const snaps = getSnapshots(path);
    // TODO(human): Implement summarizeActivity — see below
    const summary = summarizeActivity(snaps, tracked);

    return { content: [{ type: "text", text: summary }] };
  }
);

// ── Activity summary logic ──

function summarizeActivity(snapshots: FileSnapshot[], tracked: TrackedFile): string {
  // TODO(human): Implement this function.
  //
  // Given an array of snapshots (ordered oldest→newest) and the tracked file
  // aggregate stats, return a markdown string summarizing the file's change
  // activity in a way that's useful for an AI assistant.
  //
  // Available data per snapshot:
  //   - timestamp (unix seconds)
  //   - patch (unified diff string, or null for initial)
  //   - lines_added / lines_removed
  //
  // Available from tracked:
  //   - file_path, snapshot_count, first_seen, last_modified
  //   - total_added, total_removed
  //
  // Ideas to consider:
  //   - Change velocity (edits per hour/day)
  //   - Burst detection (clusters of rapid edits)
  //   - Biggest single change
  //   - Add/remove ratio (growing file vs shrinking?)
  //   - Time since last edit
  //   - Active periods vs quiet periods
  //
  return "Activity summary not yet implemented.";
}

// ── Start ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
