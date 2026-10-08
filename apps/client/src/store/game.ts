import { create } from 'zustand';
import type { Profile } from '../net/api';
import { storage } from '../net/api';

export type Screen = 'loading' | 'lobby' | 'select' | 'battle' | 'result';
export type PopupId = 'mode' | 'checkin' | 'mail' | 'settings' | 'collection' | 'rank' | 'soon';
export type Quality = 'low' | 'mid' | 'high' | 'auto';

export interface Settings {
  music: number;
  sfx: number;
  vibrate: boolean;
  quality: Quality;
  lang: string;
}

function loadSettings(): Settings {
  const def: Settings = { music: 0.6, sfx: 0.8, vibrate: true, quality: 'auto', lang: 'vi' };
  try {
    return { ...def, ...JSON.parse(storage.get('army3d.settings') || '{}') };
  } catch {
    return def;
  }
}

interface GameStore {
  screen: Screen;
  profile: Profile | null;
  mode: 'practice' | 'ranked';
  charId: string;
  skinOn: boolean;
  /** Hàng đợi popup: chỉ hiện 1 popup một lúc, đóng xong mở cái tiếp theo. */
  popups: PopupId[];
  toast: { id: number; text: string } | null;
  settings: Settings;
  tutorialDone: boolean;
  setScreen(s: Screen): void;
  setProfile(p: Profile): void;
  setMode(m: 'practice' | 'ranked'): void;
  setChar(id: string): void;
  setSkinOn(v: boolean): void;
  openPopup(p: PopupId): void;
  closePopup(): void;
  showToast(text: string): void;
  updateSettings(s: Partial<Settings>): void;
  finishTutorial(): void;
}

export const useGame = create<GameStore>((set, get) => ({
  screen: 'loading',
  profile: null,
  mode: 'practice',
  charId: storage.get('army3d.char') || 'sam',
  skinOn: false,
  popups: [],
  toast: null,
  settings: loadSettings(),
  tutorialDone: storage.get('army3d.tutorial') === '1',
  setScreen: (screen) => set({ screen, popups: [] }),
  setProfile: (profile) => set({ profile }),
  setMode: (mode) => set({ mode }),
  setChar: (charId) => {
    storage.set('army3d.char', charId);
    set({ charId });
  },
  setSkinOn: (skinOn) => set({ skinOn }),
  openPopup: (p) => set({ popups: get().popups.includes(p) ? get().popups : [...get().popups, p] }),
  closePopup: () => set({ popups: get().popups.slice(1) }),
  showToast: (text) => set({ toast: { id: Date.now(), text } }),
  updateSettings: (s) => {
    const settings = { ...get().settings, ...s };
    storage.set('army3d.settings', JSON.stringify(settings));
    set({ settings });
  },
  finishTutorial: () => {
    storage.set('army3d.tutorial', '1');
    set({ tutorialDone: true });
  },
}));
