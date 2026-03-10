import { useCallback, useRef } from "react";

interface ResizeHandleProps {
  onResize: (height: number) => void;
  onReset: () => void;
  bodyRef: React.RefObject<HTMLDivElement | null>;
}

export function ResizeHandle({ onResize, onReset, bodyRef }: ResizeHandleProps) {
  const dragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;

      const startY = e.clientY;
      const startHeight = bodyRef.current?.offsetHeight ?? 200;

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const newHeight = Math.max(80, startHeight + (ev.clientY - startY));
        onResize(newHeight);
      };

      const onUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [onResize, bodyRef],
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onReset();
      }}
      style={{
        height: 6,
        cursor: "ns-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0,
        transition: "opacity 150ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        if (!dragging.current) e.currentTarget.style.opacity = "0";
      }}
    >
      <div
        style={{
          width: 40,
          height: 2,
          borderRadius: 1,
          background: "var(--border-light)",
        }}
      />
    </div>
  );
}
