import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Server } from 'socket.io';
import {
  applyFire,
  applyMove,
  chooseBotShot,
  createBattle,
  nextTurn,
  skipTurn,
  TURN_SECONDS,
  WS,
  type BattleEnd,
  type BattleMode,
  type BattleState,
  type FireInput,
  type PlayerSpec,
  type ShotResult,
  type TurnInfo,
} from '@army3d/shared';
import { UserService } from '../user/user.service';

export interface Room {
  id: string;
  mode: BattleMode;
  state: BattleState;
  deadline: number;
  turnTimer?: NodeJS.Timeout;
  busy: boolean;
  /** log (seed, inputs) để replay / điều tra gian lận */
  log: { turn: number; playerId: string; input: FireInput | { move: number } | 'skip' }[];
  damageDealt: Record<string, number>;
}

/** Thời gian (ms) — có thể rút ngắn khi test bằng biến môi trường. */
const TURN_MS = Number(process.env.TURN_MS || TURN_SECONDS * 1000);
const BOT_THINK_MS = Number(process.env.BOT_THINK_MS || 1400);
const REPLAY_PAD_MS = Number(process.env.REPLAY_PAD_MS || 1600);

/**
 * Server giữ luật chơi: nhận {góc, lực, vật phẩm}, chạy @army3d/shared, phát kết quả cho cả phòng.
 */
@Injectable()
export class RoomService {
  private readonly log = new Logger('Room');
  private rooms = new Map<string, Room>();
  private userRoom = new Map<string, string>();
  server!: Server;

  constructor(private readonly users: UserService) {}

  roomOf(userId: string): Room | undefined {
    const id = this.userRoom.get(userId);
    return id ? this.rooms.get(id) : undefined;
  }

  create(specs: PlayerSpec[], mode: BattleMode): Room {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const room: Room = {
      id: randomUUID(),
      mode,
      state: createBattle(seed, specs, mode),
      deadline: 0,
      busy: false,
      log: [],
      damageDealt: {},
    };
    this.rooms.set(room.id, room);
    for (const s of specs) if (!s.isBot) this.userRoom.set(s.id, room.id);
    this.log.log(`room ${room.id.slice(0, 8)} ${mode} seed=${seed} players=${specs.map((s) => s.name).join(',')}`);
    return room;
  }

  start(room: Room) {
    for (const p of room.state.players) {
      if (p.isBot) continue;
      this.server.in(`user:${p.id}`).socketsJoin(room.id);
    }
    this.server.to(room.id).emit(WS.battleStart, { roomId: room.id, state: room.state });
    this.beginTurn(room);
  }

  turnInfo(room: Room): TurnInfo {
    return {
      turn: room.state.turn,
      currentId: room.state.currentId!,
      wind: room.state.wind,
      deadline: room.deadline,
    };
  }

  private beginTurn(room: Room) {
    if (room.state.over || !room.state.currentId) return;
    clearTimeout(room.turnTimer);
    room.deadline = Date.now() + TURN_MS;
    this.server.to(room.id).emit(WS.battleTurn, this.turnInfo(room));
    const cur = room.state.players.find((p) => p.id === room.state.currentId)!;
    if (cur.isBot) {
      room.turnTimer = setTimeout(() => {
        const skill = room.mode === 'practice' ? 0.45 : 0.7;
        this.fire(room, cur.id, chooseBotShot(room.state, cur.id, skill));
      }, BOT_THINK_MS);
    } else {
      // hết giờ → tự bỏ lượt
      room.turnTimer = setTimeout(() => {
        room.log.push({ turn: room.state.turn, playerId: cur.id, input: 'skip' });
        skipTurn(room.state);
        this.beginTurn(room);
      }, TURN_MS + 300);
    }
  }

  fire(room: Room, playerId: string, input: FireInput): ShotResult | null {
    if (room.busy || room.state.over || room.state.currentId !== playerId) return null;
    clearTimeout(room.turnTimer);
    room.busy = true;
    room.log.push({ turn: room.state.turn, playerId, input });
    const result = applyFire(room.state, playerId, input);
    for (const d of result.damages) {
      if (d.amount > 0 && d.targetId !== playerId)
        room.damageDealt[playerId] = (room.damageDealt[playerId] || 0) + d.amount;
    }
    this.server.to(room.id).emit(WS.battleShot, result);
    const wait = (result.durationSteps / 60) * 1000 + REPLAY_PAD_MS;
    setTimeout(() => {
      room.busy = false;
      if (room.state.over) return this.finish(room);
      nextTurn(room.state);
      this.beginTurn(room);
    }, wait);
    return result;
  }

  move(room: Room, playerId: string, dx: number) {
    if (room.busy || room.state.currentId !== playerId) return;
    room.log.push({ turn: room.state.turn, playerId, input: { move: dx } });
    applyMove(room.state, playerId, dx);
    const p = room.state.players.find((q) => q.id === playerId)!;
    this.server.to(room.id).emit(WS.battleMoved, { id: p.id, x: p.x, y: p.y, facing: p.facing, moved: p.moved });
  }

  leave(room: Room, playerId: string) {
    const p = room.state.players.find((q) => q.id === playerId);
    if (!p || room.state.over) return;
    p.alive = false;
    p.hp = 0;
    const alive0 = room.state.players.some((q) => q.team === 0 && q.alive);
    const alive1 = room.state.players.some((q) => q.team === 1 && q.alive);
    if (!alive0 || !alive1) {
      room.state.over = true;
      room.state.winnerTeam = alive0 ? 0 : 1;
      clearTimeout(room.turnTimer);
      this.finish(room);
    } else if (room.state.currentId === playerId && !room.busy) {
      skipTurn(room.state);
      this.beginTurn(room);
    }
  }

  private finish(room: Room) {
    clearTimeout(room.turnTimer);
    const winner = room.state.winnerTeam;
    const mvpId = Object.entries(room.damageDealt).sort((a, b) => b[1] - a[1])[0]?.[0];
    const rewards: BattleEnd['rewards'] = {};
    for (const p of room.state.players) {
      const win = p.team === winner;
      const dealt = room.damageDealt[p.id] || 0;
      const r = {
        gold: (win ? 300 : 120) + Math.round(dealt / 10),
        exp: (win ? 80 : 40) + Math.round(dealt / 40),
        elo: room.mode === 'ranked' ? (win ? 18 : -12) : 0,
        win,
        mvp: p.id === mvpId,
      };
      rewards[p.id] = r;
      if (!p.isBot) {
        this.users.addRewards(p.id, r);
        this.userRoom.delete(p.id);
      }
    }
    const end: BattleEnd = { winnerTeam: winner, rewards };
    this.server.to(room.id).emit(WS.battleEnd, end);
    this.log.log(`room ${room.id.slice(0, 8)} end winner=${winner} turns=${room.state.turn}`);
    setTimeout(() => this.rooms.delete(room.id), 60_000);
  }
}
