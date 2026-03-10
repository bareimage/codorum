import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    darkMode: true,
    background: "transparent",
    primaryColor: "#5bc4c4",
    primaryTextColor: "#e4e2dd",
    lineColor: "#65635f",
  },
});

function MermaidNodeView(props: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const code = props.node.attrs.code || "";

  useEffect(() => {
    if (!code.trim() || !containerRef.current) return;

    const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      })
      .catch((err) => {
        setError(err?.message || "Invalid mermaid syntax");
      });
  }, [code]);

  return (
    <NodeViewWrapper className="mermaid-block" contentEditable={false}>
      {error ? (
        <div className="mermaid-error">
          <span className="mermaid-error-label">mermaid error</span>
          <pre>{error}</pre>
        </div>
      ) : (
        <div ref={containerRef} className="mermaid-render" />
      )}
      <details className="mermaid-source">
        <summary>source</summary>
        <pre>{code}</pre>
      </details>
    </NodeViewWrapper>
  );
}

export const MermaidExtension = Node.create({
  name: "mermaidDiagram",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      code: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'pre[data-type="mermaid"]',
        getAttrs: (dom) => ({
          code: (dom as HTMLElement).textContent || "",
        }),
      },
      {
        tag: "pre",
        getAttrs: (dom) => {
          const code = (dom as HTMLElement).querySelector("code.language-mermaid");
          if (!code) return false;
          return { code: code.textContent || "" };
        },
        priority: 60,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(HTMLAttributes, { "data-type": "mermaid" }),
      ["code", {}, HTMLAttributes.code || ""],
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`\`\`\`mermaid\n${node.attrs.code}\n\`\`\``);
          state.closeBlock(node);
        },
        parse: {},
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  },
});
