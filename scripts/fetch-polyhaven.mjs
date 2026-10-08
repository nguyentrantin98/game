// Tải texture địa hình CC0 từ Poly Haven về apps/client/public/textures.
// Chạy: pnpm textures   (cần Node 18+ có fetch)
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../apps/client/public/textures');
const RES = process.argv[2] ?? '1k';
// mỗi vai trò thử lần lượt các asset, lấy cái đầu tiên tải được
const ROLES = {
  grass: ['aerial_grass_rock', 'forrest_ground_01', 'leafy_grass'],
  rock: ['rocky_terrain_02', 'rock_boulder_dry', 'brown_mud_leaves_01'],
};
const MAPS = { diff: 'Diffuse', nor: 'nor_gl', rough: 'Rough' };

async function json(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'army3d-texture-fetch' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

await mkdir(OUT, { recursive: true });
for (const [role, slugs] of Object.entries(ROLES)) {
  let ok = false;
  for (const slug of slugs) {
    try {
      const files = await json(`https://api.polyhaven.com/files/${slug}`);
      for (const [key, map] of Object.entries(MAPS)) {
        const f = files[map]?.[RES]?.jpg ?? files[map]?.[RES]?.png;
        if (!f) throw new Error(`thiếu ${map} ${RES}`);
        const r = await fetch(f.url);
        if (!r.ok) throw new Error(`${r.status} ${f.url}`);
        await writeFile(join(OUT, `${role}_${key}.jpg`), Buffer.from(await r.arrayBuffer()));
      }
      console.log(`✓ ${role}: ${slug} (${RES}) — https://polyhaven.com/a/${slug}`);
      ok = true;
      break;
    } catch (e) {
      console.warn(`  ${role}: bỏ qua ${slug} (${e.message})`);
    }
  }
  if (!ok) process.exitCode = 1;
}
