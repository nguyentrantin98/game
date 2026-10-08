import { cloneState, applyFire, getPlayer, type BattleState, type Dir, type FireInput } from './battle';
import { RAGE_MAX } from './constants';

/**
 * AI đơn giản: quét góc/lực, mô phỏng bằng chính luật chơi, chọn phát gần mục tiêu nhất,
 * sau đó cộng sai số theo độ khó (skill 0..1).
 */
export function chooseBotShot(state: BattleState, botId: string, skill = 0.6, rand = Math.random): FireInput {
  const bot = getPlayer(state, botId);
  const enemies = state.players.filter((p) => p.alive && p.team !== bot.team);
  if (!enemies.length) return { angle: 45, power: 50, dir: bot.facing, mode: 'normal' };
  const target = enemies.reduce((a, b) => (Math.abs(b.x - bot.x) < Math.abs(a.x - bot.x) ? b : a));
  const dir: Dir = target.x >= bot.x ? 1 : -1;
  let best: FireInput = { angle: 45, power: 60, dir, mode: 'normal' };
  let bestD = Infinity;
  for (let angle = 20; angle <= 80; angle += 6) {
    for (let power = 20; power <= 100; power += 4) {
      const copy = cloneState(state);
      const res = applyFire(copy, botId, { angle, power, dir, mode: 'normal' });
      const imp = res.impacts.find((i) => i.kind === 'explode');
      if (!imp) continue;
      const d = Math.hypot(imp.x - target.x, imp.y - target.y);
      if (d < bestD) {
        bestD = d;
        best = { angle, power, dir, mode: 'normal' };
      }
    }
  }
  const noise = (1 - skill) * 8;
  best.angle = Math.round(best.angle + (rand() * 2 - 1) * noise);
  best.power = Math.round(best.power + (rand() * 2 - 1) * noise);
  if (bot.rage >= RAGE_MAX && rand() < 0.6) best.mode = 'ult';
  else if (rand() < 0.3) best.mode = 'heavy';
  if (bot.hp < bot.maxHp * 0.4 && bot.items.heal > 0) best.item = 'heal';
  return best;
}
