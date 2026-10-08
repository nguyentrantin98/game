import { List, Selector, Slider, Switch } from 'antd-mobile';
import { motion } from 'motion/react';
import { Check, Coins, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ELEMENT_COLORS, ELEMENTS, SKINS } from '@army3d/shared';
import { setSfxVolume, setVibrate, sfx } from '../audio/sfx';
import i18n from '../i18n';
import { api } from '../net/api';
import { useGame, type Quality } from '../store/game';
import { CharacterAvatar, GameButton, Popup } from '../ui/kit';

function ModePopup() {
  const { t } = useTranslation();
  const g = useGame();
  const modes = [
    { id: 'practice' as const, title: t('modePractice'), desc: t('modePracticeD'), color: '#9BD35A', on: true },
    { id: 'ranked' as const, title: t('modeRanked'), desc: t('modeRankedD'), color: '#F2A93B', on: true },
    { id: 'team', title: t('modeTeam'), desc: t('comingSoon'), color: '#5CC8E0', on: false },
    { id: 'boss', title: t('modeBoss'), desc: t('comingSoon'), color: '#E8684A', on: false },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {modes.map((m) => (
        <motion.button
          key={m.id}
          type="button"
          data-mode={m.id}
          whileTap={m.on ? { scale: 0.94 } : undefined}
          className="relative text-left rounded-xl p-3 border"
          style={{ background: `linear-gradient(135deg, ${m.color}33, #15221A 70%)`, borderColor: m.on ? m.color : '#2A3B2F', opacity: m.on ? 1 : 0.55 }}
          onClick={() => {
            sfx('click');
            if (!m.on) return g.showToast(t('comingSoon'));
            g.setMode(m.id as 'practice' | 'ranked');
            g.setScreen('select');
          }}
        >
          <div className="font-display font-bold text-[16px]" style={{ color: m.color }}>{m.title}</div>
          <div className="text-[11px] text-ink-2 mt-0.5">{m.desc}</div>
          {!m.on && <Lock size={14} className="absolute top-2.5 right-2.5" />}
        </motion.button>
      ))}
    </div>
  );
}

function CheckInPopup() {
  const { t } = useTranslation();
  const setProfile = useGame((s) => s.setProfile);
  const toast = useGame((s) => s.showToast);
  const [info, setInfo] = useState<{ day: number; canCheckIn: boolean; rewards: number[] } | null>(null);
  useEffect(() => {
    api.checkinInfo().then(setInfo).catch(() => {});
  }, []);
  if (!info) return <div className="h-24" />;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-7 gap-1.5">
        {info.rewards.map((r, i) => {
          const done = i < info.day;
          const today = i === info.day && info.canCheckIn;
          return (
            <motion.div key={i} className="relative rounded-lg flex flex-col items-center py-2 border"
              animate={today ? { scale: [1, 1.06, 1] } : undefined} transition={{ repeat: Infinity, duration: 1.2 }}
              style={{ background: i === 6 ? 'linear-gradient(180deg,#6b4a14,#2a1e0a)' : '#24342A', borderColor: today ? '#FFC86B' : '#2A3B2F' }}>
              <div className="text-[9px] text-ink-3">{t('day', { n: i + 1 })}</div>
              <Coins size={18} color="#FFC86B" className="my-1" />
              <div className="font-display font-bold text-[11px]">{r}</div>
              {done && <div className="absolute inset-0 rounded-lg grid place-items-center bg-[rgba(0,0,0,.55)]"><Check color="#9BD35A" strokeWidth={4} /></div>}
            </motion.div>
          );
        })}
      </div>
      <GameButton id="btn-do-checkin" className="self-center px-8 h-9" disabled={!info.canCheckIn}
        onClick={async () => {
          const r = await api.checkin();
          if (r.ok) {
            sfx('coin');
            toast(`+${r.reward} ${t('gold')}`);
            setProfile(r.user);
            setInfo({ ...info, day: info.day + 1, canCheckIn: false });
          }
        }}>
        {info.canCheckIn ? t('claim') : t('claimed')}
      </GameButton>
    </div>
  );
}

function MailPopup() {
  const { t } = useTranslation();
  const profile = useGame((s) => s.profile);
  const setProfile = useGame((s) => s.setProfile);
  return (
    <div className="flex flex-col gap-2">
      {profile?.mails.map((m) => (
        <div key={m.id} className="flex items-center gap-3 rounded-lg p-2.5 bg-track border border-line">
          <div className="flex-1">
            <div className="font-semibold text-[13px]">{m.title}</div>
            <div className="text-[11px] text-ink-3">{m.body}</div>
          </div>
          <GameButton className="px-3 h-8 text-[12px]" disabled={m.claimed}
            onClick={async () => { setProfile(await api.claimMail(m.id)); sfx('coin'); }}>
            {m.claimed ? t('claimed') : `${t('claim')} ${m.gold}`}
          </GameButton>
        </div>
      ))}
    </div>
  );
}

const selectorStyle = {
  '--color': '#24342A',
  '--checked-color': 'rgba(242,169,59,0.18)',
  '--checked-text-color': '#FFC86B',
  '--border': '1px solid #2A3B2F',
  '--checked-border': '1px solid #F2A93B',
  '--border-radius': '8px',
} as React.CSSProperties;

