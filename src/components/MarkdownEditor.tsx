import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
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
import { editorContentMap } from "../stores/app-store";

export interface MarkdownEditorHandle {
  getMarkdown: () => string;
}

interface Props {
  content: string;
  onChange: (md: string) => void;
  fileId: string;
  editable?: boolean;
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, Props>(
  function MarkdownEditor({ content, onChange, fileId, editable = true }, fwdRef) {
    const mdxRef = useRef<MDXEditorMethods>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useImperativeHandle(fwdRef, () => ({
      getMarkdown: () => mdxRef.current?.getMarkdown() ?? content,
    }), [content]);

    useEffect(() => {
      mdxRef.current?.setMarkdown(content);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileId]);

    const handleChange = (md: string) => {
      editorContentMap.set(fileId, md);
      onChangeRef.current(md);
    };

    return (
      <MDXEditor
        ref={mdxRef}
        markdown={content}
        onChange={handleChange}
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
);
