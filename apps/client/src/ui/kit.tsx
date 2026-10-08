import { AnimatePresence, motion } from 'motion/react';
import { gsap } from 'gsap';
import { X } from 'lucide-react';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { sfx } from '../audio/sfx';
import { useGame } from '../store/game';

// ───────── GameButton: nhún khi bấm + âm thanh click ─────────
export function GameButton({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className = '',
  style,
  id,
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  id?: string;
  'aria-label'?: string;
}) {
  return (
    <motion.button
      id={id}
      type="button"
      disabled={disabled}
      className={`btn-game ${variant === 'primary' ? '' : variant} ${className}`}
      style={style}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 600, damping: 15 }}
      onClick={() => {
        if (disabled) return;
        sfx('click');
        onClick?.();
      }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

// ───────── RedDot 红点: gắn theo key trên cây red-dot của server ─────────
export function RedDot({ dotKey, show }: { dotKey?: string; show?: boolean }) {
  const dots = useGame((s) => s.profile?.redDots);
  const on = show ?? (dotKey ? !!dots?.[dotKey] : false);
  return on ? <span className="red-dot" data-reddot={dotKey} /> : null;
}

// ───────── IconButton: icon tròn viền vàng + nhãn + red-dot ─────────
export function IconButton({
  icon,
  label,
  dotKey,
  onClick,
  id,
}: {
  icon: ReactNode;
  label: string;
  dotKey?: string;
  onClick?: () => void;
  id?: string;
}) {
  return (
    <motion.button
      id={id}
      type="button"
      className="flex flex-col items-center gap-0.5 bg-transparent border-0 p-0"
      whileTap={{ scale: 0.88 }}
      onClick={() => {
        sfx('click');
        onClick?.();
      }}
      aria-label={label}
    >
      <span className="icon-btn relative">
        {icon}
        <RedDot dotKey={dotKey} />
      </span>
      <span className="text-[10px] font-semibold text-ink text-stroke-dark" style={{ WebkitTextStroke: '2px #0b120e' }}>
        {label}
      </span>
    </motion.button>
  );
}

// ───────── Popup nảy (scale 0.6 → 1.05 → 1), đóng bằng X góc phải ─────────
export function Popup({
  open,
  title,
  onClose,
  children,
  width = 520,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-40 grid place-items-center"
          style={{ background: 'rgba(5,10,7,0.62)', backdropFilter: 'blur(2px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={title}
            className="panel-9 relative"
            style={{ width, maxWidth: '92%', maxHeight: 340 }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.05, 1], opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-1 rounded-md font-display font-bold tracking-[0.14em] text-[15px] whitespace-nowrap"
              style={{
                background: 'linear-gradient(180deg,#ffd88a,#f2a93b 50%,#d98a1c)',
                color: '#2a1606',
                boxShadow: '0 3px 0 #7a4a0e',
              }}
            >
              {title}
            </div>
            <button
              type="button"
              aria-label="close"
              onClick={() => {
                sfx('click');
                onClose();
              }}
              className="absolute -top-4 -right-4 w-9 h-9 rounded-full grid place-items-center border-2"
              style={{ background: '#E8684A', borderColor: '#fff3e0', boxShadow: '0 3px 0 #6e2416' }}
            >
              <X size={18} strokeWidth={3} color="#fff" />
            </button>
            <div className="pt-4 overflow-y-auto" style={{ maxHeight: 300 }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ───────── Toast nổi giữa màn ─────────
export function ToastHost() {
  const toast = useGame((s) => s.toast);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          className="absolute left-1/2 top-[38%] z-50 -translate-x-1/2 px-5 py-2 rounded-lg font-semibold text-[13px] pointer-events-none"
          style={{ background: 'rgba(10,16,12,0.88)', border: '1px solid #f2a93b' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          onAnimationComplete={() =>
            setTimeout(() => useGame.setState((s) => (s.toast?.id === toast.id ? { toast: null } : s)), 1400)
          }
        >
          {toast.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ───────── Số tăng dần (GSAP) ─────────
export function CountUp({ value, className, style }: { value: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const obj = { v: prev.current };
    const tw = gsap.to(obj, {
      v: value,
      duration: Math.min(1.2, Math.abs(value - prev.current) / 400 + 0.3),
      ease: 'power2.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = Math.round(obj.v).toLocaleString('vi-VN');
      },
    });
    prev.current = value;
    return () => {
      tw.kill();
    };
  }, [value]);
  return (
    <span ref={ref} className={className} style={style}>
      {prev.current.toLocaleString('vi-VN')}
    </span>
  );
}

// ───────── StatBar (giống board thiết kế: nhãn 64px, thanh 6px, số bên phải) ─────────
export function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-16 text-[11px] text-ink-3">{label}</div>
      <div className="flex-1 h-1.5 rounded bg-track overflow-hidden">
        <motion.div
          className="h-1.5 rounded"
          style={{ background: color }}
          initial={false}
          animate={{ width: `${value * 10}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        />
      </div>
      <div className="w-4 text-right font-display font-semibold text-[12px]">{value}</div>
    </div>
  );
}

// ───────── CountdownRing: đổi đỏ + rung khi còn ≤ 5s ─────────
export function CountdownRing({ seconds, total = 20, size = 40 }: { seconds: number; total?: number; size?: number }) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const danger = seconds <= 5;
  return (
    <div className={`relative ${danger && seconds > 0 ? 'shake' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#24342A" strokeWidth={4} fill="#0F1A14" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={danger ? '#E8684A' : '#F2A93B'}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, seconds) / total)}
          style={{ transition: 'stroke-dashoffset 0.25s linear' }}
        />
      </svg>
      <div
        className="absolute inset-0 grid place-items-center font-display font-bold text-[14px]"
        style={{ color: danger ? '#FF8A80' : '#E9EFE6' }}
      >
        {Math.max(0, Math.ceil(seconds))}
      </div>
    </div>
  );
}

// ───────── Marquee 跑马灯 ─────────
export function Marquee({ text }: { text: string }) {
  return (
    <div
      className="overflow-hidden rounded-full text-[11px] py-0.5"
      style={{ background: 'rgba(10,16,12,0.7)', border: '1px solid #2A3B2F' }}
    >
      <span className="marquee-track text-accent-hi">{text}</span>
    </div>
  );
}

// ───────── Avatar SVG nhân vật (giống minh họa trong file thiết kế) ─────────
export function CharacterAvatar({
  color,
  dark,
  size = 72,
  skin,
}: {
  color: string;
  dark: string;
  size?: number;
  skin?: { robe: string; trim: string } | null;
}) {
  const body = skin?.robe ?? color;
  const hat = skin?.trim ?? dark;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <ellipse cx="60" cy="108" rx="30" ry="5" fill="#000" fillOpacity="0.35" />
      <polygon points="40,106 80,106 76,70 44,70" fill={body} />
      <polygon points="44,70 76,70 72,80 48,80" fill={hat} />
      <rect x="66" y="78" width="40" height="9" rx="2" fill="#2B302C" transform="rotate(-18 66 82)" />
      <rect x="98" y="66" width="8" height="12" rx="2" fill={hat} transform="rotate(-18 102 72)" />
      <polygon points="60,24 80,34 80,58 60,68 40,58 40,34" fill="#F0D2B0" />
      <polygon points="36,40 42,24 60,14 78,24 84,40 84,44 36,44" fill={hat} />
      <rect x="36" y="40" width="48" height="5" fill={body} />
      <rect x="49" y="50" width="5" height="7" rx="1" fill="#1B1F1C" />
      <rect x="66" y="50" width="5" height="7" rx="1" fill="#1B1F1C" />
    </svg>
  );
}
