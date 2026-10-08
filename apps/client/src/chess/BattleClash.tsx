import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { motion } from 'motion/react';
import { Component, Suspense, useEffect, useState, type ReactNode } from 'react';
import { sfx } from '../audio/sfx';
import { Portrait, type Hero } from './roster';

// Cảnh giao chiến khi ăn quân. Nếu có `public/models/<hero.id>.glb` (vd. mua trên Cubebrush/RenderHub
// rồi xuất GLB) thì hiện model 3D, không có thì dùng chân dung vẽ sẵn.

const glbCache = new Map<string, boolean>();
function useHasModel(id: string) {
  const [ok, setOk] = useState(glbCache.get(id) ?? false);
  useEffect(() => {
    if (glbCache.has(id)) return;
    fetch(`/models/${id}.glb`, { method: 'HEAD' })
      .then((r) => r.ok && !r.headers.get('content-type')?.includes('text/html'))
      .catch(() => false)
      .then((v) => {
        glbCache.set(id, v);
        setOk(v);
      });
  }, [id]);
  return ok;
}

function Model({ id, flip }: { id: string; flip: boolean }) {
  const { scene } = useGLTF(`/models/${id}.glb`);
  return <primitive object={scene.clone()} rotation={[0, flip ? -0.6 : 0.6, 0]} />;
}

class Safe extends Component<{ fallback: ReactNode; children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children;
  }
}

function Fighter({ h, flip }: { h: Hero; flip: boolean }) {
  const has = useHasModel(h.id);
  const flat = (
    <div className="w-full h-full rounded-full overflow-hidden vc-medal">
      <Portrait h={h} />
    </div>
  );
  if (!has) return flat;
  return (
    <Safe fallback={flat}>
      <Canvas camera={{ position: [0, 1.2, 3], fov: 40 }} gl={{ alpha: true }}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 4, 3]} intensity={2} />
        <Suspense fallback={null}>
          <Model id={h.id} flip={flip} />
        </Suspense>
      </Canvas>
    </Safe>
  );
}

export function BattleClash({ attacker, defender, red, onDone }: { attacker: Hero; defender: Hero; red: boolean; onDone(): void }) {
  useEffect(() => {
    const a = setTimeout(() => sfx('hit'), 550);
    const b = setTimeout(() => sfx('boom'), 800);
    const c = setTimeout(onDone, 1700);
    return () => [a, b, c].forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const L = red ? attacker : defender;
  const R = red ? defender : attacker;
  const atkLeft = red;
  return (
    <motion.div
      className="vc-clash"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, x: [0, 0, -8, 8, -5, 0] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, times: [0, 0.6, 0.65, 0.7, 0.75, 0.8] }}
      onClick={onDone}
    >
      <div className="vc-clash-bg" />
      {[L, R].map((h, i) => {
        const isAtk = (i === 0) === atkLeft;
        const dir = i === 0 ? 1 : -1;
        return (
          <motion.div
            key={i}
            className="vc-fighter"
            style={{ [i === 0 ? 'left' : 'right']: '8%' }}
            initial={{ x: -260 * dir, rotate: -15 * dir }}
            animate={
              isAtk
                ? { x: [-260 * dir, 0, 150 * dir, 60 * dir], rotate: [-15 * dir, 0, 8 * dir, 0] }
                : { x: [-260 * dir, 0, 0, -40 * dir, -500 * dir], rotate: [0, 0, 0, -30 * dir, -90 * dir], opacity: [1, 1, 1, 1, 0] }
            }
            transition={{ duration: 1.3, times: isAtk ? [0, 0.35, 0.5, 0.7] : [0, 0.35, 0.55, 0.7, 1] }}
          >
            <div className="w-[150px] h-[150px]">
              <Fighter h={h} flip={i === 1} />
            </div>
            <div className="vc-fname">
              {h.name} <span className="font-han">{h.han}</span>
            </div>
          </motion.div>
        );
      })}
      {/* chém + tia lửa */}
      <motion.div
        className="vc-slash"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: [0, 1.2, 1.2], opacity: [0, 1, 0] }}
        transition={{ delay: 0.6, duration: 0.45 }}
      />
      {Array.from({ length: 14 }, (_, k) => {
        const a = (k / 14) * Math.PI * 2;
        return (
          <motion.i
            key={k}
            className="vc-spark"
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={{ x: Math.cos(a) * 160, y: Math.sin(a) * 110, opacity: [0, 1, 0] }}
            transition={{ delay: 0.65, duration: 0.6 }}
          />
        );
      })}
      <motion.div
        className="vc-ko font-han"
        initial={{ scale: 3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.85, type: 'spring', stiffness: 400, damping: 14 }}
      >
        斩!
      </motion.div>
    </motion.div>
  );
}
