import { useEffect, useMemo, useRef } from 'react';
import { WORLD_WIDTH } from '@army3d/shared';
import { camView, useBattle } from '../store/battle';

const W = 220;
const H = 46;
const MAX_Y = 40;

/** Mini map toàn bản đồ: kéo qua lại (hoặc chạm) để đưa camera tới chỗ đối thủ; nút ⟲ để quay về. */
export function MiniMap() {
  const terrain = useBattle((s) => s.terrain);
  const ver = useBattle((s) => s.terrainVersion);
  const players = useBattle((s) => s.state?.players);
  const myId = useBattle((s) => s.myId);
  const panned = useBattle((s) => s.camPanX !== null);
  const box = useRef<SVGRectElement>(null);
  const root = useRef<HTMLDivElement>(null);

  const sx = (x: number) => (x / WORLD_WIDTH) * W;
  const sy = (y: number) => H - (Math.max(-2, Math.min(MAX_Y, y)) / MAX_Y) * (H - 4);

  const ground = useMemo(() => {
    if (!terrain) return '';
    const n = terrain.heights.length;
    const stride = Math.max(1, Math.floor(n / 110));
    let d = `M0 ${H}`;
    for (let i = 0; i < n; i += stride) d += ` L${sx(i * terrain.step).toFixed(1)} ${sy(terrain.heights[i]).toFixed(1)}`;
    return d + ` L${W} ${H} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terrain, ver]);

  // khung camera cập nhật theo frame, không re-render React
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const r = box.current;
      if (r) {
        const x0 = sx(camView.x - camView.halfW);
        r.setAttribute('x', String(Math.max(0, x0)));
        r.setAttribute('width', String(Math.max(8, Math.min(W, sx(camView.x + camView.halfW)) - Math.max(0, x0))));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panTo = (clientX: number) => {
    const el = root.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    useBattle.setState({ camPanX: f * WORLD_WIDTH });
  };

  return (
    <div className="flex items-center gap-1 pointer-events-auto">
      <div
        ref={root}
        data-testid="minimap"
        className="rounded-lg overflow-hidden border border-line bg-[rgba(15,26,20,0.82)]"
        style={{ width: W, height: H, touchAction: 'none', cursor: 'grab' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          panTo(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) panTo(e.clientX);
        }}
      >
        <svg width={W} height={H} style={{ display: 'block' }}>
          <path d={ground} fill="#5B3A1E" stroke="#7FBF3F" strokeWidth={1} />
          <rect ref={box} y={1} height={H - 2} rx={3} fill="rgba(255,243,214,0.12)" stroke="#FFF3D6" strokeWidth={1} />
          {players
            ?.filter((p) => p.alive)
            .map((p) => (
              <g key={p.id}>
                {p.id === myId && <circle cx={sx(p.x)} cy={sy(p.y + 1)} r={5} fill="none" stroke="#FFC86B" strokeWidth={1.2} />}
                <circle cx={sx(p.x)} cy={sy(p.y + 1)} r={3} fill={p.team === 0 ? '#5CC8E0' : '#E8684A'} stroke="#0b120e" strokeWidth={1} />
              </g>
            ))}
        </svg>
      </div>
      {panned && (
        <button
          type="button"
          aria-label="recenter"
          className="w-7 h-7 rounded-lg grid place-items-center bg-panel border border-line text-[15px] text-accent-hi"
          onClick={() => useBattle.setState({ camPanX: null })}
        >
          ⟲
        </button>
      )}
    </div>
  );
}