/** Màn tiện ích ngoài trận dùng antd-mobile (theme lại bằng CSS variables). */
function SettingsPopup() {
  const { t } = useTranslation();
  const settings = useGame((s) => s.settings);
  const update = useGame((s) => s.updateSettings);
  return (
    <div className="rounded-lg overflow-hidden" data-testid="settings">
      <List style={{ '--font-size': '13px', '--padding-left': '12px' } as React.CSSProperties}>
        <List.Item extra={<div className="w-40"><Slider value={settings.sfx * 100} onChange={(v) => { const n = (v as number) / 100; update({ sfx: n }); setSfxVolume(n); }} /></div>}>
          {t('sfx')}
        </List.Item>
        <List.Item extra={<Switch checked={settings.vibrate} onChange={(v) => { update({ vibrate: v }); setVibrate(v); }} />}>
          {t('vibrate')}
        </List.Item>
        <List.Item>
          <div className="mb-1.5">{t('quality')}</div>
          <Selector
            style={selectorStyle}
            columns={4}
            value={[settings.quality]}
            onChange={(v) => v[0] && update({ quality: v[0] as Quality })}
            options={[
              { label: 'Thấp', value: 'low' },
              { label: 'Vừa', value: 'mid' },
              { label: 'Cao', value: 'high' },
              { label: 'Tự động', value: 'auto' },
            ]}
          />
        </List.Item>
        <List.Item>
          <div className="mb-1.5">{t('language')}</div>
          <Selector
            style={selectorStyle}
            columns={3}
            value={[settings.lang]}
            onChange={(v) => {
              if (!v[0]) return;
              update({ lang: v[0] });
              i18n.changeLanguage(v[0]);
              try { localStorage.setItem('army3d.lang', v[0]); } catch {}
            }}
            options={[
              { label: 'Tiếng Việt', value: 'vi' },
              { label: '简体中文', value: 'zh-CN' },
              { label: 'English', value: 'en' },
            ]}
          />
        </List.Item>
      </List>
    </div>
  );
}

/** Bộ sưu tập skin "Thiên Binh Thần Tướng" + vòng Ngũ Hành tương khắc. */
function CollectionPopup() {
  return (
    <div className="flex flex-col gap-3" data-testid="collection">
      <div className="grid grid-cols-4 gap-2">
        {SKINS.map((s) => (
          <div key={s.id} className="rounded-xl overflow-hidden border border-line bg-panel">
            <div className="relative h-[70px] grid place-items-center" style={{ background: s.bg }}>
              <CharacterAvatar color={s.robe} dark={s.trim} skin={s} size={64} />
              <span className="absolute top-1 left-1 text-[10px] font-bold px-1.5 rounded" style={{ background: ELEMENT_COLORS[s.el], color: '#15221A' }}>{s.el}</span>
            </div>
            <div className="p-1.5">
              <div className="font-display font-bold text-[13px]">{s.name}</div>
              <div className="text-[9px] text-ink-3 leading-tight">{s.myth}</div>
              <div className="text-[9px] text-[#CBD7CD] mt-0.5 leading-tight"><b className="text-gold">{s.skill}</b> — {s.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-1.5 text-[12px]">
        <span className="font-han text-gold text-[16px] mr-2">五行相克</span>
        {[...ELEMENTS, ELEMENTS[0]].map((e, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-ink-3">khắc</span>}
            <span className="px-1.5 rounded font-bold" style={{ background: ELEMENT_COLORS[e], color: '#15221A' }}>{e}</span>
          </span>
        ))}
      </div>
      <div className="text-center text-[11px] text-ink-3">Bắn trúng hành bị khắc: +20% sát thương · Trúng hành khắc mình: −15%</div>
    </div>
  );
}

function RankPopup() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.rank>>>([]);
  useEffect(() => {
    api.rank().then(setRows).catch(() => {});
  }, []);
  return (
    <div className="flex flex-col gap-1">
      {rows.map((r) => (
        <div key={r.rank} className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-track text-[12px]">
          <span className="w-6 font-display font-bold" style={{ color: r.rank <= 3 ? '#FFC86B' : '#9FB2A3' }}>#{r.rank}</span>
          <span className="flex-1">{r.name}</span>
          <span className="text-ink-3">Lv.{r.level}</span>
          <span className="font-display font-bold w-12 text-right">{r.elo}</span>
        </div>
      ))}
    </div>
  );
}

export function PopupHost() {
  const { t } = useTranslation();
  const popups = useGame((s) => s.popups);
  const close = useGame((s) => s.closePopup);
  const top = popups[0];
  const titles: Record<string, string> = {
    mode: t('chooseMode'),
    checkin: t('checkin'),
    mail: t('mail'),
    settings: t('settings'),
    collection: 'THIÊN BINH THẦN TƯỚNG',
    rank: t('rank'),
  };
  const body: Record<string, React.ReactNode> = {
    mode: <ModePopup />,
    checkin: <CheckInPopup />,
    mail: <MailPopup />,
    settings: <SettingsPopup />,
    collection: <CollectionPopup />,
    rank: <RankPopup />,
  };
  return (
    <div className="absolute inset-0 pointer-events-auto" style={{ pointerEvents: top ? 'auto' : 'none' }}>
      <Popup open={!!top} title={titles[top] ?? ''} onClose={close} width={top === 'collection' ? 720 : top === 'checkin' ? 560 : 500}>
        {top && body[top]}
      </Popup>
    </div>
  );
}
