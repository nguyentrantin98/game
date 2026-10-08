import {
  BODY_CENTER_Y,
  BODY_RADIUS,
  FALL_Y,
  FIXED_DT,
  GRAVITY,
  MAX_SIM_STEPS,
  MOVE_PER_TURN,
  MUZZLE_OFFSET,
  POWER_TO_SPEED,
  RAGE_MAX,
  RAGE_PER_TURN,
  SKIP_DELAY,
  WIND_ACCEL,
  WORLD_WIDTH,
} from './constants';
import { elementMultiplier, type Element } from './elements';
import { Rng, round2 } from './rng';
import { generateTerrain, Terrain, type TerrainDiff } from './terrain';
import { getCharacter, getSkin, type ItemId } from './weapons';

export type Team = 0 | 1;
export type Dir = 1 | -1;
export type ShotMode = 'normal' | 'heavy' | 'ult';
export type BattleMode = 'practice' | 'ranked' | 'team';

export interface FireInput {
  angle: number;
  power: number;
  dir: Dir;
  mode: ShotMode;
  item?: ItemId | null;
}

export interface PlayerSpec {
  id: string;
  name: string;
  team: Team;
  charId: string;
  skinId?: string | null;
  isBot?: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  team: Team;
  charId: string;
  skinId: string | null;
  element: Element | null;
  x: number;
  y: number;
  facing: Dir;
  hp: number;
  maxHp: number;
  alive: boolean;
  delay: number;
  rage: number;
  items: Record<ItemId, number>;
  shield: number;
  moved: number;
  isBot: boolean;
}

export interface BattleState {
  seed: number;
  rng: number;
  mode: BattleMode;
  terrain: number[];
  players: PlayerState[];
  turn: number;
  currentId: string | null;
  wind: number;
  over: boolean;
  winnerTeam: Team | null;
}

export interface Track {
  startStep: number;
  /** x0,y0,x1,y1,... mỗi bước mô phỏng một điểm */
  points: number[];
  kind: ProjKind;
}

export interface Impact {
  kind: 'explode' | 'heal' | 'chain' | 'teleport' | 'out';
  x: number;
  y: number;
  radius: number;
  step: number;
  fromX?: number;
  fromY?: number;
}

export interface DamageEvent {
  targetId: string;
  /** âm = hồi máu */
  amount: number;
  step: number;
  crit: boolean;
}

export interface ShotResult {
  shooterId: string;
  input: FireInput;
  tracks: Track[];
  impacts: Impact[];
  damages: DamageEvent[];
  terrainDiff: TerrainDiff;
  players: PlayerState[];
  durationSteps: number;
  over: boolean;
  winnerTeam: Team | null;
}

type ProjKind = 'shell' | 'bounce' | 'split' | 'heal' | 'teleport' | 'chain';

interface Proj {
  x: number;
  y: number;
  vx: number;
  vy: number;
  windK: number;
  damage: number;
  radius: number;
  kind: ProjKind;
  bounces: number;
  startStep: number;
  track: Track;
  done: boolean;
}

// ───────────────────────── khởi tạo trận ─────────────────────────

export function createBattle(seed: number, specs: PlayerSpec[], mode: BattleMode = 'practice'): BattleState {
  const terrainHeights = generateTerrain(seed);
  const terrain = new Terrain(terrainHeights);
  const rng = new Rng(seed);
  const players: PlayerState[] = [];
  for (const team of [0, 1] as Team[]) {
    const members = specs.filter((s) => s.team === team);
    members.forEach((s, i) => {
      const def = getCharacter(s.charId);
      const skin = getSkin(s.skinId);
      const lo = team === 0 ? 14 : WORLD_WIDTH - 56;
      const span = 42;
      let x = lo + (span * (i + 0.5)) / members.length + rng.range(-3, 3);
      while (!terrain.solidAt(x) || terrain.heightAt(x) < 4) x += team === 0 ? 1 : -1;
      players.push({
        id: s.id,
        name: s.name,
        team,
        charId: def.id,
        skinId: skin?.id ?? null,
        element: skin?.el ?? null,
        x: round2(x),
        y: round2(terrain.heightAt(x)),
        facing: team === 0 ? 1 : -1,
        hp: def.maxHp,
        maxHp: def.maxHp,
        alive: true,
        delay: rng.int(0, 60),
        rage: 0,
        items: { heal: 1, double: 1, teleport: 1 },
        shield: 0,
        moved: 0,
        isBot: !!s.isBot,
      });
    });
  }
  const state: BattleState = {
    seed,
    rng: rng.state,
    mode,
    terrain: terrainHeights,
    players,
    turn: 0,
    currentId: null,
    wind: 0,
    over: false,
    winnerTeam: null,
  };
  nextTurn(state);
  return state;
}

