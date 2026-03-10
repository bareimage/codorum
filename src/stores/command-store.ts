import { create } from "zustand";

interface CommandState {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

export const useCommandStore = create<CommandState>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
}));
