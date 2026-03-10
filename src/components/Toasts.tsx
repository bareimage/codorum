import { useToastStore } from "../stores/toast-store";

export function Toasts() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-8 right-4 flex flex-col-reverse gap-1.5 z-[400] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="font-mono text-[11px] py-2 px-3.5 rounded-lg flex items-center gap-2 pointer-events-auto"
          style={{
            background: "var(--bg-hover)",
            border: "1px solid var(--border-light)",
            boxShadow: "var(--shadow-soft)",
            color: "var(--text-secondary)",
            animation: t.exiting
              ? "toastOut 140ms ease-in forwards"
              : "toastIn 200ms cubic-bezier(.34,1.56,.64,1)",
          }}
        >
          <span
            className="font-semibold"
            style={{
              color:
                t.color === "rose"
                  ? "var(--accent-rose)"
                  : t.color === "amber"
                    ? "var(--accent-amber)"
                    : "var(--accent-cyan)",
            }}
          >
            {t.text}
          </span>
          {t.detail && (
            <span style={{ color: "var(--text-muted)" }}>{t.detail}</span>
          )}
        </div>
      ))}
    </div>
  );
}
