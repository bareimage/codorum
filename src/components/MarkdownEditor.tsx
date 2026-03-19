import { useRef, useEffect } from "react";
import {
  MDXEditor,
  type MDXEditorMethods,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  tablePlugin,
  linkPlugin,
  codeBlockPlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
} from "@mdxeditor/editor";
// style.css is imported globally in main.tsx (before app.css) so overrides work

interface Props {
  content: string;
  onChange: (md: string) => void;
  fileId: string;
  editable?: boolean;
}

export function MarkdownEditor({ content, onChange, fileId, editable = true }: Props) {
  const ref = useRef<MDXEditorMethods>(null);

  useEffect(() => {
    ref.current?.setMarkdown(content);
    // Only sync when switching files — external changes cause full remount via key prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  return (
    <MDXEditor
      ref={ref}
      markdown={content}
      onChange={onChange}
      readOnly={!editable}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        tablePlugin(),
        linkPlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: "txt" }),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
      ]}
    />
  );
}
