import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, Coins, Heart, Plus, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CHARACTERS, ELEMENT_COLORS, getCharacter, getSkin } from '@army3d/shared';
import { sfx } from '../audio/sfx';
import { joinQueue, leaveQueue, skinForChar } from '../net/battleController';
import { useBattle } from '../store/battle';
import { useGame } from '../store/game';
import { CharacterAvatar, CountUp, GameButton, StatBar } from '../ui/kit';

/** Màn chọn chiến binh — đúng bố cục board "Màn chọn nhân vật (ngang)". */
export function Select() {
  const { t } = useTranslation();
  const charId = useGame((s) => s.charId);
  const setChar = useGame((s) => s.setChar);
  const skinOn = useGame((s) => s.skinOn);
  const setSkinOn = useGame((s) => s.setSkinOn);
  const gold = useGame((s) => s.profile?.gold ?? 0);
  const mode = useGame((s) => s.mode);
  const setScreen = useGame((s) => s.setScreen);
  const searching = useBattle((s) => s.searching);
  const sel = getCharacter(charId);
  const skin = skinOn ? getSkin(skinForChar(charId)) : null;
  const stats = t('stats', { returnObjects: true }) as Record<string, string>;

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="select">
      {/* header */}
      <div className="absolute left-0 right-0 top-0 h-11 flex items-center justify-between px-3 pointer-events-auto"
        style={{ background: 'linear-gradient(180deg, rgba(15,26,20,0.95), rgba(15,26,20,0))' }}>
        <button type="button" aria-label="Quay lại" className="w-8 h-8 rounded-lg grid place-items-center bg-panel border border-line"
          onClick={() => { sfx('click'); setScreen('lobby'); }}>
          <ChevronLeft size={18} />
        </button>
        <div className="font-display font-bold tracking-[0.14em] text-[16px]">{t('chooseHero')}</div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-panel border border-line">
          <Coins size={13} color="#FFC86B" />
          <CountUp value={gold} className="font-display font-semibold text-[12px]" />
        </div>
      </div>

      <div className="absolute inset-x-3 top-12 bottom-3 flex gap-3">
        {/* trái: lưới 8 nhân vật + vật phẩm */}
        <div className="w-[236px] flex flex-col gap-2 pointer-events-auto">
          <div className="grid grid-cols-4 gap-1.5">
            {CHARACTERS.map((c) => {
              const active = c.id === charId;
              const sk = skinOn ? getSkin(skinForChar(c.id)) : null;
              return (
                <motion.button
                  key={c.id}
                  type="button"
                  aria-label={c.name}
                  data-char={c.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { sfx('click'); setChar(c.id); }}
                  className="relative h-[54px] rounded-[10px] overflow-hidden grid place-items-center p-0"
                  style={{ background: sk?.bg ?? c.colors.bg, border: active ? '2px solid #F2A93B' : '1px solid #2A3B2F',
                    boxShadow: active ? '0 0 10px rgba(242,169,59,.6)' : undefined }}
                >
                  <CharacterAvatar color={c.colors.color} dark={c.colors.dark} skin={sk} size={50} />
                  {sk && <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: ELEMENT_COLORS[sk.el] }} />}
                </motion.button>
              );
            })}
          </div>
          <div className="font-display text-[10px] tracking-[0.14em] text-ink-3 mt-1">{t('itemsCarry')}</div>
          <div className="flex gap-1.5">
            {[
              { i: <Heart size={14} color="#4FC4A8" />, l: t('items.heal') },
              { i: <Zap size={14} color="#F2A93B" />, l: t('items.double') },
            ].map((x) => (
              <div key={x.l} className="flex-1 flex items-center gap-1 h-8 px-2 rounded-lg bg-panel border border-line text-[11px]">
                {x.i}
                {x.l}
              </div>
            ))}
            <div className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg border border-dashed border-line text-[11px] text-ink-3">
              <Plus size={12} /> {t('items.teleport')}
            </div>
          </div>
          <label className="flex items-center gap-2 mt-1 text-[12px] cursor-pointer" data-testid="skin-toggle">
            <input type="checkbox" checked={skinOn} onChange={(e) => { sfx('click'); setSkinOn(e.target.checked); }} className="accent-[#F2A93B] w-4 h-4" />
            <span className="font-han text-[15px] text-gold">天兵神将</span>
            <span className="text-ink-3">{t('skinOn')}</span>
          </label>
        </div>

        {/* giữa: model 3D (canvas phía sau) */}
        <div className="flex-1 relative">
          <div className="absolute top-1 left-1/2 -translate-x-1/2 font-display text-[11px] font-semibold tracking-[0.1em] px-2.5 py-0.5 rounded-md bg-bg">
            {sel.role}
            {skin && <span style={{ color: ELEMENT_COLORS[skin.el] }}> · {skin.el}</span>}
          </div>
        </div>

        {/* phải: thông tin + chỉ số */}
        <div className="w-[250px] flex flex-col gap-1.5 pointer-events-auto panel-9">
          <AnimatePresence mode="wait">
            <motion.div key={charId + String(skinOn)} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col gap-1.5">
              <div className="font-display font-bold text-[22px] leading-tight" data-testid="sel-name">{skin?.name ?? sel.name}</div>
              <div className="text-[11px] text-ink-3">
                {t('weapon')}: {skin?.weapon ?? sel.weapon}
                {skin && <span className="block italic">{skin.myth}</span>}
              </div>
              <div className="text-[11px] leading-snug text-[#CBD7CD] min-h-[44px]">
                <span className="text-accent font-semibold">{sel.skill}</span> — {sel.desc}
              </div>
              <div className="flex flex-col gap-1">
                {(['hp', 'atk', 'rng', 'wind'] as const).map((k) => (
                  <StatBar key={k} label={stats[k]} value={sel.stats[k]} color={skin?.robe ?? sel.colors.color} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
          <GameButton id="btn-ready" className="mt-auto h-10 text-[16px]" onClick={() => joinQueue()}>
            {t('ready')} · {mode === 'practice' ? t('modePractice') : t('modeRanked')}
          </GameButton>
        </div>
      </div>

      {/* đang tìm trận */}
      <AnimatePresence>
        {searching && (
          <motion.div className="absolute inset-0 z-40 grid place-items-center pointer-events-auto" style={{ background: 'rgba(5,10,7,.7)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="panel-9 flex flex-col items-center gap-3 w-[300px]">
              <motion.div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent"
                animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
              <div className="font-display font-semibold">{t('searching')}</div>
              <GameButton variant="secondary" className="px-6 py-1.5" onClick={() => leaveQueue()}>{t('cancel')}</GameButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
