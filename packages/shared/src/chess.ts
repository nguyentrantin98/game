// Vua Cờ — luật nhiều loại cờ dùng chung client/server: Cờ Tướng, Cờ Úp (揭棋), Cờ Vua, Cờ Caro.
// Bàn cờ là mảng 1 chiều (x + y*w), y=0 là phía Đen (trên), bên Đỏ ('r') luôn đi trước.

export type Side = 'r' | 'b';
export type VariantId = 'xiangqi' | 'jieqi' | 'chess' | 'gomoku';

export interface Piece {
  side: Side;
  /** Loại quân đang dùng để đi (quân úp đi theo vị trí xuất phát). */
  kind: string;
  /** Cờ Úp: quân còn úp, `real` là quân thật sẽ lộ khi đi. */
  hidden?: boolean;
  real?: string;
}

export interface Move {
  from: number; // -1 với Cờ Caro (đặt quân)
  to: number;
}

export interface ChessState {
  variant: VariantId;
  w: number;
  h: number;
  cells: (Piece | null)[];
  turn: Side;
  /** Cờ Vua: quyền nhập thành "KQkq" và ô bắt tốt qua đường. */
  castle: string;
  ep: number;
  last: Move | null;
  winner: Side | 'draw' | null;
  ply: number;
}

export interface VariantInfo {
  id: VariantId;
  name: string;
  han: string;
  desc: string;
}

export const VARIANTS: VariantInfo[] = [
  { id: 'xiangqi', name: 'Cờ Tướng', han: '象棋', desc: 'Thiên Đình đối đầu Yêu Giới trên sông Ngân Hà, chiếu bí Tướng địch.' },
  { id: 'jieqi', name: 'Cờ Úp', han: '揭棋', desc: 'Quân úp đi theo vị trí, lật mặt khi di chuyển — may rủi và mưu lược.' },
  { id: 'chess', name: 'Cờ Vua', han: '国际象棋', desc: 'Luật cờ vua quốc tế với tướng lĩnh thần thoại phương Đông.' },
  { id: 'gomoku', name: 'Cờ Caro', han: '五子棋', desc: 'Bàn 15×15, ai xếp đủ 5 quân liền hàng trước sẽ thắng.' },
];

export const other = (s: Side): Side => (s === 'r' ? 'b' : 'r');

// ───────────────────────── khởi tạo ─────────────────────────

const XQ_BACK = ['r', 'h', 'e', 'a', 'k', 'a', 'e', 'h', 'r'];

function xqSetup(cells: (Piece | null)[], side: Side, kindAt: (x: number, y: number, k: string) => Piece) {
  const back = side === 'b' ? 0 : 9;
  const cannon = side === 'b' ? 2 : 7;
  const pawn = side === 'b' ? 3 : 6;
  XQ_BACK.forEach((k, x) => (cells[x + back * 9] = kindAt(x, back, k)));
  for (const x of [1, 7]) cells[x + cannon * 9] = kindAt(x, cannon, 'c');
  for (const x of [0, 2, 4, 6, 8]) cells[x + pawn * 9] = kindAt(x, pawn, 'p');
}

/** Xáo trộn Fisher–Yates bằng hàm ngẫu nhiên truyền vào (để server/test có thể dùng seed). */
function shuffle<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function newGame(variant: VariantId, rand: () => number = Math.random): ChessState {
  const base = { variant, turn: 'r' as Side, castle: '', ep: -1, last: null, winner: null, ply: 0 };
  if (variant === 'gomoku') return { ...base, w: 15, h: 15, cells: Array(225).fill(null) };
  if (variant === 'chess') {
    const cells: (Piece | null)[] = Array(64).fill(null);
    const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    back.forEach((k, x) => {
      cells[x] = { side: 'b', kind: k };
      cells[x + 8] = { side: 'b', kind: 'p' };
      cells[x + 48] = { side: 'r', kind: 'p' };
      cells[x + 56] = { side: 'r', kind: k };
    });
    return { ...base, w: 8, h: 8, cells, castle: 'KQkq' };
  }
  const cells: (Piece | null)[] = Array(90).fill(null);
  for (const side of ['r', 'b'] as Side[]) {
    if (variant === 'xiangqi') {
      xqSetup(cells, side, (_x, _y, k) => ({ side, kind: k }));
    } else {
      // Cờ Úp: trừ Tướng, 15 quân còn lại úp và xáo vị trí
      const pool = shuffle(['a', 'a', 'e', 'e', 'h', 'h', 'r', 'r', 'c', 'c', 'p', 'p', 'p', 'p', 'p'], rand);
      xqSetup(cells, side, (_x, _y, k) => (k === 'k' ? { side, kind: 'k' } : { side, kind: k, hidden: true, real: pool.pop()! }));
    }
  }
  return { ...base, w: 9, h: 10, cells };
}

