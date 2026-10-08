import { z } from 'zod';
import { CHARACTERS, ITEM_IDS, SKINS } from './weapons';

const charIds = CHARACTERS.map((c) => c.id) as [string, ...string[]];
const skinIds = SKINS.map((s) => s.id) as [string, ...string[]];

export const QueueJoinSchema = z.object({
  mode: z.enum(['practice', 'ranked']),
  charId: z.enum(charIds),
  skinId: z.enum(skinIds).nullable().optional(),
});
export type QueueJoin = z.infer<typeof QueueJoinSchema>;

export const FireSchema = z.object({
  angle: z.number().min(0).max(90),
  power: z.number().min(10).max(100),
  dir: z.union([z.literal(1), z.literal(-1)]),
  mode: z.enum(['normal', 'heavy', 'ult']),
  item: z.enum(ITEM_IDS).nullable().optional(),
});

export const MoveSchema = z.object({ dx: z.number().min(-20).max(20) });

/** Tên event WebSocket — client ↔ server. */
export const WS = {
  queueJoin: 'queue:join',
  queueLeave: 'queue:leave',
  queueWaiting: 'queue:waiting',
  battleStart: 'battle:start',
  battleTurn: 'battle:turn',
  battleFire: 'battle:fire',
  battleMove: 'battle:move',
  battleMoved: 'battle:moved',
  battleShot: 'battle:shot',
  battleEnd: 'battle:end',
  battleResume: 'battle:resume',
  battleLeave: 'battle:leave',
  error: 'error:msg',
} as const;

export interface TurnInfo {
  turn: number;
  currentId: string;
  wind: number;
  deadline: number;
}

export interface BattleEnd {
  winnerTeam: 0 | 1 | null;
  rewards: Record<string, { gold: number; exp: number; elo: number; win: boolean; mvp: boolean }>;
}