/** Chọn lượt tiếp theo: người còn sống có delay thấp nhất. */
export function nextTurn(state: BattleState): PlayerState | null {
  if (state.over) return null;
  const alive = state.players.filter((p) => p.alive);
  if (!alive.length) return null;
  const minDelay = Math.min(...alive.map((p) => p.delay));
  for (const p of alive) p.delay -= minDelay;
  const cur = alive.reduce((a, b) => (b.delay < a.delay ? b : a));
  const rng = new Rng(state.rng);
  state.wind = rng.int(-10, 10);
  state.rng = rng.state;
  state.turn += 1;
  state.currentId = cur.id;
  cur.moved = 0;
  cur.shield = 0;
  cur.rage = Math.min(RAGE_MAX, cur.rage + RAGE_PER_TURN);
  return cur;
}

export function getPlayer(state: BattleState, id: string): PlayerState {
  const p = state.players.find((q) => q.id === id);
  if (!p) throw new Error(`Unknown player ${id}`);
  return p;
}

export function skipTurn(state: BattleState) {
  const cur = state.currentId ? getPlayer(state, state.currentId) : null;
  if (cur) cur.delay += SKIP_DELAY;
  nextTurn(state);
}

// ───────────────────────── di chuyển ─────────────────────────

/** Đi bộ theo địa hình, tối đa MOVE_PER_TURN mỗi lượt, không leo dốc quá đứng. */
export function applyMove(state: BattleState, id: string, dx: number): number {
  const p = getPlayer(state, id);
  if (state.over || state.currentId !== id || !p.alive) return p.x;
  const terrain = new Terrain(state.terrain);
  const dir: Dir = dx >= 0 ? 1 : -1;
  p.facing = dir;
  const budget = Math.min(Math.abs(dx), MOVE_PER_TURN - p.moved);
  let walked = 0;
  const stepLen = 0.25;
  while (walked + stepLen <= budget + 1e-9) {
    const nx = p.x + dir * stepLen;
    const nh = terrain.heightAt(nx);
    if (!(nh > 0.05) || nh - p.y > stepLen * 2.2) break;
    p.x = nx;
    p.y = nh;
    walked += stepLen;
  }
  p.moved += walked;
  p.x = round2(p.x);
  p.y = round2(terrain.heightAt(p.x));
  return p.x;
}

// ───────────────────────── bắn ─────────────────────────

export function clampInput(input: FireInput): FireInput {
  return {
    angle: Math.max(0, Math.min(90, Math.round(input.angle))),
    power: Math.max(10, Math.min(100, Math.round(input.power))),
    dir: input.dir === -1 ? -1 : 1,
    mode: input.mode,
    item: input.item ?? null,
  };
}

/**
 * Mô phỏng một lượt bắn. Hàm thuần, deterministic:
 * cùng state + input → cùng kết quả trên mọi máy. Đột biến `state` (server gọi trực tiếp).
 */
