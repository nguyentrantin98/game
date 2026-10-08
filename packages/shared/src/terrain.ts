import { TERRAIN_STEP, WORLD_WIDTH } from './constants';
import { Rng, round2 } from './rng';

/** Ô địa hình bị đổi sau vụ nổ: [chỉ số mẫu, độ cao mới]. */
export type TerrainDiff = [number, number][];

/** Heightmap 2D — client đùn thành khối 3D. Độ cao ≤ 0 nghĩa là vực (không có đất). */
export class Terrain {
  constructor(
    public heights: number[],
    public step = TERRAIN_STEP,
  ) {}

  get width() {
    return (this.heights.length - 1) * this.step;
  }

  heightAt(x: number): number {
    if (x < 0 || x > this.width) return -Infinity;
    const f = x / this.step;
    const i = Math.min(Math.floor(f), this.heights.length - 2);
    const t = f - i;
    return this.heights[i] * (1 - t) + this.heights[i + 1] * t;
  }

  /** Có đất tại x hay không (không phải vực / ngoài bản đồ). */
  solidAt(x: number): boolean {
    return this.heightAt(x) > 0.05;
  }

  /** Khoét hố tròn tâm (cx, cy) bán kính r. Trả về danh sách mẫu đã đổi. */
  carve(cx: number, cy: number, r: number): TerrainDiff {
    const diff: TerrainDiff = [];
    const i0 = Math.max(0, Math.ceil((cx - r) / this.step));
    const i1 = Math.min(this.heights.length - 1, Math.floor((cx + r) / this.step));
    for (let i = i0; i <= i1; i++) {
      const dx = i * this.step - cx;
      const dy = Math.sqrt(Math.max(0, r * r - dx * dx));
      const bottom = Math.max(0, cy - dy);
      if (this.heights[i] > bottom && this.heights[i] <= cy + dy + r * 0.5) {
        this.heights[i] = round2(bottom);
        diff.push([i, this.heights[i]]);
      }
    }
    return diff;
  }

  applyDiff(diff: TerrainDiff) {
    for (const [i, h] of diff) this.heights[i] = h;
  }
}

/** Sinh bản đồ đồi núi từ seed. Hai đầu bản đồ là bệ đứng, giữa có thung lũng. */
export function generateTerrain(seed: number): number[] {
  const rng = new Rng(seed ^ 0x9e3779b9);
  const n = Math.round(WORLD_WIDTH / TERRAIN_STEP) + 1;
  const waves = Array.from({ length: 4 }, (_, k) => ({
    amp: rng.range(2, 6) / (k + 1),
    freq: rng.range(0.02, 0.05) * (k + 1),
    phase: rng.range(0, Math.PI * 2),
  }));
  const heights: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = i * TERRAIN_STEP;
    let h = 18;
    for (const w of waves) h += w.amp * Math.sin(x * w.freq + w.phase);
    // thung lũng ở giữa cho trận thêm chiến thuật
    h -= 6 * Math.exp(-(((x - WORLD_WIDTH / 2) / 18) ** 2));
    // mép bản đồ thoải dần xuống vực
    const edge = Math.min(x, WORLD_WIDTH - x);
    if (edge < 6) h *= edge / 6;
    heights.push(round2(Math.max(0, h)));
  }
  return heights;
}
