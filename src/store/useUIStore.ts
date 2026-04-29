import { create } from 'zustand';

// Top-level screen state. DESIGN §14 lists 'menu' | 'host-lobby' |
// 'join-lobby' | 'game' | 'results'; Phase 4 only needs the first two.
// Lobbies arrive in Phase 5, results screen in Phase 6.
export type Screen = 'menu' | 'game';

interface UIStore {
  screen: Screen;
  setScreen: (screen: Screen) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  screen: 'menu',
  setScreen: (screen) => set({ screen }),
}));