export function applyFire(state: BattleState, shooterId: string, rawInput: FireInput): ShotResult {
  const input = clampInput(rawInput);
  const shooter = getPlayer(state, shooterId);
  const def = getCharacter(shooter.charId);
  const terrain = new Terrain(state.terrain);
  const damages: DamageEvent[] = [];
  const impacts: Impact[] = [];
  const terrainDiff: TerrainDiff = [];
  const tracks: Track[] = [];

  let mode = input.mode;
  if (mode === 'ult' && shooter.rage < RAGE_MAX) mode = 'normal';
  let item = input.item ?? null;
  if (item && shooter.items[item] <= 0) item = null;
  if (item) shooter.items[item] -= 1;

  let damage = def.damage;
  let radius = def.radius;
  let windK = def.windK;
  let delayAdd = def.delay;
  if (mode === 'heavy') {
    damage *= 1.35;
    radius *= 1.15;
    delayAdd = def.heavyDelay;
  }
  if (item === 'double') damage *= 2;
  if (item === 'heal') {
    const amt = Math.round(Math.min(shooter.maxHp - shooter.hp, shooter.maxHp * 0.3));
    shooter.hp += amt;
    damages.push({ targetId: shooter.id, amount: -amt, step: 0, crit: false });
  }

  const speed = input.power * POWER_TO_SPEED * def.speedK;
  const a = (input.angle * Math.PI) / 180;
  const ox = shooter.x + input.dir * MUZZLE_OFFSET.x;
  const oy = shooter.y + MUZZLE_OFFSET.y;
  const projs: Proj[] = [];
  const spawn = (kind: ProjKind, startStep: number, dmg: number, rad: number, k: number, spd = speed) => {
    const track: Track = { startStep, points: [], kind };
    tracks.push(track);
    projs.push({
      x: ox,
      y: oy,
      vx: input.dir * Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      windK: k,
      damage: dmg,
      radius: rad,
      kind,
      bounces: 0,
      startStep,
      track,
      done: false,
    });
  };

  if (item === 'teleport') {
    spawn('teleport', 0, 0, 0, windK);
  } else if (mode === 'ult') {
    shooter.rage = 0;
    delayAdd = def.ultDelay;
    switch (def.ult) {
      case 'double':
        spawn('shell', 0, damage, radius, windK);
        spawn('shell', 15, damage, radius, windK);
        break;
      case 'crater':
        spawn('shell', 0, damage * 1.25, radius * 1.8, windK);
        break;
      case 'bounce3':
        spawn('bounce', 0, damage * 1.2, radius, windK);
        projs[projs.length - 1].bounces = 2;
        break;
      case 'pierce':
        spawn('shell', 0, damage * 1.3, radius, windK * 0.3);
        break;
      case 'shield':
        shooter.shield = 1;
        spawn('shell', 0, damage * 0.8, radius, windK);
        spawn('shell', 20, damage * 0.35, radius * 0.6, windK, speed * 0.96);
        break;
      case 'split3':
        spawn('split', 0, damage * 0.55, radius * 0.8, windK);
        break;
      case 'chain':
        spawn('chain', 0, damage, radius, windK);
        break;
      case 'heal':
        spawn('heal', 0, damage, radius * 1.6, windK);
        break;
    }
  } else {
    spawn('shell', 0, damage, radius, windK);
  }

  const windAx = state.wind * WIND_ACCEL;
  const width = terrain.width;

  const hitPlayers = (x: number, y: number, rad: number, dmg: number, kind: ProjKind, step: number) => {
    const hit = new Set<string>();
    for (const p of state.players) {
      if (!p.alive) continue;
      const d = Math.hypot(p.x - x, p.y + BODY_CENTER_Y - y);
      const reach = rad + BODY_RADIUS;
      if (d >= reach) continue;
      const direct = d <= BODY_RADIUS;
      const f = direct ? 1 : 1 - 0.65 * ((d - BODY_RADIUS) / (reach - BODY_RADIUS));
      const ally = p.team === shooter.team;
      let amount: number;
      if (kind === 'heal') {
        amount = ally ? -Math.round(Math.min(p.maxHp - p.hp, 220 * f)) : Math.round(dmg * f * 0.4);
      } else {
        amount = dmg * f * elementMultiplier(shooter.element, p.element);
        if (p.shield > 0) amount *= 0.5;
        if (ally) amount *= 0.5;
        amount = Math.round(amount);
      }
      if (amount === 0) continue;
      p.hp = Math.max(0, Math.min(p.maxHp, p.hp - amount));
      if (amount > 0) p.rage = Math.min(RAGE_MAX, p.rage + 10);
      damages.push({ targetId: p.id, amount, step, crit: direct && amount > 0 });
      hit.add(p.id);
    }
    return hit;
  };

  const explode = (pr: Proj, x: number, y: number, step: number) => {
    pr.done = true;
    if (pr.kind === 'teleport') {
      impacts.push({ kind: 'teleport', x: round2(x), y: round2(y), radius: 0, step });
      if (terrain.solidAt(x)) {
        shooter.x = round2(Math.max(1, Math.min(width - 1, x)));
        shooter.y = round2(terrain.heightAt(shooter.x));
      }
      return;
    }
    const carveR = pr.kind === 'heal' ? pr.radius * 0.35 : pr.radius;
    terrainDiff.push(...terrain.carve(x, y, carveR));
    impacts.push({
      kind: pr.kind === 'heal' ? 'heal' : 'explode',
      x: round2(x),
      y: round2(y),
      radius: round2(pr.radius),
      step,
    });
    const hit = hitPlayers(x, y, pr.radius, pr.damage, pr.kind, step);
    if (pr.kind === 'chain') {
      const next = state.players
        .filter((p) => p.alive && p.team !== shooter.team && !hit.has(p.id))
        .map((p) => ({ p, d: Math.hypot(p.x - x, p.y - y) }))
        .filter((o) => o.d < 14)
        .sort((m, n) => m.d - n.d)[0];
      if (next) {
        const t = next.p;
        const cx = t.x;
        const cy = t.y + BODY_CENTER_Y;
        impacts.push({
          kind: 'chain',
          x: round2(cx),
          y: round2(cy),
          radius: 1.5,
          step: step + 10,
          fromX: round2(x),
          fromY: round2(y),
        });
        hitPlayers(cx, cy, 1.0, pr.damage * 0.55, 'shell', step + 10);
      }
    }
  };

  let lastStep = 0;
  for (let s = 0; s < MAX_SIM_STEPS; s++) {
    let pending = false;
    for (let i = 0; i < projs.length; i++) {
      const pr = projs[i];
      if (pr.done) continue;
      pending = true;
      if (s < pr.startStep) continue;
      if (s === pr.startStep) pr.track.points.push(round2(pr.x), round2(pr.y));
      pr.vx += windAx * pr.windK * FIXED_DT;
      pr.vy -= GRAVITY * FIXED_DT;
      const prevVy = pr.vy + GRAVITY * FIXED_DT;
      pr.x += pr.vx * FIXED_DT;
      pr.y += pr.vy * FIXED_DT;
      pr.track.points.push(round2(pr.x), round2(pr.y));
      lastStep = Math.max(lastStep, s);

      // tách 3 đầu đạn ở đỉnh quỹ đạo
      if (pr.kind === 'split' && prevVy > 0 && pr.vy <= 0) {
        pr.done = true;
        for (const off of [-7, 0, 7]) {
          const track: Track = { startStep: s + 1, points: [], kind: 'shell' };
          tracks.push(track);
          projs.push({ ...pr, vx: pr.vx + off, kind: 'shell', startStep: s + 1, track, done: false });
        }
        continue;
      }
      // chạm người
      let hitBody = false;
      for (const p of state.players) {
        if (!p.alive) continue;
        if (p.id === shooter.id && s - pr.startStep < 30) continue;
        if (Math.hypot(p.x - pr.x, p.y + BODY_CENTER_Y - pr.y) < BODY_RADIUS) {
          hitBody = true;
          break;
        }
      }
      if (hitBody) {
        explode(pr, pr.x, pr.y, s);
        continue;
      }
      // chạm đất
      const h = terrain.heightAt(pr.x);
      if (h > 0.05 && pr.y <= h) {
        if (pr.bounces > 0) {
          pr.bounces -= 1;
          pr.y = h + 0.02;
          pr.vy = Math.abs(pr.vy) * 0.55;
          pr.vx *= 0.7;
          continue;
        }
        explode(pr, pr.x, h, s);
        continue;
      }
      // rơi khỏi bản đồ
      if (pr.y < FALL_Y || pr.x < -20 || pr.x > width + 20) {
        pr.done = true;
        impacts.push({ kind: 'out', x: round2(pr.x), y: round2(pr.y), radius: 0, step: s });
      }
    }
    if (!pending) break;
  }
  for (const pr of projs) {
    if (!pr.done) {
      pr.done = true;
      impacts.push({ kind: 'out', x: round2(pr.x), y: round2(pr.y), radius: 0, step: lastStep });
    }
  }

  // nhân vật rơi xuống đất mới / rơi vực
  settlePlayers(state, terrain);
  shooter.delay += delayAdd;
  checkEnd(state, shooter.team);

  return {
    shooterId,
    input: { ...input, mode, item },
    tracks,
    impacts,
    damages,
    terrainDiff,
    players: state.players.map((p) => ({ ...p, items: { ...p.items } })),
    durationSteps: lastStep + 1,
    over: state.over,
    winnerTeam: state.winnerTeam,
  };
}

