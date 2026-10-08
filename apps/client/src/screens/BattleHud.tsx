import { useDrag } from '@use-gesture/react';
import { MiniMap } from './MiniMap';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Flag, Footprints, Heart, Navigation, Sparkles, Zap } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MOVE_PER_TURN, RAGE_MAX, TURN_SECONDS, getCharacter, type ItemId, type PlayerState } from '@army3d/shared';
import { sfx } from '../audio/sfx';
import { fire, leaveBattle, move } from '../net/battleController';
import { useBattle } from '../store/battle';
import { useGame } from '../store/game';
import { CountdownRing, GameButton } from '../ui/kit';
import { TutorialMask } from '../ui/TutorialMask';

function TeamPanel({ players, myId, align }: { players: PlayerState[]; myId: string | null; align: 'left' | 'right' }) {
  const { t } = useTranslation();
  return (
    <div className={`w-[210px] flex flex-col gap-1 px-2.5 py-1.5 rounded-xl bg-[rgba(15,26,20,0.82)] border border-line ${align === 'right' ? 'items-end' : ''}`}>
      {players.map((p) => {
        const pct = Math.max(0, (p.hp / p.maxHp) * 100);
        const color = p.team === 0 ? '#5CC8E0' : '#E8684A';
        return (
          <div key={p.id} className="w-full" style={{ opacity: p.alive ? 1 : 0.4 }}>
            <div className={`flex justify-between text-[11px] ${align === 'right' ? 'flex-row-reverse' : ''}`}>
              <b className="font-display" style={{ color: p.id === myId ? '#FFC86B' : '#E9EFE6' }}>
                {p.name}
                {p.id === myId ? ` (${t('you')})` : ''}
              </b>
              <span className="font-display text-ink-3" data-testid={`hp-${p.team}`}>
                {p.hp}/{p.maxHp}
              </span>
            </div>
            <div className="h-1.5 rounded bg-track overflow-hidden" style={{ direction: align === 'right' ? 'rtl' : 'ltr' }}>
              <div className="h-full rounded transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Slider({ id, label, value, min, max, unit, onChange, disabled }: {
  id: string; label: string; value: number; min: number; max: number; unit?: string; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div id={`tut-${id}`} className="flex items-center gap-2">
      <label htmlFor={id} className="w-9 text-[11px] text-ink-3">{label}</label>
      <input
        id={id}
        type="range"
        className="game-range w-[150px]"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        style={{ ['--fill' as string]: `${((value - min) / (max - min)) * 100}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="w-9 text-right font-display font-bold text-[14px]">{value}{unit}</div>
    </div>
  );
}

function ItemButton({ id, icon, label, count, active, disabled, onClick, ring }: {
  id: string; icon: ReactNode; label: string; count?: number; active: boolean; disabled: boolean; onClick: () => void; ring?: number;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      data-testid={`item-${id}`}
      whileTap={{ scale: 0.88 }}
      disabled={disabled}
      onClick={() => { sfx('click'); onClick(); }}
      className="relative w-11 h-11 rounded-xl grid place-items-center p-0"
      style={{
        background: active ? 'radial-gradient(circle at 50% 30%, #6b4a14, #2a1e0a)' : 'radial-gradient(circle at 50% 30%, #2c4434, #15221a 70%)',
        border: active ? '2px solid #FFC86B' : '1.5px solid #2A3B2F',
        opacity: disabled ? 0.4 : 1,
        boxShadow: '0 3px 0 #0b120e',
      }}
    >
      {ring !== undefined && (
        <svg className="absolute inset-0 -rotate-90" width="44" height="44">
          <circle cx="22" cy="22" r="19" fill="none" stroke="#F2A93B" strokeWidth="3" strokeDasharray={119} strokeDashoffset={119 * (1 - ring)} />
        </svg>
      )}
      {icon}
      {count !== undefined && (
        <span className="absolute -bottom-1 -right-1 text-[9px] font-display font-bold px-1 rounded bg-bg border border-line">{count}</span>
      )}
    </motion.button>
  );
}

export function BattleHud() {
  const { t } = useTranslation();
  const st = useBattle((s) => s.state);
  const myId = useBattle((s) => s.myId);
  const turn = useBattle((s) => s.turn);
  const replay = useBattle((s) => s.replay);
  const angle = useBattle((s) => s.angle);
  const power = useBattle((s) => s.power);
  const shotMode = useBattle((s) => s.shotMode);
  const item = useBattle((s) => s.item);
  const facing = useBattle((s) => s.facing);
  const moveMode = useBattle((s) => s.moveMode);
  const hitLabel = useBattle((s) => s.hitLabel);
  const setB = useBattle((s) => s.set);
  const tutorialDone = useGame((s) => s.tutorialDone);
  const finishTutorial = useGame((s) => s.finishTutorial);
  const [now, setNow] = useState(Date.now());
  const [charge, setCharge] = useState<number | null>(null);
  const chargeRef = useRef<{ start: number; raf: number } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!hitLabel) return;
    const id = setTimeout(() => setB({ hitLabel: null }), 1700);
    return () => clearTimeout(id);
  }, [hitLabel, setB]);

  const myTurn = !!turn && turn.currentId === myId && !replay && !st?.over;
  const bindDrag = useDrag(
    ({ delta: [dx, dy], first, memo }) => {
      if (!myTurn) return memo;
      const b = useBattle.getState();
      if (Math.abs(dx) > 6) b.set({ facing: dx > 0 ? 1 : -1 });
      b.set({ angle: Math.max(0, Math.min(90, Math.round(b.angle - dy * 0.35))) });
      return first ? true : memo;
    },
    { pointer: { touch: true } },
  );

  if (!st) return null;
  const me = st.players.find((p) => p.id === myId);
  const team0 = st.players.filter((p) => p.team === 0).sort((a) => (a.id === myId ? -1 : 1));
  const team1 = st.players.filter((p) => p.team === 1);
  const current = st.players.find((p) => p.id === turn?.currentId);
  const secs = turn ? Math.max(0, (turn.deadline - now) / 1000) : TURN_SECONDS;
  const wind = st.wind;
  const items = me?.items ?? { heal: 0, double: 0, teleport: 0 };
  const rage = me ? me.rage / RAGE_MAX : 0;
  const def = me ? getCharacter(me.charId) : null;
  const showTutorial = myTurn && st.mode === 'practice' && !tutorialDone;

  const pickItem = (id: ItemId) => setB({ item: item === id ? null : id });

  // giữ nút BẮN để nạp lực (lực dao động 10→100→10), thả ra là bắn
  const onFireDown = () => {
    if (!myTurn) return;
    const start = performance.now();
    const tick = () => {
      const t2 = (performance.now() - start) / 1000;
      const p = Math.round(10 + 90 * (1 - Math.abs(((t2 * 0.55) % 2) - 1)));
      setCharge(p);
      chargeRef.current = { start, raf: requestAnimationFrame(tick) };
    };
    chargeRef.current = { start, raf: requestAnimationFrame(tick) };
  };
  const onFireUp = () => {
    const c = chargeRef.current;
    if (!c) return;
    cancelAnimationFrame(c.raf);
    chargeRef.current = null;
    const held = performance.now() - c.start;
    const p = charge;
    setCharge(null);
    if (held > 250 && p !== null) {
      setB({ power: p });
      fire(p);
    } else fire();
  };

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="battle-hud">
      {/* vùng kéo để ngắm */}
      <div {...bindDrag()} className="absolute inset-x-0 top-20 bottom-28 pointer-events-auto" style={{ touchAction: 'none' }} />

      {/* mini map — kéo để xem đối thủ */}
      <div className="absolute top-[64px] left-1/2 -translate-x-1/2">
        <MiniMap />
      </div>

      {/* thanh trên */}
      <div className="absolute inset-x-2 top-2 flex justify-between items-start">
        <TeamPanel players={team0} myId={myId} align="left" />
        <div className="flex gap-2">
          <div id="tut-wind" className="flex flex-col items-center px-3 py-1 rounded-xl bg-[rgba(15,26,20,0.82)] border border-line">
            <div className="font-display text-[10px] tracking-[0.14em] text-ink-3">{t('wind')}</div>
            <div className="flex items-center gap-1 font-display font-bold text-[18px]" data-testid="wind">
              <Navigation size={16} color="#5CC8E0" fill="#5CC8E0"
                style={{ transform: `rotate(${wind < 0 ? -90 : 90}deg)`, opacity: wind === 0 ? 0.2 : 1 }} />
              {Math.abs(wind)}
            </div>
          </div>
          <div className="flex flex-col items-center px-2.5 py-1 rounded-xl bg-[rgba(15,26,20,0.82)] border border-line">
            <div className="font-display text-[10px] tracking-[0.14em] text-ink-3">{t('turn')}</div>
            <CountdownRing seconds={replay ? TURN_SECONDS : secs} size={30} />
          </div>
        </div>
        <TeamPanel players={team1} myId={myId} align="right" />
      </div>

      {/* thông báo lượt */}
      <AnimatePresence>
        {turn && !replay && !st.over && (
          <motion.div key={turn.turn} className="absolute top-[122px] left-1/2 -translate-x-1/2 font-display font-bold tracking-[0.12em] whitespace-nowrap"
            initial={{ opacity: 0, scale: 1.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ fontSize: myTurn ? 20 : 13, color: myTurn ? '#FFC86B' : '#B9C8BC', WebkitTextStroke: '3px #1a0e04', paintOrder: 'stroke fill' }}
            data-testid="turn-banner">
            {myTurn ? t('yourTurn') : t('enemyTurn', { name: current?.name ?? '' })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* nhãn trúng / trượt */}
      <AnimatePresence>
        {hitLabel && (
          <motion.div key={hitLabel.key} className="absolute top-[156px] left-1/2 -translate-x-1/2 font-display font-bold whitespace-nowrap"
            initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: [0.4, 1.25, 1], opacity: 1 }} exit={{ opacity: 0, y: -20 }}
            style={{ fontSize: 30, color: hitLabel.kind === 'hit' ? '#FFC86B' : hitLabel.kind === 'near' ? '#FF8A80' : '#B9C8BC',
              WebkitTextStroke: '4px #1a0e04', paintOrder: 'stroke fill' }}
            data-testid="hit-label">
            {t(hitLabel.kind)}
            {hitLabel.amount > 0 ? ` −${hitLabel.amount}` : ''}
          </motion.div>
        )}
      </AnimatePresence>

      {/* góc dưới trái: Góc / Lực */}
      <div className="absolute left-2 bottom-2 flex flex-col gap-1.5 px-3 py-2 rounded-xl bg-[rgba(15,26,20,0.85)] border border-line pointer-events-auto">
        <Slider id="angle" label={t('angle')} value={angle} min={0} max={90} unit="°" onChange={(v) => setB({ angle: v })} />
        <Slider id="power" label={t('power')} value={charge ?? power} min={10} max={100} onChange={(v) => setB({ power: v })} />
        <div className="flex gap-1.5 items-center">
          {(['normal', 'heavy'] as const).map((m) => (
            <button key={m} type="button" onClick={() => { sfx('click'); setB({ shotMode: m }); }}
              className="px-2 py-0.5 rounded-md text-[10px] font-display font-semibold"
              style={{ background: shotMode === m ? '#F2A93B' : '#24342A', color: shotMode === m ? '#2a1606' : '#B9C8BC', border: 0 }}>
              {m === 'normal' ? '① ' + t('normal') : '② ' + t('heavy')}
            </button>
          ))}
          <button type="button" aria-label="facing" onClick={() => setB({ facing: facing === 1 ? -1 : 1 })}
            className="ml-auto w-6 h-6 rounded-md grid place-items-center bg-track border-0 p-0">
            <ArrowLeftRight size={13} />
          </button>
        </div>
      </div>

      {/* giữa dưới: vật phẩm + tuyệt chiêu */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex gap-2 pointer-events-auto">
        <ItemButton id="heal" icon={<Heart size={20} color="#4FC4A8" />} label={t('items.heal')} count={items.heal}
          active={item === 'heal'} disabled={!myTurn || items.heal <= 0} onClick={() => pickItem('heal')} />
        <ItemButton id="double" icon={<Zap size={20} color="#F2A93B" />} label={t('items.double')} count={items.double}
          active={item === 'double'} disabled={!myTurn || items.double <= 0} onClick={() => pickItem('double')} />
        <ItemButton id="teleport" icon={<Sparkles size={20} color="#B9C9F0" />} label={t('items.teleport')} count={items.teleport}
          active={item === 'teleport'} disabled={!myTurn || items.teleport <= 0} onClick={() => pickItem('teleport')} />
        <ItemButton id="ult" icon={<span className="font-display font-bold text-[10px] text-accent-hi leading-none text-center">{def?.skill.split(' ')[0]}</span>}
          label={t('ult')} ring={rage} active={shotMode === 'ult'} disabled={!myTurn || rage < 1}
          onClick={() => setB({ shotMode: shotMode === 'ult' ? 'normal' : 'ult' })} />
      </div>

      {/* di chuyển */}
      <AnimatePresence>
        {moveMode && myTurn && me && (
          <motion.div className="absolute left-1/2 -translate-x-1/2 bottom-[68px] flex items-center gap-3 pointer-events-auto"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GameButton variant="secondary" className="w-11 h-9 grid place-items-center" aria-label="trái" onClick={() => { setB({ facing: -1 }); move(-2); }}>
              <ChevronLeft size={20} />
            </GameButton>
            <div className="w-24 h-2 rounded bg-track overflow-hidden">
              <div className="h-full bg-cyan" style={{ width: `${(1 - me.moved / MOVE_PER_TURN) * 100}%` }} />
            </div>
            <GameButton variant="secondary" className="w-11 h-9 grid place-items-center" aria-label="phải" onClick={() => { setB({ facing: 1 }); move(2); }}>
              <ChevronRight size={20} />
            </GameButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* góc dưới phải: Di chuyển + BẮN */}
      <div className="absolute right-3 bottom-3 flex items-end gap-2.5 pointer-events-auto">
        <GameButton variant="secondary" aria-label={t('move')} className="w-12 h-12 grid place-items-center rounded-full"
          disabled={!myTurn} onClick={() => setB({ moveMode: !moveMode })}>
          <Footprints size={20} />
        </GameButton>
        <motion.button
          id="tut-fire"
          type="button"
          data-testid="btn-fire"
          disabled={!myTurn}
          className="btn-game danger w-[84px] h-[84px] rounded-full text-[22px] select-none"
          style={{ borderRadius: '50%' }}
          whileTap={{ scale: 0.92 }}
          onPointerDown={onFireDown}
          onPointerUp={onFireUp}
          onPointerLeave={() => chargeRef.current && onFireUp()}
        >
          {t('fire')}
          {charge !== null && (
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-display text-[14px] text-accent-hi">{charge}</span>
          )}
        </motion.button>
      </div>

      {/* thoát trận */}
      <button type="button" aria-label={t('leave')} className="absolute right-[230px] top-2 w-7 h-7 rounded-lg grid place-items-center bg-panel border border-line pointer-events-auto"
        onClick={() => { if (confirm(t('leave') + '?')) leaveBattle(); }}>
        <Flag size={13} />
      </button>
      <div id="debug-stats" className="absolute left-2 top-[90px] text-[10px] text-lime font-mono" />

      {showTutorial && <TutorialMask targets={['tut-angle', 'tut-power', 'tut-wind', 'tut-fire']} onDone={finishTutorial} />}
    </div>
  );
}
