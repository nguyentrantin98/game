import { create } from 'zustand';
import {
  Terrain,
  type BattleEnd,
  type BattleState,
  type Dir,
  type ItemId,
  type ShotMode,
  type ShotResult,
  type TurnInfo,
} from '@army3d/shared';

export interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  big: boolean;
}

export interface HitLabel {
  key: number;
  kind: 'hit' | 'near' | 'miss';
  amount: number;
}

interface BattleStore {
  roomId: string | null;
  myId: string | null;
  state: BattleState | null;
  /** Địa hình cục bộ (mutable) — TerrainMesh dựng lại các chunk bị đổi theo `terrainVersion`. */
  terrain: Terrain | null;
  terrainVersion: number;
  dirtyRange: [number, number] | null;
  turn: TurnInfo | null;
  replay: { result: ShotResult; t0: number } | null;
  angle: number;
  power: number;
  shotMode: ShotMode;
  item: ItemId | null;
  facing: Dir;
  moveMode: boolean;
  charging: boolean;
  searching: boolean;
  hitLabel: HitLabel | null;
  floaters: Floater[];
  end: BattleEnd | null;
  /** Tọa độ x camera do người chơi kéo mini map (null = camera tự bám). */
  camPanX: number | null;
  set(p: Partial<BattleStore>): void;
  reset(): void;
}

const initial = {
  roomId: null,
  myId: null,
  state: null,
  terrain: null,
  terrainVersion: 0,
  dirtyRange: null,
  turn: null,
  replay: null,
  angle: 45,
  power: 60,
  shotMode: 'normal' as ShotMode,
  item: null,
  facing: 1 as Dir,
  moveMode: false,
  charging: false,
  searching: false,
  hitLabel: null,
  floaters: [],
  end: null,
  camPanX: null as number | null,
};

export const useBattle = create<BattleStore>((set) => ({
  ...initial,
  set: (p) => set(p),
  reset: () => set({ ...initial }),
}));

let fid = 0;
export function pushFloater(f: Omit<Floater, 'id'>) {
  const id = ++fid;
  useBattle.setState((s) => ({ floaters: [...s.floaters, { ...f, id }] }));
  setTimeout(() => useBattle.setState((s) => ({ floaters: s.floaters.filter((x) => x.id !== id) })), 1400);
}

/** Vùng camera đang nhìn (CameraRig ghi mỗi frame, MiniMap đọc để vẽ khung). */
export const camView = { x: 80, halfW: 30 };
