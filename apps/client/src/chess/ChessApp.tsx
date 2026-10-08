import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Chess } from '@army3d/shared';
import { sfx } from '../audio/sfx';
import { GameButton } from '../ui/kit';
import { useStage } from '../ui/Stage';
import { BattleClash } from './BattleClash';
import { ALL_HEROES, heroFor, Portrait, PieceToken, type Hero } from './roster';

type Mode = 'ai' | 'local';
type Screen = 'menu' | 'heroes' | 'game';

/** Vua Cờ: chọn loại cờ → chọn đối thủ → chơi. */
export function ChessApp() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [variant, setVariant] = useState<Chess.VariantId>('xiangqi');
  const [mode, setMode] = useState<Mode>('ai');
  const [level, setLevel] = useState(2);
  return (
    <div className="absolute inset-0 vc-bg pointer-events-auto">
      {screen === 'menu' && (
        <Menu
          variant={variant}
          mode={mode}
          level={level}
          onVariant={setVariant}
          onMode={setMode}
          onLevel={setLevel}
          onPlay={() => setScreen('game')}
          onHeroes={() => setScreen('heroes')}
        />
      )}
      {screen === 'heroes' && <Heroes onBack={() => setScreen('menu')} />}
      {screen === 'game' && <Game variant={variant} mode={mode} level={level} onExit={() => setScreen('menu')} />}
    </div>
  );
}

