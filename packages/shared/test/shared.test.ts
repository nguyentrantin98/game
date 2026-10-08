import { describe, expect, it } from 'vitest';
import {
  applyFire,
  applyMove,
  chooseBotShot,
  cloneState,
  createBattle,
  elementMultiplier,
  ELEMENTS,
  generateTerrain,
  hashString,
  nextTurn,
  Rng,
  Terrain,
  CHARACTERS,
  type FireInput,
  type PlayerSpec,
} from '../src';

const specs: PlayerSpec[] = [
  { id: 'a', name: 'A', team: 0, charId: 'sam' },
  { id: 'b', name: 'B', team: 1, charId: 'gau', isBot: true },
];

function playRandomMatch(seed: number, shots: number) {
  const st = createBattle(seed, specs);
  const rng = new Rng(seed * 7 + 1);
  const results: string[] = [];
  for (let i = 0; i < shots && !st.over; i++) {
    const id = st.currentId!;
    const input: FireInput = {
      angle: rng.int(10, 85),
      power: rng.int(20, 100),
      dir: rng.next() < 0.5 ? 1 : -1,
      mode: (['normal', 'heavy', 'ult'] as const)[rng.int(0, 2)],
    };
    results.push(JSON.stringify(applyFire(st, id, input)));
    nextTurn(st);
  }
  return hashString(results.join('|') + JSON.stringify(st));
}

describe('deterministic ballistics', () => {
  it('cùng seed + input → cùng hash (giả lập client vs server)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(playRandomMatch(seed, 20)).toBe(playRandomMatch(seed, 20));
    }
  });

  it('1000 phát bắn ngẫu nhiên có seed khớp hash trên 2 bản sao state', () => {
    const base = createBattle(42, specs);
    const rng = new Rng(99);
    for (let i = 0; i < 1000; i++) {
      const input: FireInput = { angle: rng.int(0, 90), power: rng.int(10, 100), dir: 1, mode: 'normal' };
      const r1 = applyFire(cloneState(base), base.currentId!, input);
      const r2 = applyFire(cloneState(base), base.currentId!, input);
      expect(hashString(JSON.stringify(r1))).toBe(hashString(JSON.stringify(r2)));
    }
  });

  it('seed khác → địa hình khác', () => {
    expect(hashString(JSON.stringify(generateTerrain(1)))).not.toBe(
      hashString(JSON.stringify(generateTerrain(2))),
    );
  });
});

describe('terrain', () => {
  it('khoét hố làm giảm độ cao trong bán kính', () => {
    const t = new Terrain(Array(101).fill(10), 0.5);
    const diff = t.carve(25, 10, 3);
    expect(diff.length).toBeGreaterThan(0);
    expect(t.heightAt(25)).toBeCloseTo(7, 1);
    expect(t.heightAt(10)).toBe(10);
  });
  it('ngoài bản đồ là vực', () => {
    const t = new Terrain([5, 5, 5]);
    expect(t.solidAt(-1)).toBe(false);
  });
});

describe('Ngũ Hành', () => {
  it('ma trận 5x5 đúng tương khắc', () => {
    const table = ELEMENTS.map((a) => ELEMENTS.map((b) => elementMultiplier(a, b)));
    expect(table.flat().filter((v) => v === 1.2)).toHaveLength(5);
    expect(table.flat().filter((v) => v === 0.85)).toHaveLength(5);
    expect(elementMultiplier('Kim', 'Mộc')).toBe(1.2);
    expect(elementMultiplier('Mộc', 'Kim')).toBe(0.85);
    expect(elementMultiplier('Hỏa', 'Kim')).toBe(1.2);
    expect(elementMultiplier(null, 'Kim')).toBe(1);
  });
});

describe('battle rules', () => {
  it('8 nhân vật đủ dữ liệu JSON', () => {
    expect(CHARACTERS).toHaveLength(8);
    for (const c of CHARACTERS) expect(c.maxHp).toBeGreaterThan(0);
  });

  it('bắn trúng trực diện gây sát thương & cộng delay', () => {
    const st = createBattle(7, specs);
    const shooter = st.players.find((p) => p.id === st.currentId)!;
    const target = st.players.find((p) => p.id !== shooter.id)!;
    // đặt mục tiêu ngay cạnh và bắn thẳng ngang
    target.x = shooter.x + 6 * shooter.facing;
    target.y = shooter.y;
    const before = target.hp;
    const res = applyFire(st, shooter.id, { angle: 2, power: 60, dir: shooter.facing, mode: 'normal' });
    expect(res.damages.some((d) => d.targetId === target.id && d.amount > 0)).toBe(true);
    expect(target.hp).toBeLessThan(before);
    expect(shooter.delay).toBeGreaterThan(0);
  });

  it('di chuyển bị giới hạn mỗi lượt', () => {
    const st = createBattle(3, specs);
    const id = st.currentId!;
    const x0 = st.players.find((p) => p.id === id)!.x;
    applyMove(st, id, 20);
    const x1 = st.players.find((p) => p.id === id)!.x;
    expect(Math.abs(x1 - x0)).toBeLessThanOrEqual(8.01);
  });

  it('lượt kế tiếp là người có delay thấp nhất', () => {
    const st = createBattle(5, specs);
    const first = st.currentId!;
    applyFire(st, first, { angle: 45, power: 50, dir: 1, mode: 'normal' });
    nextTurn(st);
    expect(st.currentId).not.toBe(first);
  });

  it('bot chọn được phát bắn hợp lệ', () => {
    const st = createBattle(11, specs);
    const botId = 'b';
    st.currentId = botId;
    const shot = chooseBotShot(st, botId, 1, () => 0.5);
    expect(shot.angle).toBeGreaterThanOrEqual(0);
    expect(shot.power).toBeGreaterThanOrEqual(10);
  });
});
