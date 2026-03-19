import { useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { animate } from "animejs";

export function DropZone() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (overlayRef.current) {
      animate(overlayRef.current, {
        opacity: [0, 1],
        duration: 120,
        ease: "outCubic",
      });
    }
    if (boxRef.current) {
      animate(boxRef.current, {
        scale: [0.95, 1],
        opacity: [0, 1],
        duration: 200,
        ease: "outCubic",
      });
    }
  }, []);

  return (
    <div ref={overlayRef} className="dz-overlay" style={{ opacity: 0 }}>
      <div ref={boxRef} className="dz-box" style={{ opacity: 0 }}>
        <div className="dz-icon"><Upload size={48} /></div>
        <div className="dz-text">Drop files here</div>
        <div className="dz-sub">Files and folders will be added to your workspace</div>
      </div>
    </div>
  );
}
