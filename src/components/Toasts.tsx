import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { useToastStore } from "../stores/toast-store";

function ToastItem({ t }: { t: { id: string; text: string; detail: string; color: "cyan" | "rose" | "amber"; exiting: boolean } }) {
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  // Enter animation
  useEffect(() => {
    if (ref.current && !animated.current) {
      animated.current = true;
      animate(ref.current, {
        translateX: [16, 0],
        opacity: [0, 1],
        duration: 200,
        ease: "outCubic",
      });
    }
  }, []);

  // Exit animation
  useEffect(() => {
    if (t.exiting && ref.current) {
      animate(ref.current, {
        translateX: [0, 24],
        opacity: [1, 0],
        duration: 140,
        ease: "inCubic",
      });
    }
  }, [t.exiting]);

  return (
    <div ref={ref} className="toast" style={{ opacity: 0 }}>
      <span
        className="toast-dot"
        style={{
          background:
            t.color === "rose"
              ? "var(--danger)"
              : t.color === "amber"
                ? "var(--warn)"
                : "var(--ac)",
        }}
      />
      <span className="toast-text">{t.text}</span>
      {t.detail && <span className="toast-detail">{t.detail}</span>}
    </div>
  );
}

export function Toasts() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="toasts">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}
