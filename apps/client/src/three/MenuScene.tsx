import { PresentationControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getCharacter, getSkin } from '@army3d/shared';
import { skinForChar } from '../net/battleController';
import { useGame } from '../store/game';
import { CharacterModel } from './CharacterModel';

/** Bệ đứng nhân vật ở sảnh / màn chọn tướng: xoay bằng tay, ánh sáng sân khấu, bụi vàng bay. */
export function MenuScene() {
  const charId = useGame((s) => s.charId);
  const skinOn = useGame((s) => s.skinOn);
  const screen = useGame((s) => s.screen);
  const def = getCharacter(charId);
  const skin = skinOn ? getSkin(skinForChar(charId)) : null;
  const { camera } = useThree();
  const spin = useRef<THREE.Group>(null);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = 30;
    cam.near = 0.1;
    cam.far = 200;
    cam.position.set(0, 2.6, 14);
    cam.lookAt(0, 1.5, 0);
    cam.updateProjectionMatrix();
  }, [camera, screen]);

  const motes = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 80;
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * 12, Math.random() * 6, (Math.random() - 0.5) * 6 - 2], i * 3);
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return g;
  }, []);
  const motesRef = useRef<THREE.Points>(null);

  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.35;
    if (motesRef.current) {
      const a = motes.attributes.position.array as Float32Array;
      for (let i = 1; i < a.length; i += 3) a[i] = a[i] > 6 ? 0 : a[i] + dt * 0.4;
      motes.attributes.position.needsUpdate = true;
    }
  });

  const accent = skin?.trim ?? def.colors.color;
  return (
    <>
      <color attach="background" args={[skin?.bg ?? def.colors.bg]} />
      <fog attach="fog" args={[skin?.bg ?? def.colors.bg, 10, 28]} />
      <hemisphereLight args={['#FFF3D6', '#15221A', 1.0]} />
      <directionalLight position={[3, 6, 5]} intensity={1.8} color="#FFE2B0" />
      <spotLight position={[0, 8, 2]} angle={0.5} penumbra={0.6} intensity={60} color={accent} />
      <points ref={motesRef} geometry={motes}>
        <pointsMaterial color="#FFC86B" size={0.06} transparent opacity={0.8} />
      </points>
      {/* bệ đứng */}
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[1.5, 1.7, 0.25, 8]} />
        <meshLambertMaterial color="#15221A" />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.3, 1.5, 8]} />
        <meshBasicMaterial color={accent} />
      </mesh>
      <PresentationControls global={false} snap polar={[0, 0]} azimuth={[-Math.PI, Math.PI]}>
        <group ref={spin} scale={1.45}>
          <CharacterModel def={def} skin={skin} angle={25} facing={1} showRing={false} />
        </group>
      </PresentationControls>
    </>
  );
}
