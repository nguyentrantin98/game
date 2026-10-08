import { Howl, Howler } from 'howler';

/**
 * Âm thanh tổng hợp bằng code (chưa có file audio): tạo WAV PCM trong bộ nhớ rồi nạp vào Howler.
 * Khi có asset thật chỉ cần đổi `src` sang file .webm/.mp3.
 */
const RATE = 22050;

function wav(samples: Float32Array): string {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + samples.length * 2, true);
  w(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 0x7fff, true));
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return 'data:audio/wav;base64,' + btoa(bin);
}

function synth(dur: number, fn: (t: number, i: number) => number) {
  const n = Math.floor(dur * RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / RATE, i);
  return wav(out);
}

const noise = () => Math.random() * 2 - 1;

const defs = {
  click: () => synth(0.08, (t) => Math.sin(2 * Math.PI * (900 - t * 4000) * t) * Math.exp(-t * 50) * 0.5),
  fire: () =>
    synth(0.35, (t) => (noise() * 0.6 + Math.sin(2 * Math.PI * 120 * t) * 0.6) * Math.exp(-t * 12) * 0.8),
  boom: () => {
    let lp = 0;
    return synth(0.9, (t) => {
      lp += (noise() - lp) * 0.08;
      return (lp * 2.2 + Math.sin(2 * Math.PI * (60 - t * 30) * t) * 0.6) * Math.exp(-t * 4.5);
    });
  },
  hit: () => synth(0.18, (t) => Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t * 20) * 0.6 + noise() * 0.1 * Math.exp(-t * 30)),
  coin: () => synth(0.25, (t) => Math.sin(2 * Math.PI * (t < 0.07 ? 988 : 1319) * t) * Math.exp(-t * 9) * 0.4),
  turn: () => synth(0.3, (t) => Math.sin(2 * Math.PI * (t < 0.12 ? 660 : 880) * t) * Math.exp(-t * 6) * 0.35),
  win: () =>
    synth(0.9, (t) => {
      const f = t < 0.2 ? 523 : t < 0.4 ? 659 : t < 0.6 ? 784 : 1047;
      return Math.sin(2 * Math.PI * f * t) * 0.35 * Math.exp(-((t % 0.2) * 3));
    }),
  roar: () => {
    let lp = 0;
    return synth(1.4, (t) => {
      lp += (noise() - lp) * 0.05;
      const f = 90 + Math.sin(t * 9) * 25 - t * 30;
      return (Math.sin(2 * Math.PI * f * t) * 0.5 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.25 + lp * 1.4) * Math.min(1, t * 8) * Math.exp(-t * 1.8);
    });
  },
  lose: () => synth(0.8, (t) => Math.sin(2 * Math.PI * (330 - t * 160) * t) * 0.35 * Math.exp(-t * 2)),
};

export type SfxName = keyof typeof defs;
const cache = new Map<SfxName, Howl>();
let sfxVolume = 0.8;
let vibrateOn = true;

export function setSfxVolume(v: number) {
  sfxVolume = v;
}
export function setVibrate(v: boolean) {
  vibrateOn = v;
}
export function setMasterMute(m: boolean) {
  Howler.mute(m);
}

export function sfx(name: SfxName) {
  if (sfxVolume <= 0) return;
  try {
    let h = cache.get(name);
    if (!h) {
      h = new Howl({ src: [defs[name]()], format: ['wav'] });
      cache.set(name, h);
    }
    h.volume(sfxVolume);
    h.play();
  } catch {
    /* audio chưa được mở khóa trên iOS — bỏ qua */
  }
}

export function vibrate(ms: number | number[]) {
  if (vibrateOn && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {}
  }
}