// ───────────────────────── sinh nước đi ─────────────────────────

const inB = (s: ChessState, x: number, y: number) => x >= 0 && y >= 0 && x < s.w && y < s.h;

function xqPseudo(s: ChessState, from: number, out: Move[]) {
  const p = s.cells[from]!;
  const x = from % 9;
  const y = (from / 9) | 0;
  const free = s.variant === 'jieqi' && !p.hidden; // Cờ Úp: Sĩ/Tượng đã lật được đi khắp bàn
  const push = (nx: number, ny: number) => {
    if (!inB(s, nx, ny)) return;
    const t = s.cells[nx + ny * 9];
    if (!t || t.side !== p.side) out.push({ from, to: nx + ny * 9 });
  };
  const inPalace = (nx: number, ny: number) => nx >= 3 && nx <= 5 && (p.side === 'r' ? ny >= 7 : ny <= 2);
  const ownHalf = (ny: number) => (p.side === 'r' ? ny >= 5 : ny <= 4);
  const at = (nx: number, ny: number) => (inB(s, nx, ny) ? s.cells[nx + ny * 9] : null);
  switch (p.kind) {
    case 'k':
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inPalace(x + dx, y + dy)) push(x + dx, y + dy);
      break;
    case 'a':
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]])
        if (free || inPalace(x + dx, y + dy)) push(x + dx, y + dy);
      break;
    case 'e':
      for (const [dx, dy] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (inB(s, nx, ny) && (free || ownHalf(ny)) && !at(x + dx / 2, y + dy / 2)) push(nx, ny);
      }
      break;
    case 'h':
      for (const [dx, dy, lx, ly] of [
        [1, 2, 0, 1], [-1, 2, 0, 1], [1, -2, 0, -1], [-1, -2, 0, -1],
        [2, 1, 1, 0], [2, -1, 1, 0], [-2, 1, -1, 0], [-2, -1, -1, 0],
      ])
        if (inB(s, x + lx, y + ly) && !at(x + lx, y + ly)) push(x + dx, y + dy);
      break;
    case 'r':
    case 'c':
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let nx = x + dx;
        let ny = y + dy;
        let jumped = false;
        while (inB(s, nx, ny)) {
          const t = at(nx, ny);
          if (p.kind === 'r') {
            if (!t) push(nx, ny);
            else {
              if (t.side !== p.side) push(nx, ny);
              break;
            }
          } else if (!jumped) {
            if (!t) push(nx, ny);
            else jumped = true;
          } else if (t) {
            if (t.side !== p.side) push(nx, ny);
            break;
          }
          nx += dx;
          ny += dy;
        }
      }
      break;
    case 'p': {
      const fwd = p.side === 'r' ? -1 : 1;
      push(x, y + fwd);
      if (!ownHalf(y)) {
        push(x + 1, y);
        push(x - 1, y);
      }
      break;
    }
  }
}

function chessPseudo(s: ChessState, from: number, out: Move[], attacksOnly = false) {
  const p = s.cells[from]!;
  const x = from % 8;
  const y = (from / 8) | 0;
  const at = (nx: number, ny: number) => s.cells[nx + ny * 8];
  const push = (nx: number, ny: number) => {
    if (!inB(s, nx, ny)) return false;
    const t = at(nx, ny);
    if (!t || t.side !== p.side) out.push({ from, to: nx + ny * 8 });
    return !t;
  };
  const slide = (dirs: number[][]) => {
    for (const [dx, dy] of dirs) for (let i = 1; push(x + dx * i, y + dy * i); i++);
  };
  const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  switch (p.kind) {
    case 'r': slide(ORTH); break;
    case 'b': slide(DIAG); break;
    case 'q': slide([...ORTH, ...DIAG]); break;
    case 'n':
      for (const [dx, dy] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) push(x + dx, y + dy);
      break;
    case 'k': {
      for (const [dx, dy] of [...ORTH, ...DIAG]) push(x + dx, y + dy);
      if (attacksOnly) break;
      const row = p.side === 'r' ? 7 : 0;
      if (y !== row || x !== 4 || attacked(s, from, other(p.side))) break;
      const [K, Q] = p.side === 'r' ? ['K', 'Q'] : ['k', 'q'];
      if (s.castle.includes(K) && !at(5, row) && !at(6, row) && !attacked(s, 5 + row * 8, other(p.side)))
        out.push({ from, to: 6 + row * 8 });
      if (s.castle.includes(Q) && !at(3, row) && !at(2, row) && !at(1, row) && !attacked(s, 3 + row * 8, other(p.side)))
        out.push({ from, to: 2 + row * 8 });
      break;
    }
    case 'p': {
      const fwd = p.side === 'r' ? -1 : 1;
      for (const dx of [-1, 1]) {
        const nx = x + dx;
        const ny = y + fwd;
        if (!inB(s, nx, ny)) continue;
        const t = at(nx, ny);
        if (attacksOnly || (t && t.side !== p.side) || nx + ny * 8 === s.ep) out.push({ from, to: nx + ny * 8 });
      }
      if (attacksOnly) break;
      if (inB(s, x, y + fwd) && !at(x, y + fwd)) {
        out.push({ from, to: x + (y + fwd) * 8 });
        const start = p.side === 'r' ? 6 : 1;
        if (y === start && !at(x, y + 2 * fwd)) out.push({ from, to: x + (y + 2 * fwd) * 8 });
      }
      break;
    }
  }
}

