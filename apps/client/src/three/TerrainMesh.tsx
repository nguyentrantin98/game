import { useMemo } from 'react';
import * as THREE from 'three';
import { useBattle } from '../store/battle';

/** Mỗi chunk 40 mẫu (20 đơn vị). Nổ chỉ làm đổi chữ ký của chunk liên quan → chỉ chunk đó dựng lại. */
const CHUNK = 40;
const ZF = 3.2;
const ZB = -3.2;
const BASE = -14;
const LIP = 0.55;

const cGrassTop = new THREE.Color('#7DBF4E');
const cGrassBack = new THREE.Color('#4E8A34');
const cLip = new THREE.Color('#3D6A20');
const cDirtTop = new THREE.Color('#8B6A43');
const cDirtBot = new THREE.Color('#2A1E14');

const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

function buildChunk(heights: number[], step: number, i0: number, i1: number) {
  const pos: number[] = [];
  const col: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[], ca: THREE.Color, cb: THREE.Color, cc: THREE.Color, cd: THREE.Color) => {
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (const k of [ca, cb, cc, ca, cc, cd]) col.push(k.r, k.g, k.b);
  };
  for (let i = i0; i < i1; i++) {
    const h0 = heights[i];
    const h1 = heights[i + 1];
    if (h0 <= 0.05 && h1 <= 0.05) continue; // vực
    const x0 = i * step;
    const x1 = (i + 1) * step;
    const l0 = Math.max(0, h0 - LIP);
    const l1 = Math.max(0, h1 - LIP);
    const b0 = h0 <= 0.05 ? h0 : BASE;
    const b1 = h1 <= 0.05 ? h1 : BASE;
    // mặt trước: thân đất (gradient) + viền cỏ
    const dt0 = cDirtBot.clone().lerp(cDirtTop, 0.9);
    quad([x0, b0, ZF], [x1, b1, ZF], [x1, l1, ZF], [x0, l0, ZF], cDirtBot, cDirtBot, dt0, dt0);
    quad([x0, l0, ZF], [x1, l1, ZF], [x1, h1, ZF], [x0, h0, ZF], cLip, cLip, cGrassTop, cGrassTop);
    // mặt trên: cỏ
    quad([x0, h0, ZF], [x1, h1, ZF], [x1, h1, ZB], [x0, h0, ZB], cGrassTop, cGrassTop, cGrassBack, cGrassBack);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function Chunk({ index }: { index: number }) {
  useBattle((s) => s.terrainVersion);
  const terrain = useBattle.getState().terrain!;
  const i0 = index * CHUNK;
  const i1 = Math.min(terrain.heights.length - 1, i0 + CHUNK);
  const signature = terrain.heights.slice(i0, i1 + 1).join(',');
  const geo = useMemo(() => buildChunk(terrain.heights, terrain.step, i0, i1), [signature]); // eslint-disable-line react-hooks/exhaustive-deps
  return <mesh geometry={geo} material={material} receiveShadow />;
}

export function TerrainMesh() {
  const terrain = useBattle((s) => s.terrain);
  if (!terrain) return null;
  const n = Math.ceil((terrain.heights.length - 1) / CHUNK);
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <Chunk key={i} index={i} />
      ))}
    </group>
  );
}
