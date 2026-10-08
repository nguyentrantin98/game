import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useState } from 'react';
import * as THREE from 'three';
import { useGame } from '../store/game';
import { BattleScene } from './BattleScene';
import { MenuScene } from './MenuScene';

const DPR = { low: 1, mid: 1.5, high: 2 } as const;

/**
 * Một Canvas duy nhất cho cả game (không tạo lại WebGL context khi đổi màn).
 * DPR tối đa 2, tắt antialias, tone mapping ACES. Chế độ "Tự động" hạ DPR khi FPS thấp.
 */
export function GameCanvas() {
  const screen = useGame((s) => s.screen);
  const quality = useGame((s) => s.settings.quality);
  const [autoDpr, setAutoDpr] = useState(1.5);
  const dpr = quality === 'auto' ? autoDpr : DPR[quality];
  const showDebug = typeof location !== 'undefined' && location.search.includes('debug=1');

  if (screen === 'loading') return null;
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={Math.min(dpr, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2)}
      gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
      camera={{ fov: 30, position: [0, 2, 10] }}
      style={{ touchAction: 'none' }}
    >
      <PerformanceMonitor
        onDecline={() => setAutoDpr((d) => Math.max(1, d - 0.25))}
        onIncline={() => setAutoDpr((d) => Math.min(2, d + 0.25))}
      />
      {screen === 'battle' || screen === 'result' ? <BattleScene /> : <MenuScene />}
      {showDebug && <DebugStats />}
    </Canvas>
  );
}

function DebugStats() {
  const { gl } = useThree();
  useFrame(() => {
    const el = document.getElementById('debug-stats');
    if (el) el.textContent = `draw ${gl.info.render.calls} · tri ${gl.info.render.triangles}`;
  });
  return null;
}
