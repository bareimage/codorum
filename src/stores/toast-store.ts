import { create } from "zustand";

interface Toast {
  id: string;
  text: string;
  detail: string;
  color: "cyan" | "rose" | "amber";
  exiting: boolean;
}

interface ToastState {
  toasts: Toast[];
  add: (text: string, detail: string, color?: "cyan" | "rose" | "amber") => void;
  dismiss: (id: string) => void;
  remove: (id: string) => void;
}

let toastCounter = 0;
const timerMap = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  add: (text, detail, color = "cyan") => {
    const id = `toast-${++toastCounter}`;
    set((s) => ({
      toasts: [...s.toasts, { id, text, detail, color, exiting: false }],
    }));
    // Auto-dismiss with cancelable timers
    const exitTimer = setTimeout(() => {
      set((s) => ({
        toasts: s.toasts.map((t) =>
          t.id === id ? { ...t, exiting: true } : t,
        ),
      }));
      const removeTimer = setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        timerMap.delete(id);
      }, 150);
      timerMap.set(id, removeTimer);
    }, 2600);
    timerMap.set(id, exitTimer);
  },

  dismiss: (id) => {
    const timer = timerMap.get(id);
    if (timer) clearTimeout(timer);
    timerMap.delete(id);
    set((s) => ({
      toasts: s.toasts.map((t) =>
        t.id === id ? { ...t, exiting: true } : t,
      ),
    }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 150);
  },

  remove: (id) => {
    const timer = timerMap.get(id);
    if (timer) clearTimeout(timer);
    timerMap.delete(id);
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
