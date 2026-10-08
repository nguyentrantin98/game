import { describe, expect, it } from 'vitest';
import { Chess } from '../src';
import { Rng } from '../src';

const { newGame, legalMoves, applyMove, chooseBotMove, inCheck } = Chess;
const sq = (s: Chess.ChessState, x: number, y: number) => x + y * s.w;

describe('Vua Cờ', () => {
  it('số nước khai cuộc chuẩn', () => {
    expect(legalMoves(newGame('chess')).length).toBe(20);
    expect(legalMoves(newGame('xiangqi')).length).toBe(44);
    expect(legalMoves(newGame('gomoku')).length).toBe(225);
  });

  it('cờ vua: chiếu hết nhanh (Fool’s mate)', () => {
    let s = newGame('chess');
    for (const [a, b] of [[[5, 6], [5, 5]], [[4, 1], [4, 3]], [[6, 6], [6, 4]], [[3, 0], [7, 4]]] as const)
      s = applyMove(s, { from: sq(s, a[0], a[1]), to: sq(s, b[0], b[1]) });
    expect(inCheck(s, 'r')).toBe(true);
    expect(s.winner).toBe('b');
  });

  it('cờ tướng: hai tướng không được đối mặt', () => {
    const s = newGame('xiangqi');
    s.cells = s.cells.map((p) => (p?.kind === 'k' ? p : null));
    s.cells[sq(s, 3, 9)] = s.cells[sq(s, 4, 9)];
    s.cells[sq(s, 4, 9)] = null;
    expect(legalMoves(s).some((m) => m.to === sq(s, 4, 9))).toBe(false);
  });

  it('cờ úp: quân lật mặt khi đi', () => {
    let s = newGame('jieqi', new Rng(3).next.bind(new Rng(3)));
    const m = legalMoves(s).find((mv) => s.cells[mv.from]!.hidden)!;
    const real = s.cells[m.from]!.real;
    s = applyMove(s, m);
    expect(s.cells[m.to]).toEqual({ side: 'r', kind: real });
  });

  it('cờ caro: 5 quân liền là thắng', () => {
    let s = newGame('gomoku');
    for (let i = 0; i < 5; i++) {
      s = applyMove(s, { from: -1, to: sq(s, i, 0) });
      if (i < 4) s = applyMove(s, { from: -1, to: sq(s, i, 5) });
    }
    expect(s.winner).toBe('r');
  });

  it('AI tự đánh hết trận không lỗi', () => {
    for (const v of ['xiangqi', 'jieqi', 'chess', 'gomoku'] as const) {
      const rng = new Rng(7);
      const rand = () => rng.next();
      let s = newGame(v, rand);
      for (let i = 0; i < 40 && !s.winner; i++) s = applyMove(s, chooseBotMove(s, 1, rand)!);
      expect(s.ply).toBeGreaterThan(0);
    }
  });
});
