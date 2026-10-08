import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  MUZZLE_OFFSET,
  getCharacter,
  getSkin,
  predictPath,
  type PlayerState,
  type ShotResult,
} from '@army3d/shared';
import { sfx, vibrate } from '../audio/sfx';
import { finalizeShot } from '../net/battleController';
import { pushFloater, useBattle } from '../store/battle';
import { Backdrop } from './Backdrop';
import { CharacterModel } from './CharacterModel';
import { TerrainMesh } from './TerrainMesh';
import { vfx, VfxLayer } from './Vfx';

/** Thời điểm trúng đòn gần nhất của mỗi nhân vật (để rung model). */
const hitTimes: Record<string, number> = {};
/** Mục tiêu camera do ReplayDriver ghi (đạn đang bay). */
const camFocus = { active: false, x: 0, y: 0 };

function Fighter({ p }: { p: PlayerState }) {
  const isCurrent = useBattle((s) => s.state?.currentId === p.id && !s.replay);
  const myId = useBattle((s) => s.myId);
  const angle = useBattle((s) => (p.id === s.myId ? s.angle : 40));
  const facing = useBattle((s) => (p.id === s.myId && s.state?.currentId === s.myId ? s.facing : p.facing));
  const def = getCharacter(p.charId);
  const skin = getSkin(p.skinId);
  const pos = useRef(new THREE.Vector3(p.x, p.y, 0));
  const group = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    // trượt mượt tới vị trí server (đi bộ / rơi / dịch chuyển)
    pos.current.lerp(new THREE.Vector3(p.x, p.alive ? p.y : Math.max(p.y, -4), 0), Math.min(1, dt * 7));
    group.current?.position.copy(pos.current);
  });

  const hpPct = Math.max(0, p.hp / p.maxHp);
  const teamColor = p.team === 0 ? '#5CC8E0' : '#E8684A';
  return (
    <group ref={group}>
      <CharacterModel
        def={def}
        skin={skin}
        angle={angle}
        facing={facing}
        alive={p.alive}
        team={p.team}
        current={isCurrent}
        hitAt={() => hitTimes[p.id] ?? 0}
      />
      {p.alive && (
        <Html position={[0, 2.55, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="flex flex-col items-center" style={{ width: 70 }}>
            <div
              className="text-[10px] font-semibold whitespace-nowrap"
              style={{ color: p.id === myId ? '#FFC86B' : '#E9EFE6', WebkitTextStroke: '2px #0b120e', paintOrder: 'stroke fill' }}
            >
              {p.name}
              {p.element ? ` · ${p.element}` : ''}
            </div>
            <div className="w-[56px] h-[6px] rounded-sm overflow-hidden" style={{ background: '#0b120e', border: '1px solid #0b120e' }}>
              <div style={{ width: `${hpPct * 100}%`, height: '100%', background: teamColor, transition: 'width .3s' }} />
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

const projGeo = new THREE.SphereGeometry(0.32, 10, 8);
const projMat = new THREE.MeshBasicMaterial({ color: '#FFF3D6', toneMapped: false });
const TRAIL = 24;

/** Phát lại kết quả server: đạn bay theo track, nổ đúng bước, hiện số sát thương. */
function ReplayDriver() {
  const meshes = useRef<THREE.Mesh[]>([]);
  const trails = useRef<THREE.Line[]>([]);
  const last = useRef<ShotResult | null>(null);
  const handledImpacts = useRef(new Set<number>());
  const handledDamage = useRef(new Set<number>());
  const group = useRef<THREE.Group>(null);

  const trailLines = useMemo(
    () =>
      Array.from({ length: 8 }, () => {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(TRAIL * 3), 3));
        const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#FFC86B', transparent: true, opacity: 0.7 }));
        line.frustumCulled = false;
        line.visible = false;
        return line;
      }),
    [],
  );
  trails.current = trailLines;

  useFrame(() => {
    const { replay } = useBattle.getState();
    const res = replay?.result ?? null;
    if (res !== last.current) {
      last.current = res;
      handledImpacts.current.clear();
      handledDamage.current.clear();
      if (res) {
        const sh = useBattle.getState().state?.players.find((p) => p.id === res.shooterId);
        if (sh) vfx.muzzle(sh.x + res.input.dir * MUZZLE_OFFSET.x, sh.y + MUZZLE_OFFSET.y, res.input.dir);
      }
    }
    camFocus.active = false;
    meshes.current.forEach((m) => m && (m.visible = false));
    trails.current.forEach((l) => l && (l.visible = false));
    if (!replay || !res) return;

    const step = ((performance.now() - replay.t0) / 1000) * 60;
    res.tracks.forEach((tr, k) => {
      const m = meshes.current[k];
      const line = trails.current[k];
      if (!m || !line) return;
      const n = tr.points.length / 2;
      const local = step - tr.startStep;
      if (local < 0 || local >= n - 1) return;
      const i = Math.floor(local);
      const f = local - i;
      const x = tr.points[i * 2] * (1 - f) + tr.points[i * 2 + 2] * f;
      const y = tr.points[i * 2 + 1] * (1 - f) + tr.points[i * 2 + 3] * f;
      m.position.set(x, y, 0.4);
      m.visible = true;
      const arr = (line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      for (let t = 0; t < TRAIL; t++) {
        const j = Math.max(0, i - (TRAIL - 1 - t) * 2);
        arr[t * 3] = tr.points[j * 2];
        arr[t * 3 + 1] = tr.points[j * 2 + 1];
        arr[t * 3 + 2] = 0.4;
      }
      arr[(TRAIL - 1) * 3] = x;
      arr[(TRAIL - 1) * 3 + 1] = y;
      line.geometry.attributes.position.needsUpdate = true;
      line.visible = true;
      if (!camFocus.active) {
        camFocus.active = true;
        camFocus.x = x;
        camFocus.y = y;
      }
    });

    res.impacts.forEach((imp, idx) => {
      if (step < imp.step || handledImpacts.current.has(idx)) return;
      handledImpacts.current.add(idx);
      const b = useBattle.getState();
      if (imp.kind === 'explode' || imp.kind === 'heal') {
        const carveR = imp.kind === 'heal' ? imp.radius * 0.35 : imp.radius;
        b.terrain?.carve(imp.x, imp.y, carveR);
        useBattle.setState({ terrainVersion: b.terrainVersion + 1 });
        if (imp.kind === 'heal') vfx.heal(imp.x, imp.y, imp.radius);
        else vfx.burst(imp.x, imp.y, imp.radius);
        sfx('boom');
        vibrate(imp.radius > 4 ? [30, 30, 60] : 50);
      } else if (imp.kind === 'chain') {
        vfx.bolt(imp.fromX ?? imp.x, imp.fromY ?? imp.y, imp.x, imp.y);
        sfx('hit');
      } else if (imp.kind === 'teleport') {
        vfx.sparkle(imp.x, imp.y);
      }
    });

    res.damages.forEach((d, idx) => {
      if (step < d.step || handledDamage.current.has(idx)) return;
      handledDamage.current.add(idx);
      const b = useBattle.getState();
      const st = b.state;
      if (!st) return;
      const target = st.players.find((p) => p.id === d.targetId);
      if (!target) return;
      if (d.amount > 0) hitTimes[d.targetId] = performance.now();
      pushFloater({
        x: target.x,
        y: target.y + 3.2,
        text: d.amount > 0 ? `-${d.amount}` : `+${-d.amount}`,
        color: d.amount < 0 ? '#7DFFB0' : d.crit ? '#FFC86B' : '#FF8A80',
        big: d.crit,
      });
      useBattle.setState({
        state: {
          ...st,
          players: st.players.map((p) =>
            p.id === d.targetId ? { ...p, hp: Math.max(0, Math.min(p.maxHp, p.hp - d.amount)) } : p,
          ),
        },
      });
    });

    if (step > res.durationSteps + 45) finalizeShot(res);
  });

  return (
    <group ref={group}>
      {trailLines.map((line, k) => (
        <group key={k}>
          <mesh ref={(m) => void (m && (meshes.current[k] = m))} geometry={projGeo} material={projMat} visible={false} />
          <primitive object={line} />
        </group>
      ))}
    </group>
  );
}

/** Quỹ đạo dự đoán — chỉ ở chế độ Luyện tập, lượt của mình. */
function PreviewPath() {
  const show = useBattle((s) => s.state?.mode === 'practice' && s.turn?.currentId === s.myId && !s.replay);
  const angle = useBattle((s) => s.angle);
  const power = useBattle((s) => s.power);
  const facing = useBattle((s) => s.facing);
  const wind = useBattle((s) => s.state?.wind);
  const ver = useBattle((s) => s.terrainVersion);
  const line = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const m = new THREE.LineDashedMaterial({ color: '#FFF3D6', dashSize: 0.6, gapSize: 0.5, transparent: true, opacity: 0.8 });
    return new THREE.Line(g, m);
  }, []);
  useEffect(() => {
    const b = useBattle.getState();
    if (!show || !b.state || !b.myId) return;
    const pts = predictPath(b.state, b.myId, { angle, power, dir: facing, mode: 'normal' });
    const v: number[] = [];
    for (let i = 0; i < pts.length; i += 6) v.push(pts[i], pts[i + 1], 0.4);
    line.geometry.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    line.computeLineDistances();
  }, [show, angle, power, facing, wind, ver, line]);
  return <primitive object={line} visible={show} />;
}

function Floaters() {
  const floaters = useBattle((s) => s.floaters);
  return (
    <>
      {floaters.map((f) => (
        <Html key={f.id} position={[f.x, f.y, 1]} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="float-dmg" style={{ color: f.color, fontSize: f.big ? 26 : 19, WebkitTextStroke: '3px #1a0e04', paintOrder: 'stroke fill' }}>
            {f.text}
            {f.big ? '!' : ''}
          </div>
        </Html>
      ))}
    </>
  );
}

/** Camera phối cảnh FOV 30°: tổng quan bản đồ lúc vào trận → bám đạn khi bay → zoom về người tới lượt. */
function CameraRig() {
  const { camera, size } = useThree();
  const startedAt = useRef(performance.now());
  const target = useRef(new THREE.Vector3(80, 18, 150));
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = 30;
    cam.near = 0.5;
    cam.far = 600;
    cam.position.set(80, 20, 170);
    cam.updateProjectionMatrix();
  }, [camera]);
  useFrame((_, dt) => {
    const b = useBattle.getState();
    const st = b.state;
    if (!st) return;
    const overview = performance.now() - startedAt.current < 2200;
    const aspect = size.width / size.height;
    const dist = 58 * Math.max(1, 2 / aspect);
    if (overview) {
      target.current.set(80, 18, 150 * Math.max(1, 2 / aspect));
    } else if (camFocus.active) {
      target.current.set(camFocus.x, camFocus.y + 2, dist + 8);
    } else {
      const cur = st.players.find((p) => p.id === (st.currentId ?? b.myId)) ?? st.players[0];
      target.current.set(cur.x + cur.facing * 8, cur.y + 6, dist);
    }
    target.current.x = THREE.MathUtils.clamp(target.current.x, 20, 140);
    camera.position.lerp(target.current, Math.min(1, dt * (camFocus.active ? 3.5 : 2.2)));
    const s = vfx.takeShake(dt);
    camera.position.x += (Math.random() - 0.5) * s;
    camera.position.y += (Math.random() - 0.5) * s;
    camera.lookAt(camera.position.x, camera.position.y - 4, 0);
  });
  return null;
}

export function BattleScene() {
  const players = useBattle((s) => s.state?.players);
  return (
    <>
      <color attach="background" args={['#2B4A5E']} />
      <fog attach="fog" args={['#3A4A3C', 90, 260]} />
      <hemisphereLight args={['#FFF3D6', '#2A3B2F', 1.1]} />
      <directionalLight position={[40, 60, 40]} intensity={1.6} color="#FFE2B0" />
      <Backdrop />
      <TerrainMesh />
      {players?.map((p) => <Fighter key={p.id} p={p} />)}
      <ReplayDriver />
      <PreviewPath />
      <Floaters />
      <VfxLayer />
      <CameraRig />
    </>
  );
}
