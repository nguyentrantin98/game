import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/**
 * VFX dùng InstancedMesh + pool tạo sẵn: mảnh vụn, khói, tia lửa — không cấp phát object mới mỗi frame.
 * API mệnh lệnh: vfx.burst(...), vfx.bolt(...), vfx.flash(...), vfx.shake(...)
 */
const MAX = 360;

interface P {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  grav: number;
  color: THREE.Color;
}

const pool: P[] = Array.from({ length: MAX }, () => ({
  x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, grav: 0, color: new THREE.Color(),
}));
let cursor = 0;

const bolts: { a: THREE.Vector3; b: THREE.Vector3; life: number; color: THREE.Color }[] = [];
const flashes: { x: number; y: number; life: number; color: THREE.Color; power: number }[] = [];
let shakeAmp = 0;

function spawn(x: number, y: number, vx: number, vy: number, vz: number, life: number, size: number, grav: number, color: string) {
  const p = pool[cursor];
  cursor = (cursor + 1) % MAX;
  Object.assign(p, { x, y, z: (Math.random() - 0.5) * 2, vx, vy, vz, life, max: life, size, grav });
  p.color.set(color);
}

export const vfx = {
  burst(x: number, y: number, radius: number, palette: string[] = ['#FFC86B', '#F2A93B', '#E8684A', '#8B6A43', '#3A2A1C']) {
    const n = Math.min(70, 22 + Math.round(radius * 9));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI;
      const s = (4 + Math.random() * 10) * (radius / 3);
      spawn(x, y, Math.cos(a) * s, Math.sin(a) * s + 3, (Math.random() - 0.5) * 6, 0.6 + Math.random() * 0.8, 0.15 + Math.random() * 0.3, 22, palette[i % palette.length]);
    }
    // khói
    for (let i = 0; i < 10; i++) {
      spawn(x + (Math.random() - 0.5) * radius, y + Math.random(), (Math.random() - 0.5) * 2, 1.5 + Math.random() * 2, 0, 1.2 + Math.random(), 0.6 + Math.random() * 0.5, -1, '#5A5A52');
    }
    flashes.push({ x, y, life: 0.25, color: new THREE.Color('#FFC86B'), power: 60 * radius });
    shakeAmp = Math.max(shakeAmp, 0.25 + radius * 0.08);
  },
  heal(x: number, y: number, radius: number) {
    for (let i = 0; i < 40; i++) {
      spawn(x + (Math.random() - 0.5) * radius * 2, y + Math.random(), 0, 2 + Math.random() * 3, 0, 1 + Math.random(), 0.15 + Math.random() * 0.2, -1, i % 2 ? '#4FC4A8' : '#C8FFE8');
    }
    flashes.push({ x, y, life: 0.4, color: new THREE.Color('#4FC4A8'), power: 40 });
  },
  sparkle(x: number, y: number, color = '#B9C9F0') {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      spawn(x, y + 1, Math.cos(a) * 4, Math.sin(a) * 4, 0, 0.6 + Math.random() * 0.4, 0.12, 0, color);
    }
  },
  muzzle(x: number, y: number, dir: number) {
    for (let i = 0; i < 12; i++) {
      spawn(x, y, dir * (4 + Math.random() * 6), (Math.random() - 0.3) * 4, 0, 0.25 + Math.random() * 0.2, 0.18, 0, i % 2 ? '#FFF3D6' : '#F2A93B');
    }
  },
  bolt(ax: number, ay: number, bx: number, by: number) {
    bolts.push({ a: new THREE.Vector3(ax, ay, 0.5), b: new THREE.Vector3(bx, by, 0.5), life: 0.45, color: new THREE.Color('#B8A8FF') });
    flashes.push({ x: bx, y: by, life: 0.3, color: new THREE.Color('#8F7BE0'), power: 80 });
  },
  shake(a: number) {
    shakeAmp = Math.max(shakeAmp, a);
  },
  takeShake(dt: number) {
    const a = shakeAmp;
    shakeAmp = Math.max(0, shakeAmp - dt * 1.6);
    return a;
  },
};

const tmp = new THREE.Object3D();

export function VfxLayer() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const boltLine = useRef<THREE.LineSegments>(null);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const boltGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(4 * 2 * 3 * 8), 3));
    return g;
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < MAX; i++) {
      const p = pool[i];
      if (p.life > 0) {
        p.life -= dt;
        p.vy -= p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const k = Math.max(0, p.life / p.max);
        tmp.position.set(p.x, p.y, p.z);
        tmp.scale.setScalar(p.size * (p.grav < 0 ? 1.6 - k : 0.4 + k * 0.6));
        tmp.rotation.set(p.x, p.y, 0);
      } else {
        tmp.scale.setScalar(0);
      }
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      m.setColorAt(i, p.color);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;

    // ánh chớp nổ
    const L = light.current!;
    const f = flashes[0];
    if (f) {
      f.life -= dt;
      L.position.set(f.x, f.y + 2, 4);
      L.color.copy(f.color);
      L.intensity = Math.max(0, f.life) * f.power;
      if (f.life <= 0) flashes.shift();
    } else L.intensity = 0;

    // tia sét zigzag
    const arr = boltGeo.attributes.position.array as Float32Array;
    arr.fill(0);
    let o = 0;
    for (let bi = bolts.length - 1; bi >= 0; bi--) {
      const b = bolts[bi];
      b.life -= dt;
      if (b.life <= 0) {
        bolts.splice(bi, 1);
        continue;
      }
      const segs = 8;
      let prev = b.a.clone();
      for (let s = 1; s <= segs && o < arr.length - 6; s++) {
        const next = b.a.clone().lerp(b.b, s / segs);
        if (s < segs) next.y += (Math.random() - 0.5) * 1.6;
        arr.set([prev.x, prev.y, prev.z, next.x, next.y, next.z], o);
        o += 6;
        prev = next;
      }
    }
    boltGeo.attributes.position.needsUpdate = true;
    if (boltLine.current) boltLine.current.visible = o > 0;
  });

  return (
    <>
      <instancedMesh ref={mesh} args={[geo, undefined, MAX]} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <pointLight ref={light} intensity={0} distance={30} decay={1.5} />
      <lineSegments ref={boltLine} geometry={boltGeo} frustumCulled={false}>
        <lineBasicMaterial color="#D8CCFF" toneMapped={false} />
      </lineSegments>
    </>
  );
}
