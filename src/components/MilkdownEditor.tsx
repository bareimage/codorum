import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Crepe, CrepeFeature } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import { editorContentMap } from "../stores/app-store";

export interface MilkdownEditorHandle {
  getMarkdown: () => string;
}

interface Props {
  content: string;
  onChange: (md: string) => void;
  fileId: string;
  editable?: boolean;
}

export const MilkdownEditor = forwardRef<MilkdownEditorHandle, Props>(
  function MilkdownEditor({ content, onChange, fileId, editable = true }, fwdRef) {
    const containerRef = useRef<HTMLDivElement>(null);
    const crepeRef = useRef<Crepe | null>(null);
    const contentRef = useRef(content);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useImperativeHandle(fwdRef, () => ({
      getMarkdown: () => {
        return editorContentMap.get(fileId) ?? contentRef.current;
      },
    }), [fileId]);

    useEffect(() => {
      if (!containerRef.current) return;

      const crepe = new Crepe({
        root: containerRef.current,
        defaultValue: content,
        featureConfigs: {
          [CrepeFeature.CodeMirror]: {
            languages: [],
          },
        },
      });

      crepe.on((listener: any) => {
        listener.markdownUpdated((_ctx: any, md: string) => {
          contentRef.current = md;
          editorContentMap.set(fileId, md);
          onChangeRef.current(md);
        });
      });

      crepe.create().then(() => {
        crepeRef.current = crepe;
        if (!editable) {
          crepe.setReadonly(true);
        }
      });

      return () => {
        crepe.destroy();
        crepeRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileId]);

    useEffect(() => {
      if (crepeRef.current) {
        crepeRef.current.setReadonly(!editable);
      }
    }, [editable]);

    return (
      <div
        ref={containerRef}
        className="milkdown-container"
        style={{ minHeight: 100 }}
      />
    );
  }
);
