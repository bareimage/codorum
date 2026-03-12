import { useToastStore } from "../stores/toast-store";

export function Toasts() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.exiting ? "exiting" : "entering"}`}
        >
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
      ))}
    </div>
  );
}
