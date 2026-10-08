import { motion } from 'motion/react';
import { Smartphone } from 'lucide-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Độ phân giải thiết kế: 844×390 (iPhone 14 ngang), chính sách "fixed height". */
export const DESIGN_H = 390;
const MIN_W = 700;

interface StageDim {
  scale: number;
  w: number;
  h: number;
  portrait: boolean;
}

function measure(): StageDim {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let scale = vh / DESIGN_H;
  // màn quá hẹp (tablet 4:3) → co theo chiều rộng
  if (vw / scale < MIN_W) scale = vw / MIN_W;
  return { scale, w: vw / scale, h: vh / scale, portrait: vh > vw * 1.05 };
}

const StageCtx = createContext<StageDim>({ scale: 1, w: 844, h: 390, portrait: false });
export const useStage = () => useContext(StageCtx);

export function Stage({ children }: { children: ReactNode }) {
  const [dim, setDim] = useState(measure);
  useEffect(() => {
    const on = () => setDim(measure());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
    };
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(dim.scale));
  }, [dim.scale]);

  return (
    <StageCtx.Provider value={dim}>
      <div
        id="stage"
        className="absolute left-0 top-0 pointer-events-none"
        style={{ width: dim.w, height: dim.h, transform: `scale(${dim.scale})`, transformOrigin: '0 0' }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            left: 'calc(env(safe-area-inset-left) / var(--ui-scale))',
            right: 'calc(env(safe-area-inset-right) / var(--ui-scale))',
            top: 'calc(env(safe-area-inset-top) / var(--ui-scale))',
            bottom: 'calc(env(safe-area-inset-bottom) / var(--ui-scale))',
          }}
        >
          {children}
        </div>
      </div>
      {dim.portrait && <RotateHint />}
    </StageCtx.Provider>
  );
}

function RotateHint() {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-bg text-center">
      <div className="flex flex-col items-center gap-4">
        <motion.div animate={{ rotate: [0, -90, -90, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
          <Smartphone size={64} color="#F2A93B" />
        </motion.div>
        <div className="font-display font-semibold text-lg tracking-widest">{t('rotate')}</div>
      </div>
    </div>
  );
}
