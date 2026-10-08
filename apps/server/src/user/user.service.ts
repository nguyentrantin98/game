import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export interface Mail {
  id: string;
  title: string;
  body: string;
  gold: number;
  read: boolean;
  claimed: boolean;
}

export interface User {
  id: string;
  deviceId: string;
  name: string;
  level: number;
  exp: number;
  gold: number;
  gems: number;
  elo: number;
  wins: number;
  losses: number;
  checkInDay: number;
  lastCheckIn: string | null;
  ownedSkins: string[];
  mails: Mail[];
  createdAt: number;
}

export const CHECKIN_REWARDS = [200, 300, 400, 500, 600, 800, 1500];
const expForLevel = (lv: number) => 100 + lv * 60;

/**
 * Lưu người chơi trong bộ nhớ (MVP). Interface tách riêng để thay bằng Prisma/PostgreSQL
 * mà không đổi controller / gateway.
 */
@Injectable()
export class UserService {
  private users = new Map<string, User>();
  private byDevice = new Map<string, string>();

  findOrCreateGuest(deviceId: string, name?: string): User {
    const existing = this.byDevice.get(deviceId);
    if (existing) {
      const u = this.users.get(existing)!;
      if (name) u.name = name.slice(0, 16);
      return u;
    }
    const id = randomUUID();
    const user: User = {
      id,
      deviceId,
      name: (name || `Chiến binh ${Math.floor(1000 + Math.random() * 9000)}`).slice(0, 16),
      level: 1,
      exp: 0,
      gold: 12450,
      gems: 120,
      elo: 1000,
      wins: 0,
      losses: 0,
      checkInDay: 0,
      lastCheckIn: null,
      ownedSkins: [],
      mails: [
        {
          id: randomUUID(),
          title: 'Chào mừng tân binh!',
          body: 'Nhận 500 vàng để nâng cấp vũ khí đầu tiên.',
          gold: 500,
          read: false,
          claimed: false,
        },
      ],
      createdAt: Date.now(),
    };
    this.users.set(id, user);
    this.byDevice.set(deviceId, id);
    return user;
  }

  get(id: string): User | undefined {
    return this.users.get(id);
  }

  addRewards(id: string, r: { gold: number; exp: number; elo: number; win: boolean }) {
    const u = this.users.get(id);
    if (!u) return;
    u.gold += r.gold;
    u.elo = Math.max(0, u.elo + r.elo);
    u.exp += r.exp;
    if (r.win) u.wins++;
    else u.losses++;
    while (u.exp >= expForLevel(u.level)) {
      u.exp -= expForLevel(u.level);
      u.level++;
    }
  }

  canCheckIn(u: User) {
    return u.lastCheckIn !== new Date().toISOString().slice(0, 10);
  }

  checkIn(id: string) {
    const u = this.users.get(id)!;
    if (!this.canCheckIn(u)) return { ok: false as const, user: u };
    const reward = CHECKIN_REWARDS[u.checkInDay % 7];
    u.gold += reward;
    u.checkInDay++;
    u.lastCheckIn = new Date().toISOString().slice(0, 10);
    return { ok: true as const, reward, user: u };
  }

  claimMail(id: string, mailId: string) {
    const u = this.users.get(id)!;
    const m = u.mails.find((x) => x.id === mailId);
    if (!m || m.claimed) return u;
    m.read = true;
    m.claimed = true;
    u.gold += m.gold;
    return u;
  }

  /** Cây red-dot: key dạng "lobby.mail", server là nguồn sự thật. */
  redDots(u: User): Record<string, boolean> {
    return {
      'lobby.checkin': this.canCheckIn(u),
      'lobby.mail': u.mails.some((m) => !m.claimed),
      'lobby.event': true,
      'lobby.pass': u.level >= 2,
      'lobby.collection': u.ownedSkins.length === 0,
    };
  }

  leaderboard(limit = 20) {
    return [...this.users.values()]
      .sort((a, b) => b.elo - a.elo)
      .slice(0, limit)
      .map((u, i) => ({ rank: i + 1, id: u.id, name: u.name, elo: u.elo, level: u.level, wins: u.wins }));
  }

  publicProfile(u: User) {
    const { deviceId: _d, ...rest } = u;
    return { ...rest, expToNext: expForLevel(u.level), redDots: this.redDots(u) };
  }
}
