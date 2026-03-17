export interface FileItem {
  id: string;
  name: string;
  ext: string;
  group?: string;
  modified: number;
  added?: number;
  removed?: number;
  deleted?: boolean;
  content: string;
  pinned?: boolean;
}

export interface Group {
  id: string;
  name: string;
  fileIds: string[];
  ejectable?: boolean;
}

export interface Command {
  type: 'cmd' | 'sep';
  id?: string;
  label: string;
  icon?: string;
  kbd?: string;
  sub?: string;
}

export interface Toast {
  id: string;
  text: string;
  detail?: string;
  color?: string;
}
