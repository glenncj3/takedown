import { create } from 'zustand';
import {
  getStoredDisplayName,
  setStoredDisplayName,
} from '../net/storage';

export type Screen =
  | 'menu'
  | 'host-lobby'
  | 'join-lobby'
  | 'game'
  | 'results'
  | 'desync';

interface UIStore {
  screen: Screen;
  displayName: string;
  // Last user-visible error toast (e.g. "Room ABC234 not found"). null
  // when there's nothing to show. Components can clear it on dismiss.
  toast: string | null;
  // Card-instance currently being inspected via press-and-hold. null
  // when nothing is held. Set when a long-press fires; cleared on release.
  inspectedInstanceId: string | null;

  setScreen: (screen: Screen) => void;
  setDisplayName: (name: string) => void;
  setToast: (toast: string | null) => void;
  setInspectedInstanceId: (id: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  screen: 'menu',
  displayName: getStoredDisplayName(),
  toast: null,
  inspectedInstanceId: null,

  setScreen: (screen) => set({ screen }),
  setDisplayName: (name) => {
    setStoredDisplayName(name);
    set({ displayName: name });
  },
  setToast: (toast) => set({ toast }),
  setInspectedInstanceId: (id) => set({ inspectedInstanceId: id }),
}));
