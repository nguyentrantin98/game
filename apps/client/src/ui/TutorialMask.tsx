import { motion } from 'motion/react';
import { Hand } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameButton } from './kit';
import { useStage } from './Stage';

/**
 * Hướng dẫn tân thủ 新手引导: phủ tối toàn màn, khoét lỗ sáng quanh phần tử cần bấm,
 * bàn tay chỉ vào, bước nối bước.
 */
export function TutorialMask({ targets, onDone }: { targets: string[]; onDone: () => void }) {
  const { t } = useTranslation();
  const { scale } = useStage();
  const steps = t('tutorial', { returnObjects: true }) as string[];
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = document.getElementById(targets[i]);
      const stage = document.getElementById('stage');
      if (!el || !stage) return setRect(null);
      const r = el.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      setRect({ x: (r.left - s.left) / scale - 6, y: (r.top - s.top) / scale - 6, w: r.width / scale + 12, h: r.height / scale + 12 });
    };
    measure();
    const id = setInterval(measure, 300);
    return () => clearInterval(id);
  }, [i, targets, scale]);

  const next = () => (i + 1 >= targets.length ? onDone() : setI(i + 1));
  return (
    <div className="absolute inset-0 z-30 pointer-events-auto" data-testid="tutorial">
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="tut-hole">
            <rect width="100%" height="100%" fill="white" />
            {rect && <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={12} fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(4,8,6,0.72)" mask="url(#tut-hole)" />
        {rect && (
          <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={12} fill="none" stroke="#FFC86B" strokeWidth={2} strokeDasharray="6 4" />
        )}
      </svg>
      {rect && (
        <motion.div
          className="absolute"
          style={{ left: rect.x + rect.w / 2 - 6, top: rect.y + rect.h - 8 }}
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 0.9, repeat: Infinity }}
        >
          <Hand size={34} color="#FFF3D6" fill="#F2A93B" />
        </motion.div>
      )}
      <div
        className="absolute left-1/2 -translate-x-1/2 panel-9 flex items-center gap-3"
        style={{ top: rect && rect.y < 180 ? 230 : 80, width: 420 }}
      >
        <div className="flex-1 text-[13px] leading-snug">
          <span className="font-display text-accent mr-2">
            {i + 1}/{targets.length}
          </span>
          {steps[i]}
        </div>
        <GameButton className="px-4 py-1.5 text-[13px]" onClick={next}>
          {t('next')}
        </GameButton>
      </div>
    </div>
  );
}
