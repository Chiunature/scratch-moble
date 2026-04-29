import { create } from 'zustand';

type RuntimeState = {
  ticks: number;
  increment: () => void;
  reset: () => void;
};

export const useRuntimeStore = create<RuntimeState>(set => ({
  ticks: 0,
  increment: () => set(state => ({ ticks: state.ticks + 1 })),
  reset: () => set({ ticks: 0 }),
}));
