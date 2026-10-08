import { gsap } from 'gsap';
import { motion } from 'motion/react';
import { Coins, Crown, Star } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { sfx } from '../audio/sfx';
import { joinQueue } from '../net/battleController';
import { useBattle } from '../store/battle';
import { useGame } from '../store/game';
import { GameButton } from '../ui/kit';

/** Kết quả trận: banner thắng/thua, MVP, sao, vàng/EXP đếm tăng (GSAP timeline). */
export function Result() {
  const { t } = useTranslation();
  const end = useBattle((s) => s.end);
  const st = useBattle((s) => s.state);
  const myId = useBattle((s) => s.myId);
  const setScreen = useGame((s) => s.setScreen);
  const goldRef = useRef<HTMLSpanElement>(null);
  const expRef = useRef<HTMLSpanElement>(null);
  const mine = end && myId ? end.rewards[myId] : null;
  const win = !!mine?.win;
  const me = st?.players.find((p) => p.id === myId);
  const stars = !win ? 0 : me && me.hp > me.maxHp * 0.6 ? 3 : me && me.hp > me.maxHp * 0.25 ? 2 : 1;

  useEffect(() => {
    if (!mine) return;
    const o = { g: 0, e: 0 };
    const tl = gsap.timeline({ delay: 0.6 });
    tl.to(o, {
      g: mine.gold,
      e: mine.exp,
      duration: 1.2,
      ease: 'power2.out',
      onUpdate: () => {
        if (goldRef.current) goldRef.current.textContent = `+${Math.round(o.g)}`;
        if (expRef.current) expRef.current.textContent = `+${Math.round(o.e)}`;
      },
      onComplete: () => sfx('coin'),
    });
    return () => {
      tl.kill();
    };
  }, [mine]);

  if (!end || !mine) return null;
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-auto" style={{ background: 'rgba(5,10,7,0.72)' }} data-testid="result">
      <div className="flex flex-col items-center gap-3">
        <motion.div
          initial={{ scale: 2.2, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          className="font-display font-bold text-[54px] tracking-[0.12em]"
          style={{ color: win ? '#FFC86B' : '#B9C8BC', WebkitTextStroke: '5px #1a0e04', paintOrder: 'stroke fill',
            textShadow: win ? '0 0 30px rgba(242,169,59,.7)' : undefined }}
          data-testid="result-title"
        >
          {win ? t('victory') : t('defeat')}
        </motion.div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 + i * 0.2, type: 'spring' }}>
              <Star size={34} color="#F2A93B" fill={i < stars ? '#F2A93B' : 'transparent'} strokeWidth={2} />
            </motion.div>
          ))}
        </div>
        <div className="panel-9 w-[360px] flex flex-col gap-2">
          {mine.mvp && (
            <div className="flex items-center justify-center gap-1.5 font-display font-bold text-accent-hi">
              <Crown size={16} fill="#F2A93B" color="#F2A93B" /> {t('mvp')}
            </div>
          )}
          <div className="flex justify-around">
            <div className="flex items-center gap-1.5">
              <Coins size={18} color="#FFC86B" />
              <span ref={goldRef} className="font-display font-bold text-[20px]" data-testid="reward-gold">+0</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-lime font-display font-bold">{t('exp')}</span>
              <span ref={expRef} className="font-display font-bold text-[20px]">+0</span>
            </div>
            {mine.elo !== 0 && (
              <div className="font-display font-bold text-[16px]" style={{ color: mine.elo > 0 ? '#9BD35A' : '#FF8A80' }}>
                Elo {mine.elo > 0 ? '+' : ''}{mine.elo}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <GameButton variant="secondary" className="px-6 h-10" onClick={() => setScreen('lobby')}>
            {t('backLobby')}
          </GameButton>
          <GameButton id="btn-again" className="px-6 h-10" onClick={() => joinQueue()}>
            {t('playAgain')}
          </GameButton>
        </div>
      </div>
    </div>
  );
}