function settlePlayers(state: BattleState, terrain: Terrain) {
  for (const p of state.players) {
    if (!p.alive) continue;
    const h = terrain.heightAt(p.x);
    if (!(h > 0.05)) {
      p.alive = false;
      p.hp = 0;
      p.y = FALL_Y;
      continue;
    }
    p.y = round2(h);
    if (p.hp <= 0) p.alive = false;
  }
}

export function checkEnd(state: BattleState, shooterTeam?: Team) {
  const alive0 = state.players.some((p) => p.team === 0 && p.alive);
  const alive1 = state.players.some((p) => p.team === 1 && p.alive);
  if (alive0 && alive1) return;
  state.over = true;
  state.currentId = null;
  if (alive0) state.winnerTeam = 0;
  else if (alive1) state.winnerTeam = 1;
  // hòa: đội bắn phát cuối thua
  else state.winnerTeam = shooterTeam === 0 ? 1 : 0;
}

export function cloneState(state: BattleState): BattleState {
  return JSON.parse(JSON.stringify(state)) as BattleState;
}

/** Quỹ đạo dự đoán (chế độ Luyện tập): mô phỏng trên bản sao, không đổi state thật. */
export function predictPath(state: BattleState, shooterId: string, input: FireInput): number[] {
  const copy = cloneState(state);
  const res = applyFire(copy, shooterId, { ...input, item: null, mode: 'normal' });
  return res.tracks[0]?.points ?? [];
}
