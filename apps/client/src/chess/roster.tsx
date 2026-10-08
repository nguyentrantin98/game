import { useState } from 'react';
import type { Chess } from '@army3d/shared';

// Đội hình thần thoại Trung Hoa: Đỏ = Thiên Đình, Đen = Yêu Giới (Tây Du Ký / Phong Thần).
// Chân dung vẽ bằng SVG (không cần tải ảnh). Muốn thay bằng texture vẽ tay có bản quyền:
// đặt file PNG vuông vào `public/textures/pieces/<id>.png`, quân cờ sẽ tự dùng ảnh đó.

type Head = 'mian' | 'helmet' | 'horns' | 'monkey' | 'phoenix' | 'taoist' | 'flame' | 'bun' | 'skull' | 'pagoda' | 'drum';

export interface Hero {
  id: string;
  name: string;
  han: string;
  /** chữ trên mặt quân */
  glyph: string;
  skin: string;
  robe: string;
  trim: string;
  head: Head;
  beard?: string;
  thirdEye?: boolean;
  paint?: string; // vẽ mặt kiểu Kinh kịch
}

const H = (h: Hero) => h;

/** Thiên Đình (bên Đỏ) */
const HEAVEN: Record<string, Hero> = {
  k: H({ id: 'ngoc-hoang', name: 'Ngọc Hoàng', han: '玉皇大帝', glyph: '帥', skin: '#f3d2ae', robe: '#d9a21b', trim: '#fff1b0', head: 'mian', beard: '#2b1d16' }),
  a: H({ id: 'thai-bach', name: 'Thái Bạch Kim Tinh', han: '太白金星', glyph: '仕', skin: '#f1d6b8', robe: '#e9e2cf', trim: '#d9a84a', head: 'taoist', beard: '#f5f5f0' }),
  e: H({ id: 'thac-thap', name: 'Thác Tháp Thiên Vương', han: '托塔天王', glyph: '相', skin: '#e9c49c', robe: '#b23a2a', trim: '#f2c14e', head: 'pagoda', beard: '#1d1410' }),
  h: H({ id: 'nhi-lang', name: 'Nhị Lang Thần', han: '二郎神', glyph: '傌', skin: '#f2d4b4', robe: '#3c6fb5', trim: '#d8e6ff', head: 'helmet', thirdEye: true }),
  r: H({ id: 'na-tra', name: 'Na Tra', han: '哪吒', glyph: '俥', skin: '#fbe0c8', robe: '#e2412f', trim: '#ffd25e', head: 'bun' }),
  c: H({ id: 'loi-cong', name: 'Lôi Công', han: '雷公', glyph: '炮', skin: '#5c7fa8', robe: '#2c3e70', trim: '#9fd8ff', head: 'drum', paint: '#cfe8ff' }),
  p: H({ id: 'thien-binh', name: 'Thiên Binh', han: '天兵', glyph: '兵', skin: '#efcfae', robe: '#c0392b', trim: '#e8c66a', head: 'helmet' }),
  // Cờ Vua
  q: H({ id: 'hang-nga', name: 'Hằng Nga', han: '嫦娥', glyph: '后', skin: '#fde6d4', robe: '#f3e9ff', trim: '#b9a3ff', head: 'phoenix' }),
  b: H({ id: 'thai-thuong', name: 'Thái Thượng Lão Quân', han: '太上老君', glyph: '象', skin: '#f1d9be', robe: '#7a5bb5', trim: '#f2e3a0', head: 'taoist', beard: '#ffffff' }),
  n: H({ id: 'nhi-lang', name: 'Nhị Lang Thần', han: '二郎神', glyph: '马', skin: '#f2d4b4', robe: '#3c6fb5', trim: '#d8e6ff', head: 'helmet', thirdEye: true }),
};

