import { motion } from 'motion/react';
import {
  Backpack,
  CalendarCheck,
  Coins,
  Flag,
  Gem,
  Gift,
  Mail,
  Plus,
  Settings,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCharacter } from '@army3d/shared';
import { useGame } from '../store/game';
import { CharacterAvatar, CountUp, GameButton, IconButton, Marquee } from '../ui/kit';

export function Lobby() {
  const { t } = useTranslation();
  const profile = useGame((s) => s.profile);
  const charId = useGame((s) => s.charId);
  const open = useGame((s) => s.openPopup);
  const setScreen = useGame((s) => s.setScreen);
  const toast = useGame((s) => s.showToast);
  const def = getCharacter(charId);
  if (!profile) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="lobby">
      {/* góc trên trái: avatar, cấp, EXP */}
      <div className="absolute left-3 top-2 flex items-center gap-2 pointer-events-auto">
        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-accent" style={{ background: def.colors.bg }}>
          <CharacterAvatar color={def.colors.color} dark={def.colors.dark} size={48} />
        </div>
        <div>
          <div className="font-display font-semibold text-[14px] leading-tight">{profile.name}</div>
          <div className="flex items-center gap-1.5 text-[10px] text-ink-3">
            <span className="px-1.5 rounded bg-accent text-[#2a1606] font-bold font-display">Lv.{profile.level}</span>
            <div className="w-20 h-1.5 rounded bg-track overflow-hidden">
              <div className="h-full bg-lime" style={{ width: `${(profile.exp / profile.expToNext) * 100}%` }} />
            </div>
            <span>Elo {profile.elo}</span>
          </div>
        </div>
      </div>

      {/* marquee */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[300px]">
        <Marquee text={t('marquee')} />
      </div>

      {/* góc trên phải: tiền tệ */}
      <div className="absolute right-3 top-2.5 flex gap-2 pointer-events-auto">
        {[
          { icon: <Coins size={14} color="#FFC86B" />, v: profile.gold, id: 'gold' },
          { icon: <Gem size={14} color="#5CC8E0" />, v: profile.gems, id: 'gems' },
        ].map((c) => (
          <div key={c.id} className="flex items-center gap-1 pl-1.5 pr-0.5 py-0.5 rounded-full bg-[rgba(10,16,12,0.75)] border border-line">
            {c.icon}
            <CountUp value={c.v} className="font-display font-semibold text-[12px] min-w-[46px] text-right" />
            <button type="button" aria-label="nạp" className="w-4 h-4 rounded-full grid place-items-center bg-lime border-0 p-0"
              onClick={() => toast(t('comingSoon'))}>
              <Plus size={11} strokeWidth={4} color="#15221A" />
            </button>
          </div>
        ))}
      </div>

      {/* cột icon bên phải */}
      <div className="absolute right-3 top-14 grid grid-cols-2 gap-x-3 gap-y-2 pointer-events-auto">
        <IconButton id="btn-checkin" icon={<CalendarCheck size={22} />} label={t('checkin')} dotKey="lobby.checkin" onClick={() => open('checkin')} />
        <IconButton icon={<Gift size={22} />} label={t('event')} dotKey="lobby.event" onClick={() => toast(t('comingSoon'))} />
        <IconButton id="btn-mail" icon={<Mail size={22} />} label={t('mail')} dotKey="lobby.mail" onClick={() => open('mail')} />
        <IconButton icon={<ShoppingBag size={22} />} label={t('shop')} onClick={() => toast(t('comingSoon'))} />
        <IconButton icon={<Flag size={22} />} label={t('pass')} dotKey="lobby.pass" onClick={() => toast(t('comingSoon'))} />
      </div>

      {/* cột trái */}
      <div className="absolute left-3 top-[76px] flex flex-col gap-2 pointer-events-auto">
        <IconButton id="btn-collection" icon={<Sparkles size={22} />} label={t('collection')} dotKey="lobby.collection" onClick={() => open('collection')} />
        <IconButton id="btn-rank" icon={<Trophy size={22} />} label={t('rank')} onClick={() => open('rank')} />
        <IconButton id="btn-settings" icon={<Settings size={22} />} label={t('settings')} onClick={() => open('settings')} />
      </div>

      {/* bảng tên nhân vật dưới bệ */}
      <div className="absolute left-1/2 bottom-[58px] -translate-x-1/2 text-center">
        <div className="font-display text-[11px] tracking-[0.16em] text-accent">{def.role}</div>
        <div className="font-display font-bold text-[22px] text-stroke-dark">{def.name}</div>
      </div>

      {/* hàng dưới */}
      <div className="absolute left-3 bottom-3 flex gap-3 pointer-events-auto">
        <IconButton id="btn-heroes" icon={<Swords size={22} />} label={t('heroes')} onClick={() => setScreen('select')} />
        <IconButton icon={<Backpack size={22} />} label={t('bag')} onClick={() => toast(t('comingSoon'))} />
        <IconButton icon={<Users size={22} />} label={t('friends')} onClick={() => toast(t('comingSoon'))} />
      </div>

      {/* nút BẮT ĐẦU */}
      <motion.div
        className="absolute right-4 bottom-4 pointer-events-auto"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        <GameButton id="btn-start" className="w-[180px] h-[58px] text-[24px] overflow-hidden" onClick={() => open('mode')}>
          <span className="absolute inset-0 shine rounded-[12px]" />
          <span className="relative">{t('start')}</span>
        </GameButton>
      </motion.div>
    </div>
  );
}
