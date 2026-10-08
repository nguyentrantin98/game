import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SkinDef, WeaponDef } from '@army3d/shared';

/**
 * Nhân vật chibi low-poly dựng procedural (placeholder trước khi có .glb):
 * thân lục giác, đầu low-poly, mũ, nòng súng xoay theo góc ngắm.
 * Chất liệu MeshToonMaterial 3 dải sáng + viền mực inverted hull (đúng spec skin Thần Thoại).
 */

const gradientMap = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

const G = {
  body: new THREE.CylinderGeometry(0.42, 0.56, 0.85, 6),
  belt: new THREE.CylinderGeometry(0.47, 0.5, 0.16, 6),
  head: new THREE.IcosahedronGeometry(0.5, 1),
  helmet: new THREE.SphereGeometry(0.56, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
  brim: new THREE.CylinderGeometry(0.6, 0.62, 0.1, 8),
  eye: new THREE.BoxGeometry(0.08, 0.14, 0.05),
  barrel: new THREE.BoxGeometry(1.2, 0.2, 0.22).translate(0.6, 0, 0),
  muzzle: new THREE.BoxGeometry(0.22, 0.3, 0.3),
  cone: new THREE.ConeGeometry(0.12, 0.4, 5),
  torus: new THREE.TorusGeometry(0.62, 0.05, 6, 24),
  band: new THREE.TorusGeometry(0.52, 0.045, 5, 16),
  wing: new THREE.BoxGeometry(0.9, 0.5, 0.05),
  tail: new THREE.ConeGeometry(0.1, 0.8, 5).translate(0, 0.4, 0),
  plume: new THREE.CylinderGeometry(0.025, 0.04, 1.1, 4).translate(0, 0.55, 0),
  shadow: new THREE.CircleGeometry(0.8, 16).rotateX(-Math.PI / 2),
  ring: new THREE.RingGeometry(0.75, 0.9, 24).rotateX(-Math.PI / 2),
  arrow: new THREE.ConeGeometry(0.25, 0.45, 4).rotateX(Math.PI),
};

const outlineMat = new THREE.MeshBasicMaterial({ color: '#120e0a', side: THREE.BackSide });
const matCache = new Map<string, THREE.MeshToonMaterial>();
function toon(color: string) {
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap });
    matCache.set(color, m);
  }
  return m;
}

function Part({
  geo,
  color,
  outline = true,
  ...props
}: { geo: THREE.BufferGeometry; color: string; outline?: boolean } & ThreeElements['group']) {
  return (
    <group {...props}>
      <mesh geometry={geo} material={toon(color)} />
      {outline && <mesh geometry={geo} material={outlineMat} scale={1.08} />}
    </group>
  );
}

export interface CharacterProps {
  def: WeaponDef;
  skin?: SkinDef | null;
  angle?: number;
  facing?: 1 | -1;
  alive?: boolean;
  team?: 0 | 1;
  current?: boolean;
  hitAt?: () => number;
  showRing?: boolean;
}