function Menu(p: {
  variant: Chess.VariantId;
  mode: Mode;
  level: number;
  onVariant(v: Chess.VariantId): void;
  onMode(m: Mode): void;
  onLevel(l: number): void;
  onPlay(): void;
  onHeroes(): void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center px-6 pt-3">
      <h1 className="vc-title">
        VUA CỜ <span>棋王</span>
      </h1>
      <p className="text-ink-3 text-[11px] -mt-1 mb-2">Thiên Đình ⚔ Yêu Giới — chọn loại cờ để khai chiến</p>
      <div className="grid grid-cols-4 gap-3 w-full max-w-[800px]">
        {Chess.VARIANTS.map((v) => (
          <motion.button
            key={v.id}
            id={`variant-${v.id}`}
            type="button"
            whileTap={{ scale: 0.95 }}
            className={`vc-card ${p.variant === v.id ? 'on' : ''}`}
            onClick={() => {
              sfx('click');
              p.onVariant(v.id);
            }}
          >
            <span className="vc-han">{v.han}</span>
            <b className="font-display text-[15px]">{v.name}</b>
            <span className="text-[10px] text-ink-2 leading-snug">{v.desc}</span>
          </motion.button>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4 text-[12px]">
        <Seg value={p.mode} onChange={p.onMode} items={[['ai', 'Đấu với máy'], ['local', '2 người 1 máy']]} />
        {p.mode === 'ai' && (
          <Seg value={p.level} onChange={p.onLevel} items={[[1, 'Dễ'], [2, 'Thường'], [3, 'Khó']]} />
        )}
      </div>
      <div className="flex gap-3 mt-4">
        <GameButton variant="secondary" className="px-5 py-2.5 text-[13px]" onClick={p.onHeroes}>
          TƯỚNG LĨNH
        </GameButton>
        <GameButton id="btn-play" className="px-10 py-2.5 text-[16px]" onClick={p.onPlay}>
          KHAI CHIẾN
        </GameButton>
      </div>
    </div>
  );
}

function Seg<T extends string | number>({ value, onChange, items }: { value: T; onChange(v: T): void; items: [T, string][] }) {
  return (
    <div className="vc-seg">
      {items.map(([v, label]) => (
        <button key={String(v)} type="button" className={v === value ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Heroes({ onBack }: { onBack(): void }) {
  return (
    <div className="absolute inset-0 flex flex-col px-6 pt-3">
      <div className="flex items-center gap-3 mb-2">
        <GameButton variant="secondary" className="px-3 py-1 text-[12px]" onClick={onBack}>
          ← QUAY LẠI
        </GameButton>
        <h2 className="font-display text-[18px] text-accent">TƯỚNG LĨNH THẦN THOẠI</h2>
      </div>
      <div className="overflow-y-auto pb-4" style={{ touchAction: 'pan-y' }}>
        {(['r', 'b'] as const).map((side) => (
          <div key={side} className="mb-3">
            <div className="text-[12px] mb-1" style={{ color: side === 'r' ? '#ff8a6a' : '#b9c8bc' }}>
              {side === 'r' ? '天庭 Thiên Đình (bên Đỏ)' : '妖界 Yêu Giới (bên Đen)'}
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_HEROES(side)
                .filter((h, i, a) => a.findIndex((x) => x.id === h.id) === i)
                .map((h) => (
                  <div key={h.id} className="vc-hero">
                    <div className="w-[64px] h-[64px] rounded-full overflow-hidden vc-medal">
                      <Portrait h={h} />
                    </div>
                    <b className="text-[11px]">{h.name}</b>
                    <span className="text-[10px] text-ink-3 font-han">{h.han}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SIDE_NAME = { r: 'Thiên Đình (Đỏ)', b: 'Yêu Giới (Đen)' };

function Game({ variant, mode, level, onExit }: { variant: Chess.VariantId; mode: Mode; level: number; onExit(): void }) {
  const [history, setHistory] = useState(() => [Chess.newGame(variant)]);
  const [sel, setSel] = useState(-1);
  const [clash, setClash] = useState<{ a: Hero; d: Hero; red: boolean } | null>(null);
  const s = history[history.length - 1];
  const stage = useStage();
  const botTurn = mode === 'ai' && s.turn === 'b' && !s.winner && !clash;

  const targets = useMemo(() => (sel >= 0 ? Chess.legalMoves(s, sel).map((m) => m.to) : []), [s, sel]);
  const check = !s.winner && Chess.inCheck(s, s.turn);

  const play = (m: Chess.Move) => {
    const victim = m.from >= 0 ? s.cells[m.to] : null;
    const capture = !!victim;
    if (victim) {
      // quân thật lộ mặt khi ra trận (Cờ Úp)
      const real = (p: Chess.Piece) => (p.hidden ? { side: p.side, kind: p.real! } : p);
      const atk = real(s.cells[m.from]!);
      const def = real(victim);
      setClash({ a: heroFor(variant, atk.side, atk.kind), d: heroFor(variant, def.side, def.kind), red: atk.side === 'r' });
    }
    const n = Chess.applyMove(s, m);
    sfx(n.winner ? 'win' : capture ? 'hit' : 'turn');
    setHistory((h) => [...h, n]);
    setSel(-1);
  };

  useEffect(() => {
    if (!botTurn) return;
    const id = setTimeout(() => {
      const m = Chess.chooseBotMove(s, variant === 'chess' && level === 3 ? 3 : level);
      if (m) play(m);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, botTurn]);

  const tap = (i: number) => {
    if (s.winner || botTurn || clash) return;
    if (variant === 'gomoku') {
      if (!s.cells[i]) play({ from: -1, to: i });
      return;
    }
    if (sel >= 0 && targets.includes(i)) return play({ from: sel, to: i });
    const p = s.cells[i];
    setSel(p && p.side === s.turn ? i : -1);
  };

  const undo = () => {
    const back = mode === 'ai' ? 2 : 1;
    setHistory((h) => (h.length > back ? h.slice(0, h.length - back) : h));
    setSel(-1);
  };

  // kích thước ô theo chiều cao màn thiết kế
  const grid = variant === 'chess' ? 8 : variant === 'gomoku' ? 15 : 10;
  const cell = Math.floor((stage.h - 24) / grid);
  const isGrid = variant === 'chess'; // cờ vua đặt trong ô, còn lại đặt trên giao điểm
  const W = isGrid ? cell * s.w : cell * (s.w - 1) + cell;
  const H = isGrid ? cell * s.h : cell * (s.h - 1) + cell;
  const pos = (i: number) => {
    const x = i % s.w;
    const y = (i / s.w) | 0;
    return { left: x * cell + cell / 2, top: y * cell + cell / 2 };
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center gap-5">
      <div className="relative vc-board" style={{ width: W, height: H }}>
        <BoardLines variant={variant} cell={cell} w={s.w} h={s.h} />
        {s.last && s.last.from >= 0 && <Mark at={pos(s.last.from)} cell={cell} cls="last" />}
        {s.last && <Mark at={pos(s.last.to)} cell={cell} cls="last" />}
        {s.cells.map((_, i) => (
          <button
            key={i}
            type="button"
            data-sq={i}
            aria-label={`ô ${i}`}
            className="vc-hit"
            style={{ ...pos(i), width: cell, height: cell }}
            onClick={() => tap(i)}
          />
        ))}
        <AnimatePresence>
          {s.cells.map((p, i) =>
            p ? (
              <motion.div
                key={`${i}-${p.side}-${p.kind}-${p.hidden ? 1 : 0}`}
                className="vc-piece"
                initial={
                  s.last && s.last.to === i && s.last.from >= 0
                    ? { x: pos(s.last.from).left - pos(i).left, y: pos(s.last.from).top - pos(i).top, scale: 1.25 }
                    : { scale: 0.4, opacity: 0 }
                }
                animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                style={pos(i)}
              >
                <PieceToken variant={variant} piece={p} size={cell * (variant === 'gomoku' ? 0.82 : 0.92)} selected={i === sel} />
              </motion.div>
            ) : null,
          )}
        </AnimatePresence>
        {s.last && (
          <div key={`fx${s.ply}`} className="vc-movefx" style={pos(s.last.to)}>
            <i className="ring" style={{ width: cell * 1.6, height: cell * 1.6 }} />
            {s.last.from >= 0 && s.cells[s.last.to] && (
              <span className="tag">{heroFor(variant, s.cells[s.last.to]!.side, s.cells[s.last.to]!.kind).name}</span>
            )}
          </div>
        )}
        {targets.map((t) => (
          <div key={t} className={`vc-dot ${s.cells[t] ? 'cap' : ''}`} style={{ ...pos(t), width: cell * 0.3, height: cell * 0.3 }} />
        ))}
      </div>

      <AnimatePresence>
        {clash && <BattleClash attacker={clash.a} defender={clash.d} red={clash.red} onDone={() => setClash(null)} />}
      </AnimatePresence>
      <div className="flex flex-col items-center gap-3 w-[200px]">
        <div className="font-display text-accent text-[18px]">{Chess.VARIANTS.find((v) => v.id === variant)!.name}</div>
        <div className={`vc-turn ${s.turn}`} id="turn">
          {s.winner
            ? s.winner === 'draw'
              ? 'HÒA CỜ'
              : `${SIDE_NAME[s.winner]} THẮNG!`
            : `Lượt: ${SIDE_NAME[s.turn]}${botTurn ? ' — máy nghĩ…' : ''}`}
        </div>
        {check && <div className="vc-check">将军! CHIẾU!</div>}
        <div className="text-[11px] text-ink-3">Nước thứ {s.ply}</div>
        <div className="flex gap-2">
          <GameButton variant="secondary" className="px-3 py-1.5 text-[12px]" onClick={undo} disabled={history.length < 2}>
            ĐI LẠI
          </GameButton>
          <GameButton
            variant="secondary"
            className="px-3 py-1.5 text-[12px]"
            onClick={() => {
              setHistory([Chess.newGame(variant)]);
              setSel(-1);
            }}
          >
            VÁN MỚI
          </GameButton>
        </div>
        <GameButton variant="danger" className="px-4 py-1.5 text-[12px]" onClick={onExit}>
          VỀ SẢNH
        </GameButton>
      </div>
    </div>
  );
}

function Mark({ at, cell, cls }: { at: { left: number; top: number }; cell: number; cls: string }) {
  return <div className={`vc-mark ${cls}`} style={{ ...at, width: cell * 0.96, height: cell * 0.96 }} />;
}

/** Vẽ lưới: Cờ Tướng (sông + cung), Cờ Vua (ô vuông), Cờ Caro (lưới 15×15). */
function BoardLines({ variant, cell, w, h }: { variant: Chess.VariantId; cell: number; w: number; h: number }) {
  if (variant === 'chess')
    return (
      <svg className="absolute inset-0" width={w * cell} height={h * cell}>
        {Array.from({ length: 64 }, (_, i) => (
          <rect
            key={i}
            x={(i % 8) * cell}
            y={((i / 8) | 0) * cell}
            width={cell}
            height={cell}
            fill={((i % 8) + ((i / 8) | 0)) % 2 ? 'rgba(90,40,10,.55)' : 'rgba(255,240,200,.18)'}
          />
        ))}
      </svg>
    );
  const o = cell / 2;
  const X = (x: number) => o + x * cell;
  const Y = (y: number) => o + y * cell;
  const lines: ReactElement[] = [];
  for (let y = 0; y < h; y++) lines.push(<line key={`h${y}`} x1={X(0)} y1={Y(y)} x2={X(w - 1)} y2={Y(y)} />);
  for (let x = 0; x < w; x++) {
    if (variant === 'gomoku' || x === 0 || x === w - 1) lines.push(<line key={`v${x}`} x1={X(x)} y1={Y(0)} x2={X(x)} y2={Y(h - 1)} />);
    else {
      lines.push(<line key={`v${x}a`} x1={X(x)} y1={Y(0)} x2={X(x)} y2={Y(4)} />);
      lines.push(<line key={`v${x}b`} x1={X(x)} y1={Y(5)} x2={X(x)} y2={Y(9)} />);
    }
  }
  if (variant !== 'gomoku')
    for (const [a, b] of [[0, 2], [7, 9]]) {
      lines.push(<line key={`p${a}1`} x1={X(3)} y1={Y(a)} x2={X(5)} y2={Y(b)} />);
      lines.push(<line key={`p${a}2`} x1={X(5)} y1={Y(a)} x2={X(3)} y2={Y(b)} />);
    }
  return (
    <svg className="absolute inset-0" width={(w - 1) * cell + cell} height={(h - 1) * cell + cell}>
      <g stroke="#4a2a0c" strokeWidth={1.4}>{lines}</g>
      {variant !== 'gomoku' && (
        <text x={X(4)} y={Y(4.5) + cell * 0.18} textAnchor="middle" fontSize={cell * 0.5} fill="#4a2a0c" className="font-han" opacity={0.8}>
          楚 河 　 　 漢 界
        </text>
      )}
      {variant === 'gomoku' &&
        [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]].map(([x, y]) => <circle key={`${x}${y}`} cx={X(x)} cy={Y(y)} r={3} fill="#4a2a0c" />)}
    </svg>
  );
}