/** Yêu Giới (bên Đen) */
const DEMON: Record<string, Hero> = {
  k: H({ id: 'nguu-ma', name: 'Ngưu Ma Vương', han: '牛魔王', glyph: '將', skin: '#5b3a2a', robe: '#2b2b2b', trim: '#c8462c', head: 'horns', beard: '#111', paint: '#e8d2b0' }),
  a: H({ id: 'thiet-phien', name: 'Thiết Phiến Công Chúa', han: '铁扇公主', glyph: '士', skin: '#f6d9c6', robe: '#2f6b4f', trim: '#e4c06a', head: 'phoenix' }),
  e: H({ id: 'kim-giac', name: 'Kim Giác Đại Vương', han: '金角大王', glyph: '象', skin: '#7d9c5a', robe: '#3a2f55', trim: '#f2c14e', head: 'horns', paint: '#f2c14e' }),
  h: H({ id: 'bach-long', name: 'Bạch Long Mã', han: '白龙马', glyph: '馬', skin: '#e8f2f5', robe: '#2a4a5a', trim: '#9fe0ff', head: 'horns' }),
  r: H({ id: 'ton-ngo-khong', name: 'Tôn Ngộ Không', han: '孙悟空', glyph: '車', skin: '#c98a4b', robe: '#3b2a1c', trim: '#f2c14e', head: 'monkey', paint: '#f7d9b0' }),
  c: H({ id: 'hong-hai-nhi', name: 'Hồng Hài Nhi', han: '红孩儿', glyph: '砲', skin: '#f4c2a2', robe: '#3a1f1f', trim: '#ff7a2f', head: 'flame' }),
  p: H({ id: 'tieu-yeu', name: 'Tiểu Yêu', han: '小妖', glyph: '卒', skin: '#8aa36a', robe: '#3a3a3a', trim: '#a8a8a8', head: 'horns' }),
  q: H({ id: 'bach-cot', name: 'Bạch Cốt Tinh', han: '白骨精', glyph: '后', skin: '#f2f0ea', robe: '#3b3350', trim: '#c9c3ff', head: 'skull' }),
  b: H({ id: 'hac-hung', name: 'Hắc Hùng Tinh', han: '黑熊精', glyph: '象', skin: '#2e2622', robe: '#1d1d1d', trim: '#b88a4a', head: 'horns', paint: '#6b5546' }),
  n: H({ id: 'bach-long', name: 'Bạch Long Mã', han: '白龙马', glyph: '马', skin: '#e8f2f5', robe: '#2a4a5a', trim: '#9fe0ff', head: 'horns' }),
};

export function heroFor(variant: Chess.VariantId, side: Chess.Side, kind: string): Hero {
  const h = (side === 'r' ? HEAVEN : DEMON)[kind];
  if (variant !== 'chess') return h;
  // chữ Hán quốc tế cho cờ vua
  const glyph: Record<string, string> = { k: '王', q: '后', r: '车', b: '象', n: '马', p: '兵' };
  return { ...h, glyph: glyph[kind] ?? h.glyph };
}

export const ALL_HEROES = (side: Chess.Side) => Object.values(side === 'r' ? HEAVEN : DEMON);

function Headgear({ h }: { h: Hero }) {
  const t = h.trim;
  switch (h.head) {
    case 'mian': // mũ miện có tua ngọc của Ngọc Hoàng
      return (
        <g>
          <rect x="22" y="14" width="56" height="7" rx="2" fill="#1b1b1b" stroke={t} strokeWidth="1.5" />
          <rect x="34" y="20" width="32" height="10" fill={h.robe} stroke={t} />
          {[26, 32, 38, 62, 68, 74].map((x) => (
            <line key={x} x1={x} y1="21" x2={x} y2="34" stroke={t} strokeDasharray="2 2" strokeWidth="1.5" />
          ))}
        </g>
      );
    case 'helmet':
      return (
        <g>
          <path d="M28 40 Q50 6 72 40 Z" fill={h.robe} stroke={t} strokeWidth="2" />
          <path d="M50 8 L46 20 L54 20 Z" fill="#e2412f" />
          <path d="M26 40 h48" stroke={t} strokeWidth="3" />
        </g>
      );
    case 'horns':
      return (
        <g fill={h.paint ?? '#e9dcc2'} stroke="#2a1c12" strokeWidth="1.5">
          <path d="M32 34 Q14 26 18 8 Q26 22 38 26 Z" />
          <path d="M68 34 Q86 26 82 8 Q74 22 62 26 Z" />
        </g>
      );
    case 'monkey': // vòng kim cô + lông tơ
      return (
        <g>
          <ellipse cx="50" cy="46" rx="22" ry="25" fill="none" stroke={h.skin} strokeWidth="6" strokeDasharray="3 2" />
          <path d="M26 34 Q50 24 74 34" stroke="#f2c14e" strokeWidth="4" fill="none" />
          <circle cx="50" cy="29" r="3" fill="#e2412f" />
          <path d="M40 22 Q30 6 20 14 M60 22 Q70 6 80 14" stroke="#f2c14e" strokeWidth="1.5" fill="none" />
        </g>
      );
    case 'phoenix': // mũ phượng
      return (
        <g>
          <path d="M30 34 Q50 4 70 34 Z" fill="#1d1d1d" />
          <path d="M50 10 Q60 2 68 12 Q58 10 52 18 Z" fill={t} />
          <circle cx="50" cy="22" r="4" fill="#e2412f" stroke={t} />
          <path d="M30 30 l-6 14 M70 30 l6 14" stroke={t} strokeWidth="1.5" />
        </g>
      );
    case 'taoist':
      return (
        <g>
          <ellipse cx="50" cy="20" rx="10" ry="9" fill="#e8e8e8" />
          <rect x="44" y="12" width="12" height="5" fill={t} />
        </g>
      );
    case 'pagoda': // tháp Linh Lung trên đầu
      return (
        <g fill={t} stroke="#6b4a10">
          <rect x="44" y="4" width="12" height="6" />
          <rect x="40" y="10" width="20" height="6" />
          <rect x="36" y="16" width="28" height="8" />
          <path d="M50 0 v4" stroke={t} strokeWidth="2" />
        </g>
      );
    case 'flame':
      return (
        <path d="M30 34 Q28 14 40 18 Q38 4 50 10 Q56 0 62 14 Q74 10 70 34 Z" fill="#ff7a2f" stroke="#ffd25e" strokeWidth="1.5" />
      );
    case 'bun': // hai búi tóc Na Tra + vòng Càn Khôn
      return (
        <g>
          <circle cx="34" cy="20" r="8" fill="#1b1b1b" />
          <circle cx="66" cy="20" r="8" fill="#1b1b1b" />
          <circle cx="34" cy="20" r="9" fill="none" stroke={t} strokeWidth="2" />
          <circle cx="66" cy="20" r="9" fill="none" stroke={t} strokeWidth="2" />
        </g>
      );
    case 'skull':
      return (
        <g fill="#f2f0ea" stroke="#8a84a8">
          {[30, 40, 50, 60, 70].map((x) => (
            <circle key={x} cx={x} cy={22 - Math.abs(50 - x) / 5} r="5" />
          ))}
        </g>
      );
    case 'drum': // vòng trống sấm sét
      return (
        <g>
          <path d="M14 46 A36 36 0 0 1 86 46" fill="none" stroke={t} strokeWidth="3" />
          {[18, 30, 50, 70, 82].map((x, i) => (
            <circle key={x} cx={x} cy={[38, 22, 14, 22, 38][i]} r="5" fill="#f2c14e" stroke="#6b4a10" />
          ))}
        </g>
      );
  }
}