/** Ô `sq` có bị bên `by` khống chế không (Cờ Vua). */
function attacked(s: ChessState, sq: number, by: Side) {
  const tmp: Move[] = [];
  for (let i = 0; i < 64; i++) {
    const p = s.cells[i];
    if (!p || p.side !== by) continue;
    tmp.length = 0;
    chessPseudo(s, i, tmp, true);
    if (tmp.some((m) => m.to === sq)) return true;
  }
  return false;
}

/** Bên `side` có đang bị chiếu không. */
export function inCheck(s: ChessState, side: Side): boolean {
  if (s.variant === 'gomoku') return false;
  const k = s.cells.findIndex((p) => p?.side === side && p.kind === 'k');
  if (k < 0) return true;
  if (s.variant === 'chess') return attacked(s, k, other(side));
  // Cờ Tướng: hai Tướng không được nhìn mặt nhau
  const kx = k % 9;
  const dir = side === 'r' ? -1 : 1;
  for (let y = ((k / 9) | 0) + dir; y >= 0 && y < 10; y += dir) {
    const t = s.cells[kx + y * 9];
    if (t) {
      if (t.kind === 'k') return true;
      break;
    }
  }
  const tmp: Move[] = [];
  for (let i = 0; i < 90; i++) {
    const p = s.cells[i];
    if (!p || p.side === side) continue;
    tmp.length = 0;
    xqPseudo(s, i, tmp);
    if (tmp.some((m) => m.to === k)) return true;
  }
  return false;
}

export function legalMoves(s: ChessState, from?: number): Move[] {
  if (s.winner) return [];
  if (s.variant === 'gomoku') {
    const out: Move[] = [];
    s.cells.forEach((c, i) => !c && out.push({ from: -1, to: i }));
    return out;
  }
  const pseudo: Move[] = [];
  for (let i = 0; i < s.cells.length; i++) {
    if (from !== undefined && i !== from) continue;
    const p = s.cells[i];
    if (!p || p.side !== s.turn) continue;
    if (s.variant === 'chess') chessPseudo(s, i, pseudo);
    else xqPseudo(s, i, pseudo);
  }
  return pseudo.filter((m) => !inCheck(rawApply(s, m), s.turn));
}

// ───────────────────────── thực hiện nước đi ─────────────────────────

function rawApply(s: ChessState, m: Move): ChessState {
  const n: ChessState = { ...s, cells: s.cells.slice(), last: m, ply: s.ply + 1, turn: other(s.turn) };
  if (s.variant === 'gomoku') {
    n.cells[m.to] = { side: s.turn, kind: 'stone' };
    return n;
  }
  let p = { ...s.cells[m.from]! };
  if (p.hidden) p = { side: p.side, kind: p.real! };
  n.cells[m.from] = null;
  if (s.variant === 'chess') {
    const ty = (m.to / 8) | 0;
    if (p.kind === 'p' && m.to === s.ep) n.cells[m.to + (p.side === 'r' ? 8 : -8)] = null;
    n.ep = p.kind === 'p' && Math.abs(m.to - m.from) === 16 ? (m.to + m.from) / 2 : -1;
    if (p.kind === 'p' && (ty === 0 || ty === 7)) p.kind = 'q';
    if (p.kind === 'k' && Math.abs(m.to - m.from) === 2) {
      const row = ty * 8;
      const [rf, rt] = m.to % 8 === 6 ? [row + 7, row + 5] : [row, row + 3];
      n.cells[rt] = n.cells[rf];
      n.cells[rf] = null;
    }
    const lose = (sq: number) => {
      const map: Record<number, string> = { 63: 'K', 56: 'Q', 7: 'k', 0: 'q' };
      if (map[sq]) n.castle = n.castle.replace(map[sq], '');
    };
    if (p.kind === 'k') n.castle = n.castle.replace(p.side === 'r' ? /[KQ]/g : /[kq]/g, '');
    lose(m.from);
    lose(m.to);
  }
  n.cells[m.to] = p;
  return n;
}

