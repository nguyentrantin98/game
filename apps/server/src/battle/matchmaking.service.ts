import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { CHARACTERS } from '@army3d/shared';
import { RoomService } from './room.service';

export interface QueueEntry {
  userId: string;
  name: string;
  elo: number;
  charId: string;
  skinId: string | null;
  since: number;
}

const BOT_FILL_MS = Number(process.env.BOT_FILL_MS || 8000);

/**
 * Ghép trận 1v1 theo Elo: biên Elo nới rộng 50 điểm sau mỗi 5 giây chờ.
 * Chờ quá BOT_FILL_MS mà không có ai → ghép với bot.
 * (MVP: hàng đợi trong bộ nhớ; bản scale dùng Redis sorted set.)
 */
@Injectable()
export class MatchmakingService implements OnModuleDestroy {
  private queue: QueueEntry[] = [];
  private timer = setInterval(() => this.tick(), 1000);

  constructor(private readonly rooms: RoomService) {}

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  enqueue(e: QueueEntry) {
    this.leave(e.userId);
    this.queue.push(e);
    this.tick();
  }

  leave(userId: string) {
    this.queue = this.queue.filter((q) => q.userId !== userId);
  }

  private window(e: QueueEntry) {
    return 100 + Math.floor((Date.now() - e.since) / 5000) * 50;
  }

  tick() {
    const used = new Set<string>();
    for (const a of this.queue) {
      if (used.has(a.userId)) continue;
      const b = this.queue.find(
        (q) =>
          q.userId !== a.userId &&
          !used.has(q.userId) &&
          Math.abs(q.elo - a.elo) <= Math.min(this.window(a), this.window(q)),
      );
      if (b) {
        used.add(a.userId).add(b.userId);
        const room = this.rooms.create(
          [
            { id: a.userId, name: a.name, team: 0, charId: a.charId, skinId: a.skinId },
            { id: b.userId, name: b.name, team: 1, charId: b.charId, skinId: b.skinId },
          ],
          'ranked',
        );
        this.rooms.start(room);
      } else if (Date.now() - a.since > BOT_FILL_MS) {
        used.add(a.userId);
        const botChar = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        const room = this.rooms.create(
          [
            { id: a.userId, name: a.name, team: 0, charId: a.charId, skinId: a.skinId },
            { id: `bot-${Date.now()}`, name: `${botChar.name} (AI)`, team: 1, charId: botChar.id, isBot: true },
          ],
          'ranked',
        );
        this.rooms.start(room);
      }
    }
    if (used.size) this.queue = this.queue.filter((q) => !used.has(q.userId));
  }
}