/** Chân dung nhân vật (viewBox 100×100). */
export function Portrait({ h }: { h: Hero }) {
  const [img, setImg] = useState(true);
  const src = `/textures/pieces/${h.id}.png`;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {/* áo + cổ áo */}
      <path d="M14 100 Q20 70 50 66 Q80 70 86 100 Z" fill={h.robe} stroke={h.trim} strokeWidth="2" />
      <path d="M38 68 L50 84 L62 68" fill="none" stroke={h.trim} strokeWidth="3" />
      {/* mặt */}
      <ellipse cx="50" cy="46" rx="18" ry="21" fill={h.skin} stroke="#2a1c12" strokeWidth="1.2" />
      {h.paint && <path d="M36 44 Q50 72 64 44 Q50 54 36 44" fill={h.paint} opacity="0.85" />}
      <path d="M38 40 l8 2 M62 40 l-8 2" stroke="#1b1b1b" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="43" cy="46" rx="2.2" ry="2.6" fill="#1b1b1b" />
      <ellipse cx="57" cy="46" rx="2.2" ry="2.6" fill="#1b1b1b" />
      {h.thirdEye && <ellipse cx="50" cy="34" rx="1.6" ry="3.4" fill="#e2412f" stroke="#1b1b1b" strokeWidth="0.6" />}
      <path d="M46 58 Q50 60 54 58" stroke="#8a2a1a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {h.beard && <path d="M40 58 Q50 84 60 58 Q55 64 50 63 Q45 64 40 58" fill={h.beard} />}
      <Headgear h={h} />
      {img && <image href={src} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" onError={() => setImg(false)} />}
    </svg>
  );
}

/** Mặt quân cờ: đĩa gỗ sơn mài + chân dung + chữ Hán. */
export function PieceToken({
  variant,
  piece,
  size,
  selected,
}: {
  variant: Chess.VariantId;
  piece: Chess.Piece;
  size: number;
  selected?: boolean;
}) {
  const red = piece.side === 'r';
  if (piece.kind === 'stone')
    return (
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: red
            ? 'radial-gradient(circle at 35% 30%, #fff 0%, #ffd9a0 30%, #c0392b 75%, #6a120a 100%)'
            : 'radial-gradient(circle at 35% 30%, #8aa 0%, #2a3a44 45%, #05080a 100%)',
          boxShadow: '0 2px 4px rgba(0,0,0,.6)',
        }}
      />
    );
  const ring = red ? '#e2412f' : '#2a2a2a';
  if (piece.hidden)
    return (
      <div className="piece hidden-piece" style={{ width: size, height: size, ['--ring' as string]: ring }}>
        <span style={{ fontSize: size * 0.42 }}>{red ? '天' : '妖'}</span>
      </div>
    );
  const h = heroFor(variant, piece.side, piece.kind);
  return (
    <div
      className={`piece ${selected ? 'selected' : ''}`}
      style={{ width: size, height: size, ['--ring' as string]: ring }}
      title={`${h.name} · ${h.han}`}
    >
      <div className="portrait">
        <Portrait h={h} />
      </div>
      <span className="glyph" style={{ fontSize: size * 0.26, color: red ? '#b51d10' : '#111' }}>
        {h.glyph}
      </span>
    </div>
  );
}
