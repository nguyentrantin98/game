import { useEffect, useMemo, useState } from 'react';
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

/** Kích thước 1 lần lặp texture (đơn vị thế giới). */
const TILE = 7;

const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

/**
 * Texture chân thực từ Poly Haven (CC0) — tải bằng `pnpm textures` vào public/textures.
 * Chưa có file thì giữ material màu đỉnh (toon) như cũ.
 */
type TexSet = { grass: THREE.MeshStandardMaterial; rock: THREE.MeshStandardMaterial };
let texPromise: Promise<TexSet | null> | null = null;
function loadTextures(): Promise<TexSet | null> {
  if (texPromise) return texPromise;
  const loader = new THREE.TextureLoader();
  const base = `${import.meta.env.BASE_URL}textures/`;
  const load = (name: string, srgb: boolean) =>
    new Promise<THREE.Texture>((res, rej) =>
      loader.load(
        base + name,
        (t) => {
          t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.anisotropy = 4;
          if (srgb) t.colorSpace = THREE.SRGBColorSpace;
          res(t);
        },
        undefined,
        rej,
      ),
    );
  const mat = async (role: string) =>
    new THREE.MeshStandardMaterial({
      map: await load(`${role}_diff.jpg`, true),
      normalMap: await load(`${role}_nor.jpg`, false),
      roughnessMap: await load(`${role}_rough.jpg`, false),
      vertexColors: true,
      metalness: 0,
    });
  texPromise = Promise.all([mat('grass'), mat('rock')])
    .then(([grass, rock]) => ({ grass, rock }))
    .catch(() => null);
  return texPromise;
}

/** Tông màu nhân với texture: sáng ở trên, tối dần xuống chân (giả AO). */
const wTop = new THREE.Color('#FFFFFF');
const wBack = new THREE.Color('#B8C4A8');
const wRockTop = new THREE.Color('#E8E0D4');
const wRockBot = new THREE.Color('#2E2620');

function buildTextured(heights: number[], step: number, i0: number, i1: number) {
  const mk = () => ({ pos: [] as number[], uv: [] as number[], col: [] as number[] });
  const grass = mk();
  const rock = mk();
  const quad = (o: ReturnType<typeof mk>, v: number[][], uv: number[][], c: THREE.Color[]) => {
    for (const k of [0, 1, 2, 0, 2, 3]) {
      o.pos.push(...v[k]);
      o.uv.push(...uv[k]);
      o.col.push(c[k].r, c[k].g, c[k].b);
    }
  };
  for (let i = i0; i < i1; i++) {
    const h0 = heights[i];
    const h1 = heights[i + 1];
    if (h0 <= 0.05 && h1 <= 0.05) continue;
    const x0 = i * step;
    const x1 = (i + 1) * step;
    const l0 = Math.max(0, h0 - LIP);
    const l1 = Math.max(0, h1 - LIP);
    const b0 = h0 <= 0.05 ? h0 : BASE;
    const b1 = h1 <= 0.05 ? h1 : BASE;
    const u0 = x0 / TILE;
    const u1 = x1 / TILE;
    const shade = (y: number) => wRockBot.clone().lerp(wRockTop, THREE.MathUtils.clamp((y - BASE) / (20 - BASE), 0, 1));
    // vách đá phía trước (UV theo x,y)
    quad(rock, [[x0, b0, ZF], [x1, b1, ZF], [x1, l1, ZF], [x0, l0, ZF]], [[u0, b0 / TILE], [u1, b1 / TILE], [u1, l1 / TILE], [u0, l0 / TILE]], [shade(b0), shade(b1), shade(l1), shade(l0)]);
    // viền cỏ phủ mép
    quad(grass, [[x0, l0, ZF], [x1, l1, ZF], [x1, h1, ZF], [x0, h0, ZF]], [[u0, 0], [u1, 0], [u1, LIP / TILE], [u0, LIP / TILE]], [wBack, wBack, wTop, wTop]);
    // mặt cỏ phía trên (UV theo x,z)
    quad(grass, [[x0, h0, ZF], [x1, h1, ZF], [x1, h1, ZB], [x0, h0, ZB]], [[u0, ZF / TILE], [u1, ZF / TILE], [u1, ZB / TILE], [u0, ZB / TILE]], [wTop, wTop, wBack, wBack]);
  }
  const geo = (o: ReturnType<typeof mk>) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(o.col, 3));
    g.computeVertexNormals();
    return g;
  };
  return { grass: geo(grass), rock: geo(rock) };
}

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

function Chunk({ index, tex }: { index: number; tex: TexSet | null }) {
  useBattle((s) => s.terrainVersion);
  const terrain = useBattle.getState().terrain!;
  const i0 = index * CHUNK;
  const i1 = Math.min(terrain.heights.length - 1, i0 + CHUNK);
  const signature = terrain.heights.slice(i0, i1 + 1).join(',');
  const geo = useMemo(
    () => (tex ? buildTextured(terrain.heights, terrain.step, i0, i1) : buildChunk(terrain.heights, terrain.step, i0, i1)),
    [signature, !!tex], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(
    () => () => {
      if (geo instanceof THREE.BufferGeometry) geo.dispose();
      else {
        geo.grass.dispose();
        geo.rock.dispose();
      }
    },
    [geo],
  );
  if (geo instanceof THREE.BufferGeometry || !tex) return <mesh geometry={geo as THREE.BufferGeometry} material={material} receiveShadow />;
  return (
    <>
      <mesh geometry={geo.rock} material={tex.rock} receiveShadow />
      <mesh geometry={geo.grass} material={tex.grass} receiveShadow />
    </>
  );
}

export function TerrainMesh() {
  const terrain = useBattle((s) => s.terrain);
  const [tex, setTex] = useState<TexSet | null>(null);
  useEffect(() => {
    let alive = true;
    loadTextures().then((t) => alive && setTex(t));
    return () => {
      alive = false;
    };
  }, []);
  if (!terrain) return null;
  const n = Math.ceil((terrain.heights.length - 1) / CHUNK);
  return (
    <group>
      {Array.from({ length: n }, (_, i) => (
        <Chunk key={i} index={i} tex={tex} />
      ))}
    </group>
  );
}
