import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sfx } from '../audio/sfx';
import { api } from '../net/api';
import { bindBattleSocket } from '../net/battleController';
import { getSocket } from '../net/socket';
import { useGame } from '../store/game';

/** Splash/Loading: preload theo nhóm asset, hiện %, tip ngẫu nhiên. */
export function Loading() {
  const { t } = useTranslation();
  const tips = t('tips', { returnObjects: true }) as string[];
  const [tip] = useState(() => tips[Math.floor(Math.random() * tips.length)]);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const groups: [string, () => Promise<unknown>][] = [
      ['font', () => (document.fonts?.ready ?? Promise.resolve()).then(() => undefined)],
      ['login', async () => useGame.getState().setProfile(await api.guest())],
      ['audio', async () => sfx('click')],
      ['socket', async () => {
        bindBattleSocket();
        getSocket();
      }],
      ['scene', () => new Promise((r) => setTimeout(r, 250))],
    ];
    (async () => {
      try {
        for (let i = 0; i < groups.length; i++) {
          const [name, run] = groups[i];
          // đăng nhập là bắt buộc; các nhóm khác quá 2.5s thì bỏ qua
          await (name === 'login' ? run() : Promise.race([run(), new Promise((r) => setTimeout(r, 2500))]));
          if (alive) setPct(Math.round(((i + 1) / groups.length) * 100));
        }
        await new Promise((r) => setTimeout(r, 300));
        if (!alive) return;
        const g = useGame.getState();
        g.setScreen('lobby');
        if (g.profile?.redDots['lobby.checkin']) setTimeout(() => useGame.getState().openPopup('checkin'), 500);
      } catch (e) {
        setErr(String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-auto flex flex-col items-center justify-center gap-5 bg-bg"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #1f3326 0%, #0F1A14 70%)' }}>
      <div className="font-display text-[13px] tracking-[0.18em] text-accent">GAME DESIGN · MOBILE · THREE.JS</div>
      <motion.h1
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="m-0 font-display font-bold text-[56px] leading-[0.95] text-center"
        style={{ textShadow: '0 4px 0 #3b2208' }}
      >
        ARMY 3D
        <div className="text-[28px] text-accent-hi">PHÁO CHIẾN ĐỘI</div>
      </motion.h1>
      <div className="w-[420px]">
        <div className="h-3 rounded-full overflow-hidden bg-track border border-line">
          <motion.div
            className="h-full shine"
            style={{ backgroundColor: '#F2A93B' }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[11px] text-ink-3">
          <span>{err ? `⚠ ${err}` : tip}</span>
          <span className="font-display" data-testid="load-pct">
            {t('loading')} {pct}%
          </span>
        </div>
      </div>
    </div>
  );
}
