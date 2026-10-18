// 메뉴·보상 효과음 · 팡파르 (「체크인」 public/audio/sfx/*.wav · jingle/J1~J8.mp3 재활용)
//  같은 소리 60ms 안 겹침 · 처음 터치 뒤 짧은 소리만 미리 받기 · 팡파르는 배경음악을 잠깐 줄임
import { ctx, duck, onUnlock, sfxBus } from './engine';

const BASE = `${import.meta.env.BASE_URL}audio/`;
export type Ui = 'tap' | 'open' | 'close' | 'coin' | 'item' | 'rare' | 'mission' | 'event' | 'heart' | 'fail' | 'build' | 'place_bad' | 'night';
/** 팡파르: 승리 J1 · 패배 J2 · 강화/별 성공 J3 · 전설 J4 · 기록 J5 · 장 클리어 J6 · 영입 J7 · 레벨업 J8 */
export type Jingle = 'win' | 'lose' | 'up' | 'legend' | 'record' | 'chapter' | 'recruit' | 'levelup';
const J: Record<Jingle, [string, number]> = { win: ['J1', 2.4], lose: ['J2', 2.6], up: ['J3', 2], legend: ['J4', 2.6], record: ['J5', 1.5], chapter: ['J6', 3], recruit: ['J7', 2.6], levelup: ['J8', 1.2] };
const PRE: Ui[] = ['tap', 'open', 'close', 'coin', 'item', 'rare', 'mission'];

const buf: Record<string, AudioBuffer | null | undefined> = {};
async function load(path: string) {
  if (buf[path] !== undefined) return buf[path] ?? null;
  buf[path] = null;
  try {
    const r = await fetch(BASE + path);
    buf[path] = await ctx!.decodeAudioData(await r.arrayBuffer());
  } catch {
    buf[path] = null;
  }
  return buf[path] ?? null;
}
onUnlock(() => PRE.forEach((n) => void load(`sfx/${n}.wav`)));
const lastAt: Record<string, number> = {};
function playPath(path: string, vol: number) {
  if (!ctx || ctx.state !== 'running') return;
  const now = performance.now();
  if (now - (lastAt[path] ?? 0) < 60) return;
  lastAt[path] = now;
  void load(path).then((b) => {
    if (!b || !ctx) return;
    const s = ctx.createBufferSource();
    s.buffer = b;
    const g = ctx.createGain();
    g.gain.value = vol;
    s.connect(g).connect(sfxBus);
    s.start();
  });
}
/** 메뉴·보상 효과음 */
export const sfx = (n: Ui, vol = 0.8) => playPath(`sfx/${n}.wav`, vol);
/** 팡파르 (배경음악을 그동안 줄임) */
export function jingle(n: Jingle, vol = 0.9) {
  const [f, d] = J[n];
  duck(d);
  playPath(`jingle/${f}.mp3`, vol);
}
