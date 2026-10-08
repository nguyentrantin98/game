import type { Element } from './elements';
import sam from './data/weapons/sam.json';
import gau from './data/weapons/gau.json';
import tacke from './data/weapons/tacke.json';
import dieuhau from './data/weapons/dieuhau.json';
import ocvit from './data/weapons/ocvit.json';
import phuong from './data/weapons/phuong.json';
import chop from './data/weapons/chop.json';
import sen from './data/weapons/sen.json';
import skins from './data/skins.json';

export type UltKind = 'double' | 'crater' | 'bounce3' | 'pierce' | 'shield' | 'split3' | 'chain' | 'heal';

export interface WeaponDef {
  id: string;
  order: number;
  name: string;
  role: string;
  weapon: string;
  skill: string;
  desc: string;
  colors: { color: string; dark: string; bg: string };
  stats: { hp: number; atk: number; rng: number; wind: number };
  maxHp: number;
  damage: number;
  radius: number;
  windK: number;
  speedK: number;
  delay: number;
  heavyDelay: number;
  ultDelay: number;
  ult: UltKind;
}

export interface SkinDef {
  id: string;
  base: string;
  name: string;
  myth: string;
  el: Element;
  weapon: string;
  skill: string;
  desc: string;
  robe: string;
  trim: string;
  bg: string;
  model: string;
}

export const CHARACTERS: WeaponDef[] = [sam, gau, tacke, dieuhau, ocvit, phuong, chop, sen] as WeaponDef[];
export const SKINS: SkinDef[] = skins as SkinDef[];

const byId = new Map(CHARACTERS.map((c) => [c.id, c]));
const skinById = new Map(SKINS.map((s) => [s.id, s]));

export function getCharacter(id: string): WeaponDef {
  const c = byId.get(id);
  if (!c) throw new Error(`Unknown character ${id}`);
  return c;
}

export function getSkin(id?: string | null): SkinDef | undefined {
  return id ? skinById.get(id) : undefined;
}

export const ITEM_IDS = ['heal', 'double', 'teleport'] as const;
export type ItemId = (typeof ITEM_IDS)[number];