function fiveInRow(s: ChessState, at: number) {
  const side = s.cells[at]?.side;
  const x = at % s.w;
  const y = (at / s.w) | 0;
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    let c = 1;
    for (const d of [1, -1])
      for (let i = 1; i < 5; i++) {
        const nx = x + dx * i * d;
        const ny = y + dy * i * d;
        if (!inB(s, nx, ny) || s.cells[nx + ny * s.w]?.side !== side) break;
        c++;
      }
    if (c >= 5) return true;
  }
  return false;
}

export function applyMove(s: ChessState, m: Move): ChessState {
  const n = rawApply(s, m);
  if (s.variant === 'gomoku') {
    if (fiveInRow(n, m.to)) n.winner = s.turn;
    else if (n.cells.every(Boolean)) n.winner = 'draw';
    return n;
  }
  if (legalMoves(n).length === 0) {
    // Cờ Vua: hết nước mà không bị chiếu là hòa; Cờ Tướng: hết nước là thua
    n.winner = s.variant === 'chess' && !inCheck(n, n.turn) ? 'draw' : s.turn;
  } else if (n.ply >= 300) n.winner = 'draw';
  return n;
}

// ───────────────────────── AI ─────────────────────────

const VALUE: Record<string, number> = {
  // cờ tướng
  k: 0, a: 20, e: 20, h: 40, r: 90, c: 45, p: 10,
  // cờ vua (r dùng chung giá trị xe 90 ở trên là ~5 tốt × 18 — tỉ lệ đủ dùng)
  q: 170, b: 60, n: 58,
};

function material(s: ChessState, side: Side) {
  let v = 0;
  s.cells.forEach((p, i) => {
    if (!p) return;
    let val = p.hidden ? 35 : (VALUE[p.kind] ?? 0);
    if (s.variant === 'chess' && p.kind === 'p') val = 18 + (p.side === 'r' ? 6 - ((i / 8) | 0) : ((i / 8) | 0) - 1) * 2;
    if (s.variant === 'chess' && p.kind === 'r') val = 95;
    if (s.variant !== 'chess' && p.kind === 'p' && (p.side === 'r' ? i < 45 : i >= 45)) val = 20; // tốt qua sông
    v += p.side === side ? val : -val;
  });
  return v;
}

function negamax(s: ChessState, depth: number, alpha: number, beta: number): number {
  if (s.winner) return s.winner === 'draw' ? 0 : s.winner === s.turn ? 10000 : -10000 - depth;
  if (depth === 0) return material(s, s.turn);
  const moves = legalMoves(s);
  moves.sort((a, b) => (s.cells[b.to] ? 1 : 0) - (s.cells[a.to] ? 1 : 0));
  let best = -Infinity;
  for (const m of moves) {
    const v = -negamax(applyMove(s, m), depth - 1, -beta, -alpha);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

function gomokuScore(s: ChessState, at: number, side: Side) {
  const x = at % s.w;
  const y = (at / s.w) | 0;
  let score = 0;
  for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    let run = 1;
    let open = 0;
    for (const d of [1, -1]) {
      let i = 1;
      for (; i < 5; i++) {
        const nx = x + dx * i * d;
        const ny = y + dy * i * d;
        if (!inB(s, nx, ny)) break;
        const c = s.cells[nx + ny * s.w];
        if (c?.side === side) run++;
        else {
          if (!c) open++;
          break;
        }
      }
    }
    score += run >= 5 ? 100000 : Math.pow(10, run) * (open === 2 ? 2 : open === 1 ? 1 : 0.1);
  }
  return score;
}

/** Chọn nước cho máy. level 1–3: độ sâu tìm kiếm (Cờ Caro dùng heuristic). */
export function chooseBotMove(s: ChessState, level = 2, rand: () => number = Math.random): Move | null {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  if (s.variant === 'gomoku') {
    const near = moves.filter((m) => {
      const x = m.to % s.w;
      const y = (m.to / s.w) | 0;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) if (inB(s, x + dx, y + dy) && s.cells[x + dx + (y + dy) * s.w]) return true;
      return false;
    });
    if (!near.length) return { from: -1, to: 112 };
    let best = near[0];
    let bestV = -Infinity;
    for (const m of near) {
      const v = gomokuScore(s, m.to, s.turn) * 1.1 + gomokuScore(s, m.to, other(s.turn)) + rand();
      if (v > bestV) [best, bestV] = [m, v];
    }
    return best;
  }
  let best: Move[] = [];
  let bestV = -Infinity;
  for (const m of moves) {
    const v = -negamax(applyMove(s, m), level - 1, -Infinity, Infinity);
    if (v > bestV) [best, bestV] = [[m], v];
    else if (v === bestV) best.push(m);
  }
  return best[Math.floor(rand() * best.length)];
}
