import { SKINS, TURN_SECONDS, Terrain, WS, type BattleEnd, type BattleState, type ShotResult, type TurnInfo } from '@army3d/shared';
import { sfx, vibrate } from '../audio/sfx';
import { useBattle } from '../store/battle';
import { useGame } from '../store/game';
import { api } from './api';
import { getSocket } from './socket';

let bound = false;

function startBattle(roomId: string, state: BattleState, turn: TurnInfo | null) {
  const myId = useGame.getState().profile?.id ?? null;
  const me = state.players.find((p) => p.id === myId);
  useBattle.getState().reset();
  useBattle.setState({
    roomId,
    myId,
    state,
    terrain: new Terrain([...state.terrain]),
    terrainVersion: 1,
    turn,
    facing: me?.facing ?? 1,
  });
  useGame.getState().setScreen('battle');
}

/** Kết thúc replay một phát bắn: lấy kết quả authoritative của server làm chuẩn. */
export function finalizeShot(res: ShotResult) {
  const b = useBattle.getState();
  if (!b.state || b.replay?.result !== res) return;
  const terrain = b.terrain!;
  terrain.applyDiff(res.terrainDiff);
  const shooter = res.players.find((p) => p.id === res.shooterId)!;
  const enemyDmg = res.damages.filter((d) => {
    const t = res.players.find((p) => p.id === d.targetId);
    return t && t.team !== shooter.team && d.amount > 0;
  });
  const amount = enemyDmg.reduce((s, d) => s + d.amount, 0);
  const kind = enemyDmg.some((d) => d.crit) ? 'hit' : amount > 0 ? 'near' : 'miss';
  useBattle.setState({
    state: { ...b.state, players: res.players, terrain: terrain.heights, over: res.over, winnerTeam: res.winnerTeam },
    replay: null,
    terrainVersion: b.terrainVersion + 1,
    dirtyRange: null,
    hitLabel: res.input.item === 'teleport' ? null : { key: Date.now(), kind, amount },
  });
}

export function bindBattleSocket() {
  if (bound) return;
  bound = true;
  const s = getSocket();

  s.on(WS.queueWaiting, () => useBattle.setState({ searching: true }));
  s.on(WS.battleStart, (m: { roomId: string; state: BattleState }) => startBattle(m.roomId, m.state, null));
  s.on(WS.battleResume, (m: { roomId: string; state: BattleState; turn: TurnInfo }) =>
    startBattle(m.roomId, m.state, m.turn),
  );

  s.on(WS.battleTurn, (t: TurnInfo) => {
    const b = useBattle.getState();
    if (!b.state) return;
    const players = b.state.players.map((p) => (p.id === t.currentId ? { ...p, moved: 0 } : p));
    const mine = t.currentId === b.myId;
    const me = players.find((p) => p.id === b.myId);
    useBattle.setState({
      // deadline theo đồng hồ máy khách (tránh lệch giờ với server)
      turn: { ...t, deadline: Date.now() + TURN_SECONDS * 1000 },
      state: { ...b.state, currentId: t.currentId, wind: t.wind, turn: t.turn, players },
      moveMode: false,
      item: null,
      shotMode: 'normal',
      facing: mine && me ? me.facing : b.facing,
    });
    if (mine) {
      sfx('turn');
      vibrate(40);
    }
  });

  s.on(WS.battleShot, (res: ShotResult) => {
    useBattle.setState({ replay: { result: res, t0: performance.now() }, hitLabel: null });
    sfx('fire');
    // dự phòng: nếu scene không chạy (tab ẩn) vẫn chốt kết quả
    setTimeout(() => finalizeShot(res), (res.durationSteps / 60) * 1000 + 2500);
  });

  s.on(WS.battleMoved, (m: { id: string; x: number; y: number; facing: 1 | -1; moved: number }) => {
    const b = useBattle.getState();
    if (!b.state) return;
    useBattle.setState({
      state: {
        ...b.state,
        players: b.state.players.map((p) =>
          p.id === m.id ? { ...p, x: m.x, y: m.y, facing: m.facing, moved: m.moved } : p,
        ),
      },
    });
  });

  s.on(WS.battleEnd, (end: BattleEnd) => {
    useBattle.setState({ end });
    const mine = end.rewards[useBattle.getState().myId ?? ''];
    setTimeout(() => {
      sfx(mine?.win ? 'win' : 'lose');
      useGame.getState().setScreen('result');
      api
        .me()
        .then((p) => useGame.getState().setProfile(p))
        .catch(() => {});
    }, 1800);
  });
}

export function joinQueue() {
  const g = useGame.getState();
  const skinId = g.skinOn ? skinForChar(g.charId) : null;
  useBattle.setState({ searching: g.mode === 'ranked' });
  getSocket().emit(WS.queueJoin, { mode: g.mode, charId: g.charId, skinId });
}

export function leaveQueue() {
  useBattle.setState({ searching: false });
  getSocket().emit(WS.queueLeave);
}

export function fire(power?: number) {
  const b = useBattle.getState();
  if (!b.state || b.replay || b.turn?.currentId !== b.myId) return;
  getSocket().emit(WS.battleFire, {
    angle: b.angle,
    power: power ?? b.power,
    dir: b.facing,
    mode: b.shotMode,
    item: b.item,
  });
  useBattle.setState({ moveMode: false });
}

export function move(dx: number) {
  getSocket().emit(WS.battleMove, { dx });
}

export function leaveBattle() {
  getSocket().emit(WS.battleLeave);
}

export function skinForChar(charId: string) {
  return SKINS.find((s) => s.base === charId)?.id ?? null;
}
