import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import type { Editor, Range } from "@tiptap/core";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";

// ─── Slash menu items ──────────────────────────────

export interface SlashItem {
  title: string;
  description: string;
  icon: string;
  aliases: string[];
  command: (editor: Editor, range: Range) => void;
}

const SLASH_ITEMS: SlashItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: "H1",
    aliases: ["h1", "heading"],
    command: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "H2",
    aliases: ["h2", "subheading"],
    command: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: "H3",
    aliases: ["h3"],
    command: (e, r) => e.chain().focus().deleteRange(r).toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    description: "Unordered list",
    icon: "\u2022",
    aliases: ["ul", "bullets", "list"],
    command: (e, r) => e.chain().focus().deleteRange(r).toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "Ordered list",
    icon: "1.",
    aliases: ["ol", "numbered"],
    command: (e, r) => e.chain().focus().deleteRange(r).toggleOrderedList().run(),
  },
  {
    title: "Task List",
    description: "Checklist with checkboxes",
    icon: "\u2611",
    aliases: ["todo", "checklist", "checkbox"],
    command: (e, r) => e.chain().focus().deleteRange(r).toggleTaskList().run(),
  },
  {
    title: "Code Block",
    description: "Syntax-highlighted code",
    icon: "</>",
    aliases: ["code", "pre", "snippet"],
    command: (e, r) => e.chain().focus().deleteRange(r).toggleCodeBlock().run(),
  },
  {
    title: "Blockquote",
    description: "Quote or callout",
    icon: "\u201c",
    aliases: ["quote", "callout"],
    command: (e, r) => e.chain().focus().deleteRange(r).toggleBlockquote().run(),
  },
  {
    title: "Table",
    description: "Insert a 2\u00d73 table",
    icon: "\u229e",
    aliases: ["table", "grid"],
    command: (e, r) => e.chain().focus().deleteRange(r).insertTable({ rows: 2, cols: 3 }).run(),
  },
  {
    title: "Horizontal Rule",
    description: "Visual divider",
    icon: "\u2015",
    aliases: ["hr", "divider", "line"],
    command: (e, r) => e.chain().focus().deleteRange(r).setHorizontalRule().run(),
  },
  {
    title: "Image",
    description: "Embed an image by URL",
    icon: "\ud83d\uddbc",
    aliases: ["img", "picture"],
    command: (e, r) => {
      const url = window.prompt("Image URL");
      if (url) e.chain().focus().deleteRange(r).setImage({ src: url }).run();
    },
  },
];

function filterItems(query: string): SlashItem[] {
  const q = query.toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.aliases.some((a) => a.includes(q)),
  );
}

// ─── Dropdown component ────────────────────────────

interface SlashMenuListProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

export interface SlashMenuListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

export const SlashMenuList = forwardRef<SlashMenuListHandle, SlashMenuListProps>(
  ({ items, command }, ref) => {
    const [idx, setIdx] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => setIdx(0), [items]);

    useLayoutEffect(() => {
      const el = listRef.current?.children[idx] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }, [idx]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === "ArrowUp") {
          setIdx((i) => (i <= 0 ? items.length - 1 : i - 1));
          return true;
        }
        if (event.key === "ArrowDown") {
          setIdx((i) => (i >= items.length - 1 ? 0 : i + 1));
          return true;
        }
        if (event.key === "Enter") {
          if (items[idx]) command(items[idx]);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="slash-menu">
          <div style={{ padding: "8px 12px", color: "var(--tx3)", fontSize: 12 }}>No results</div>
        </div>
      );
    }

    return (
      <div className="slash-menu" ref={listRef}>
        {items.map((item, i) => (
          <button
            key={item.title}
            className={`slash-menu-item${i === idx ? " is-selected" : ""}`}
            onClick={() => command(item)}
            onMouseEnter={() => setIdx(i)}
          >
            <span className="slash-menu-icon">{item.icon}</span>
            <span className="slash-menu-text">
              <span className="slash-menu-title">{item.title}</span>
              <span className="slash-menu-desc">{item.description}</span>
            </span>
          </button>
        ))}
      </div>
    );
  },
);

// ─── Tiptap extension ──────────────────────────────

export function createSlashExtension() {
  let component: { ref: SlashMenuListHandle | null; dom: HTMLDivElement | null; root: any } = {
    ref: null,
    dom: null,
    root: null,
  };

  return Extension.create({
    name: "slashCommand",

    addOptions() {
      return {
        suggestion: {
          char: "/",
          startOfLine: false,
          items: ({ query }: { query: string }) => filterItems(query),
          render: () => {
            return {
              onStart: (props: SuggestionProps) => {
                component.dom = document.createElement("div");
                component.dom.style.position = "absolute";
                component.dom.style.zIndex = "600";
                document.body.appendChild(component.dom);

                const rect = props.clientRect?.();
                if (rect && component.dom) {
                  component.dom.style.left = `${rect.left}px`;
                  component.dom.style.top = `${rect.bottom + 4}px`;
                }

                // Render with React 18 createRoot
                import("react-dom/client").then(({ createRoot }) => {
                  if (!component.dom) return;
                  component.root = createRoot(component.dom);
                  const refCb = (handle: SlashMenuListHandle | null) => {
                    component.ref = handle;
                  };
                  component.root.render(
                    <SlashMenuList
                      ref={refCb}
                      items={props.items as SlashItem[]}
                      command={(item: SlashItem) => {
                        props.command(item);
                      }}
                    />,
                  );
                });
              },

              onUpdate: (props: SuggestionProps) => {
                const rect = props.clientRect?.();
                if (rect && component.dom) {
                  component.dom.style.left = `${rect.left}px`;
                  component.dom.style.top = `${rect.bottom + 4}px`;
                }
                if (component.root) {
                  const refCb = (handle: SlashMenuListHandle | null) => {
                    component.ref = handle;
                  };
                  component.root.render(
                    <SlashMenuList
                      ref={refCb}
                      items={props.items as SlashItem[]}
                      command={(item: SlashItem) => {
                        props.command(item);
                      }}
                    />,
                  );
                }
              },

              onKeyDown: (props: SuggestionKeyDownProps) => {
                if (props.event.key === "Escape") return false;
                return component.ref?.onKeyDown(props) ?? false;
              },

              onExit: () => {
                component.root?.unmount();
                component.dom?.remove();
                component.dom = null;
                component.root = null;
                component.ref = null;
              },
            };
          },
          command: ({
            editor,
            range,
            props,
          }: {
            editor: Editor;
            range: Range;
            props: SlashItem;
          }) => {
            props.command(editor, range);
          },
        },
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ];
    },
  });
}
