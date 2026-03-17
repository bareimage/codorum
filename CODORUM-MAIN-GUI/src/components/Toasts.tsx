import React from 'react';
import { useAppContext } from '../AppContext';

export function Toasts() {
  const { toasts } = useAppContext();

  return (
    <div className="fixed bottom-8 right-4 flex flex-col-reverse gap-1.5 z-[400] pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="font-mono text-[11px] px-3.5 py-2 rounded-lg flex items-center gap-2 bg-[var(--hover)] border border-[var(--brd)] shadow-[0_1px_3px_rgba(0,0,0,0.12)] text-[var(--tx2)] pointer-events-auto animate-[toastIn_200ms_cubic-bezier(.34,1.56,.64,1)]"
        >
          <span className={`font-semibold text-[var(--${toast.color || 'cyan'})]`}>{toast.text}</span>
          {toast.detail && <span className="text-[var(--tx3)]">{toast.detail}</span>}
        </div>
      ))}
    </div>
  );
}
