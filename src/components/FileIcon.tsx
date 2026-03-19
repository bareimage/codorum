import {
  FileText,
  FileCode,
  Braces,
  Cog,
  Terminal,
  Paintbrush,
  Code,
  SlidersHorizontal,
  Hexagon,
  SquareTerminal,
  Database,
  Cpu,
  Coffee,
  Gem,
  Zap,
  Moon,
  Puzzle,
  AlignLeft,
  Box,
  File,
  type LucideIcon,
} from "lucide-react";
import { ExtDot } from "./ExtDot";

const ICON_MAP: Record<string, LucideIcon> = {
  md: FileText,
  markdown: FileText,
  mdx: FileText,
  ts: FileCode,
  tsx: FileCode,
  js: Braces,
  jsx: Braces,
  rs: Cog,
  py: Terminal,
  css: Paintbrush,
  scss: Paintbrush,
  less: Paintbrush,
  html: Code,
  xml: Code,
  json: Braces,
  jsonc: Braces,
  yaml: SlidersHorizontal,
  yml: SlidersHorizontal,
  toml: SlidersHorizontal,
  go: Hexagon,
  sh: SquareTerminal,
  bash: SquareTerminal,
  zsh: SquareTerminal,
  sql: Database,
  c: Cpu,
  cpp: Cpu,
  h: Cpu,
  hpp: Cpu,
  java: Coffee,
  kt: Coffee,
  rb: Gem,
  swift: Zap,
  lua: Moon,
  zig: Puzzle,
  txt: AlignLeft,
  log: AlignLeft,
  dockerfile: Box,
  makefile: Box,
};

interface FileIconProps {
  extension: string;
  size?: number;
}

export function FileIcon({ extension, size = 14 }: FileIconProps) {
  const ext = extension.toLowerCase();
  const Icon = ICON_MAP[ext] || File;
  const color = ExtDot.getColor(extension);

  return <Icon size={size} className="file-icon" style={{ color }} />;
}
