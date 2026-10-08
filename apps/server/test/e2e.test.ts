import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import {
  applyFire,
  chooseBotShot,
  nextTurn,
  WS,
  type BattleEnd,
  type BattleState,
  type ShotResult,
  type TurnInfo,
  hashString,
} from '@army3d/shared';

const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}`;
let proc: ChildProcess;

async function waitForServer() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('server did not start');
}

async function guest(deviceId: string) {
  const r = await fetch(`${BASE}/api/auth/guest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  });
  return (await r.json()) as { token: string; user: { id: string; gold: number } };
}

function connect(token?: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = io(BASE, { path: '/ws', auth: { token }, transports: ['websocket'], forceNew: true });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

/** Tự chơi tới hết trận; đồng thời mô phỏng lại phía client để kiểm tra khớp server. */
function autoPlay(sock: Socket, myId: string): Promise<{ end: BattleEnd; mismatches: number; shots: number }> {
  return new Promise((resolve) => {
    let local: BattleState | null = null;
    let mismatches = 0;
    let shots = 0;
    sock.on(WS.battleStart, (m: { state: BattleState }) => (local = m.state));
    sock.on(WS.battleTurn, (t: TurnInfo) => {
      if (local && local.turn !== t.turn) {
        nextTurn(local);
      }
      if (t.currentId === myId && local) {
        sock.emit(WS.battleFire, chooseBotShot(local, myId, 1, () => 0.5));
      }
    });
    sock.on(WS.battleShot, (res: ShotResult) => {
      shots++;
      if (local) {
        const mine = applyFire(local, res.shooterId, res.input);
        if (hashString(JSON.stringify(mine.players)) !== hashString(JSON.stringify(res.players))) mismatches++;
      }
    });
    sock.on(WS.battleEnd, (end: BattleEnd) => resolve({ end, mismatches, shots }));
  });
}

beforeAll(async () => {
  proc = spawn(process.execPath, [join(__dirname, '../dist/main.js')], {
    env: { ...process.env, PORT: String(PORT), BOT_THINK_MS: '50', REPLAY_PAD_MS: '20', BOT_FILL_MS: '1500' },
    stdio: 'pipe',
  });
  proc.stderr?.on('data', (d) => process.stderr.write(d));
  await waitForServer();
});

afterAll(() => {
  proc?.kill();
});

describe('REST', () => {
  it('guest login → /me có red-dot và vàng khởi điểm', async () => {
    const { token, user } = await guest('device-rest-1');
    expect(user.gold).toBe(12450);
    const me = await (await fetch(`${BASE}/api/me`, { headers: { authorization: `Bearer ${token}` } })).json();
    expect(me.redDots['lobby.checkin']).toBe(true);
    const ci = await (
      await fetch(`${BASE}/api/checkin`, { method: 'POST', headers: { authorization: `Bearer ${token}` } })
    ).json();
    expect(ci.ok).toBe(true);
    expect(ci.user.gold).toBe(12450 + 200);
  });

  it('/me không có token → 401', async () => {
    const r = await fetch(`${BASE}/api/me`);
    expect(r.status).toBe(401);
  });

  it('/characters trả về 8 nhân vật + 8 skin', async () => {
    const r = await (await fetch(`${BASE}/api/characters`)).json();
    expect(r.characters).toHaveLength(8);
    expect(r.skins).toHaveLength(8);
  });
});

describe('WebSocket battle', () => {
  it('socket không có token bị ngắt', async () => {
    const s = io(BASE, { path: '/ws', transports: ['websocket'], forceNew: true });
    const err = await new Promise((r) => s.on(WS.error, r));
    expect(err).toEqual({ code: 'UNAUTHORIZED' });
    s.close();
  });

  it('trận luyện tập vs bot chạy tới khi có kết quả, client replay khớp server', async () => {
    const { token, user } = await guest('device-practice-1');
    const sock = await connect(token);
    const done = autoPlay(sock, user.id);
    const ack = await sock.emitWithAck(WS.queueJoin, { mode: 'practice', charId: 'gau' });
    expect(ack.ok).toBe(true);
    const { end, mismatches, shots } = await done;
    expect(shots).toBeGreaterThan(0);
    expect(mismatches).toBe(0);
    expect(end.rewards[user.id]).toBeDefined();
    const me = await (await fetch(`${BASE}/api/me`, { headers: { authorization: `Bearer ${token}` } })).json();
    expect(me.gold).toBeGreaterThan(12450);
    sock.close();
  });

  it('xếp hạng 1v1: 2 người chơi được ghép cùng phòng', async () => {
    const a = await guest('device-rank-a');
    const b = await guest('device-rank-b');
    const sa = await connect(a.token);
    const sb = await connect(b.token);
    const pa = autoPlay(sa, a.user.id);
    const pb = autoPlay(sb, b.user.id);
    await sa.emitWithAck(WS.queueJoin, { mode: 'ranked', charId: 'sam' });
    await sb.emitWithAck(WS.queueJoin, { mode: 'ranked', charId: 'dieuhau', skinId: 'tethien' });
    const [ra, rb] = await Promise.all([pa, pb]);
    expect(ra.end.winnerTeam).toBe(rb.end.winnerTeam);
    expect(ra.mismatches + rb.mismatches).toBe(0);
    const winA = ra.end.rewards[a.user.id].win;
    expect(ra.end.rewards[a.user.id].elo).toBe(winA ? 18 : -12);
    sa.close();
    sb.close();
  });

  it('bắn khi không phải lượt mình bị từ chối', async () => {
    const { token } = await guest('device-cheat-1');
    const sock = await connect(token);
    const r = await sock.emitWithAck(WS.battleFire, { angle: 45, power: 50, dir: 1, mode: 'normal' });
    expect(r.ok).toBe(false);
    sock.close();
  });
});
