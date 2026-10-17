// 로비가 살아 있는 느낌 (docs/DENSITY_1017.md §3): 마을 그림(lobby.jpg)을 캔버스에 깔고 · 파티·가진 영웅 도트가 광장을 걸어 다니고 · 가끔 말풍선 · 반짝이
import { CONFIG } from '../config';
import { artOf, heroOf } from '../data/heroes';
import { partyIds, S } from '../game/state';
import { animOf, drawFrame, frameAt, heightOf } from '../sprite/sheet';
import { canvasFont, T } from '../theme/tokens';
import { view } from './view';

const L = CONFIG.ui.lobbyLife;
const B = T.battle;
interface Walker { id: string; x: number; y: number; to: number; at: number; wait: number; face: number; say: string; sayT: number }
let img: HTMLImageElement | null = null;
let walkers: Walker[] = [];
let sparks: { x: number; y: number; t: number; dur: number }[] = [];

/** 로비에 들어올 때: 걸어 다닐 영웅 고르기 (파티 먼저 · 가진 영웅으로 채움) */
export function lobbyLifeStart() {
  if (!img) {
    img = new Image();
    img.src = `${import.meta.env.BASE_URL}art/screens/lobby.jpg`;
  }
  const owned = [...new Set([...partyIds(), ...Object.keys(S.heroes)])].slice(0, L.walkers);
  walkers = owned.map((id, i) => {
    const x = view.w * (L.xMin + ((L.xMax - L.xMin) * (i + 0.5)) / owned.length);
    return { id, x, y: L.y + (i % 2) * L.yStep, to: x, at: Math.random() * 2, wait: 1 + Math.random() * 3, face: i % 2 ? -1 : 1, say: '', sayT: 0 };
  });
  sparks = [];
}
/** 매 프레임: 마을 그림 → 반짝이 → 걷는 영웅 → 말풍선 */
export function lobbyLifeTick(dt: number) {
  const ctx = view.ctx;
  const W = view.w;
  const H = view.h;
  if (img?.complete && img.naturalWidth) {
    const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    ctx.drawImage(img, (W - img.naturalWidth * k) / 2, (H - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
  }
  // 반짝이 (분수·창가 근처)
  if (Math.random() < dt * L.sparkPerSec) sparks.push({ x: W * (0.3 + Math.random() * 0.45), y: H * (0.25 + Math.random() * 0.45), t: 0, dur: 0.9 + Math.random() * 0.6 });
  for (const p of sparks) {
    p.t += dt;
    const a = Math.sin((p.t / p.dur) * Math.PI);
    const r = 2 + a * 4;
    ctx.fillStyle = `${B.flash}${0.85 * a})`;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - r * 2);
    ctx.lineTo(p.x + r * 0.5, p.y);
    ctx.lineTo(p.x, p.y + r * 2);
    ctx.lineTo(p.x - r * 0.5, p.y);
    ctx.closePath();
    ctx.fill();
  }
  sparks = sparks.filter((p) => p.t < p.dur);
  const sheet = view.art?.sheet;
  if (!sheet) return;
  for (const w of [...walkers].sort((a, b) => a.y - b.y)) {
    w.at += dt;
    const moving = Math.abs(w.to - w.x) > 2;
    if (moving) {
      const step = Math.sign(w.to - w.x) * Math.min(Math.abs(w.to - w.x), L.speed * dt);
      w.x += step;
      w.face = step > 0 ? 1 : -1;
    } else if ((w.wait -= dt) <= 0) {
      w.to = W * (L.xMin + Math.random() * (L.xMax - L.xMin));
      w.wait = 2 + Math.random() * 4;
      if (Math.random() < L.sayChance) {
        const h = heroOf(w.id);
        w.say = h.voice?.[Math.floor(Math.random() * h.voice.length)] ?? `${h.title}…`;
        w.sayT = L.sayDur;
      }
    }
    const art = artOf(heroOf(w.id));
    const { def } = animOf(art.anims, moving ? 'walk' : 'idle');
    const ref = art.anims.idle!.frames[0];
    if (!sheet.img[ref]) continue;
    const k = (art.h / heightOf(sheet, ref)) * L.scale;
    ctx.fillStyle = B.shadow;
    ctx.beginPath();
    ctx.ellipse(w.x, w.y + 2, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    drawFrame(ctx, sheet, def.frames[frameAt(def, w.at)], w.x, w.y, k, w.face);
    if (w.sayT > 0) {
      w.sayT -= dt;
      ctx.font = canvasFont(T.font.canvas.tag + 1, 'bold', false);
      ctx.textAlign = 'center';
      const tw = Math.min(180, ctx.measureText(w.say).width) + 12;
      const by = w.y - art.h * L.scale - 14;
      ctx.globalAlpha = Math.min(1, w.sayT * 3);
      ctx.fillStyle = B.sayBg;
      ctx.fillRect(w.x - tw / 2, by - 14, tw, 18);
      ctx.fillStyle = B.sayText;
      ctx.fillText(w.say, w.x, by, 180);
      ctx.globalAlpha = 1;
    }
  }
}