export function CharacterModel({
  def,
  skin,
  angle = 30,
  facing = 1,
  alive = true,
  team = 0,
  current = false,
  hitAt,
  showRing = true,
}: CharacterProps) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const barrel = useRef<THREE.Group>(null);
  const arrow = useRef<THREE.Group>(null);
  const seed = useMemo(() => Math.random() * 10, []);

  const color = skin?.robe ?? def.colors.color;
  const dark = skin?.trim ?? def.colors.dark;
  const acc = skin?.id;

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime + seed;
    if (body.current) {
      body.current.position.y = alive ? Math.abs(Math.sin(t * 2.6)) * 0.05 : 0;
      const since = hitAt ? performance.now() - hitAt() : 1e9;
      body.current.position.x = since < 350 ? Math.sin(since * 0.12) * 0.12 : 0;
      const targetRot = alive ? 0 : -Math.PI / 2;
      body.current.rotation.z += (targetRot - body.current.rotation.z) * Math.min(1, dt * 6);
    }
    if (barrel.current) {
      const target = (angle * Math.PI) / 180;
      barrel.current.rotation.z += (target - barrel.current.rotation.z) * Math.min(1, dt * 12);
    }
    if (arrow.current) {
      arrow.current.visible = current && alive;
      arrow.current.position.y = 3.05 + Math.sin(t * 5) * 0.12;
      arrow.current.rotation.y = t * 2;
    }
    if (root.current) {
      const ry = facing * 0.45;
      root.current.rotation.y += (ry - root.current.rotation.y) * Math.min(1, dt * 8);
    }
  });

  const teamColor = team === 0 ? '#5CC8E0' : '#E8684A';

  return (
    <group>
      <mesh geometry={G.shadow} position={[0, 0.02, 0]}>
        <meshBasicMaterial color="#000" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {showRing && (
        <mesh geometry={G.ring} position={[0, 0.04, 0]}>
          <meshBasicMaterial color={teamColor} transparent opacity={0.85} />
        </mesh>
      )}
      <group ref={arrow} position={[0, 3, 0]}>
        <mesh geometry={G.arrow}>
          <meshToonMaterial color="#F2A93B" gradientMap={gradientMap} emissive="#7a4a0e" />
        </mesh>
      </group>
      <group ref={root} scale={[facing, 1, 1]}>
        <group ref={body}>
          {/* thân + thắt lưng */}
          <Part geo={G.body} color={color} position={[0, 0.43, 0]} />
          <Part geo={G.belt} color={dark} position={[0, 0.82, 0]} />
          {/* đầu + mắt */}
          <Part geo={G.head} color="#F0D2B0" position={[0, 1.38, 0]} />
          <mesh geometry={G.eye} position={[-0.16, 1.36, 0.45]} material={toon('#1B1F1C')} />
          <mesh geometry={G.eye} position={[0.16, 1.36, 0.45]} material={toon('#1B1F1C')} />
          {/* mũ */}
          <Part geo={G.helmet} color={dark} position={[0, 1.5, 0]} />
          <Part geo={G.brim} color={color} position={[0, 1.52, 0]} />
          {/* nòng súng xoay theo góc ngắm */}
          <group ref={barrel} position={[0.3, 0.7, 0.35]}>
            <Part geo={G.barrel} color="#2B302C" />
            <Part geo={G.muzzle} color={dark} position={[1.2, 0, 0]} />
          </group>
          {/* phụ kiện skin Thần Thoại (mesh rời gắn vào khung) */}
          {(acc === 'tethien' || acc === 'cuuvi') && (
            <>
              <Part geo={G.cone} color={acc === 'cuuvi' ? '#E8E2DA' : '#6A4424'} position={[-0.38, 1.95, 0]} rotation={[0, 0, 0.4]} />
              <Part geo={G.cone} color={acc === 'cuuvi' ? '#E8E2DA' : '#6A4424'} position={[0.38, 1.95, 0]} rotation={[0, 0, -0.4]} />
            </>
          )}
          {acc === 'tethien' && <Part geo={G.band} color="#D9A84A" position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]} outline={false} />}
          {acc === 'nguyettien' && (
            <mesh geometry={G.torus} position={[0, 1.55, -0.45]}>
              <meshBasicMaterial color="#FFF3D6" />
            </mesh>
          )}
          {acc === 'longtu' && (
            <>
              <Part geo={G.cone} color="#3E9A80" position={[-0.3, 2.05, 0]} rotation={[0, 0, 0.6]} />
              <Part geo={G.cone} color="#3E9A80" position={[0.3, 2.05, 0]} rotation={[0, 0, -0.6]} />
            </>
          )}
          {(acc === 'loicong' || acc === 'chutuoc') && (
            <>
              <Part geo={G.wing} color={dark} position={[-0.55, 1.0, -0.35]} rotation={[0, 0.5, 0.5]} />
              <Part geo={G.wing} color={dark} position={[0.55, 1.0, -0.35]} rotation={[0, -0.5, -0.5]} />
            </>
          )}
          {(acc === 'tamnhan' || acc === 'chutuoc') && (
            <>
              <Part geo={G.plume} color="#B8322A" position={[-0.15, 1.95, -0.1]} rotation={[0.2, 0, 0.5]} outline={false} />
              <Part geo={G.plume} color="#B8322A" position={[0.15, 1.95, -0.1]} rotation={[0.2, 0, -0.2]} outline={false} />
            </>
          )}
          {acc === 'tamnhan' && <mesh geometry={G.eye} position={[0, 1.6, 0.47]} rotation={[0, 0, Math.PI / 2]} material={toon('#E0573E')} />}
          {acc === 'cuuvi' &&
            Array.from({ length: 9 }, (_, k) => (
              <Part
                key={k}
                geo={G.tail}
                color={k % 2 ? '#F3E9DA' : '#E8A86A'}
                position={[0, 0.35, -0.4]}
                rotation={[-0.6, 0, ((k - 4) / 4) * 1.1]}
                outline={false}
              />
            ))}
        </group>
      </group>
    </group>
  );
}
