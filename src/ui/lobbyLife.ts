// 로비 마을 (docs/UI_KIT_1018.md §6 · target_1018/lobby.jpg): 쿼터뷰 마을 그림(ui/bg/lobby_town.jpg)을 캔버스에 cover로 깔고
//  영웅 2~3명이 광장 길 위를 천천히 걷는다(전투 도트 걷기 · 대기 칸 키 64) · 6~10초마다 한 명이 말풍선(dialog 9-slice · 9px 갈색) 2.5초
//  좌표는 마을 그림 기준 논리 px(844×390) → town()으로 화면 좌표 (창이 더 넓으면 그림이 커지고 위아래가 잘림)
import { artOf, heroOf } from '../data/heroes';
import { lobbyLine } from '../data/lobbyLines';
import { partyIds, S } from '../game/state';
import { animOf, drawFrame, frameAt, heightOf } from '../sprite/sheet';
import { k9 } from './kit';
import { shadowSprite } from '../battle/render';
import { view } from './view';

const TOWN = `${import.meta.env.BASE_URL}art/ui/bg/lobby_town.jpg`;
/** 걸을 수 있는 길 위 점 (마을 그림 기준 · 아래 메뉴·출격 버튼·이름판을 피함) */
const PATH: [number, number][] = [[352, 252], [420, 236], [492, 262], [560, 248], [612, 276], [470, 298], [392, 304], [332, 282], [538, 316], [598, 318], [452, 272]];
const WALKERS = 3;
const HGT = 64;
const SPEED = 20;
const SAY = { every: [6, 10] as [number, number], sec: 2.5 };
interface Walker { id: string; x: number; y: number; tx: number; ty: number; at: number; wait: number; face: number }
let img: HTMLImageElement | null = null;
let walkers: Walker[] = [];
let sayT = 0;
let bubble: HTMLElement | null = null;
let bubbleOf: { w: Walker; t: number } | null = null;

/** 마을 그림 좌표 → 화면 논리 좌표 (cover) */
export function town(x: number, y: number) {
  const k = Math.max(view.w / 844, 1);
  return { x: (view.w - 844 * k) / 2 + x * k, y: (390 - 390 * k) / 2 + y * k, k };
}
const pick = (o?: Walker) => {
  const free = PATH.filter(([x, y]) => !walkers.some((w) => w !== o && Math.hypot(w.tx - x, w.ty - y) < 60));
  return (free.length ? free : PATH)[Math.floor(Math.random() * (free.length || PATH.length))];
};
/** 로비에 들어올 때: 걸어 다닐 영웅(파티 먼저 · 가진 영웅으로 채움) · 말풍선 자리 */
export function lobbyLifeStart(root: HTMLElement) {
  if (!img) {
    img = new Image();
    img.src = TOWN;
  }
  const ids = [...new Set([...partyIds(), ...Object.keys(S.heroes)])].slice(0, WALKERS);
  walkers = [];
  for (const [i, id] of ids.entries()) {
    const [x, y] = PATH[(i * 4 + 1) % PATH.length];
    const w: Walker = { id, x, y, tx: x, ty: y, at: Math.random() * 2, wait: 0.5 + i * 1.2, face: i % 2 ? -1 : 1 };
    walkers.push(w);
  }
  sayT = 1.2;
  bubble = document.createElement('div');
  bubble.className = 'lsay';
  bubble.style.cssText = k9('dialog', 8);
  bubble.innerHTML = '<span></span>';
  bubble.hidden = true;
  root.append(bubble);
  bubbleOf = null;
}
/** 매 프레임: 마을 그림 → 걷는 영웅(그림자 + 도트) → 말풍선 자리 */
export function lobbyLifeTick(dt: number) {
  const ctx = view.ctx;
  const W = view.w;
  const H = view.h;
  if (img?.complete && img.naturalWidth) {
    const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, (W - img.naturalWidth * k) / 2, (H - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
  }
  const sheet = view.art?.sheet;
  if (!sheet) return;
  // 말풍선: 6~10초마다 한 명 · 2.5초
  sayT -= dt;
  if (sayT <= 0 && walkers.length) {
    sayT = SAY.every[0] + Math.random() * (SAY.every[1] - SAY.every[0]);
    const w = walkers[Math.floor(Math.random() * walkers.length)];
    const line = lobbyLine(w.id) || heroOf(w.id).title;
    if (bubble) {
      bubble.querySelector('span')!.textContent = line;
      bubble.hidden = false;
      bubble.classList.remove('pop');
      void bubble.offsetWidth;
      bubble.classList.add('pop');
    }
    bubbleOf = { w, t: SAY.sec };
  }
  for (const w of [...walkers].sort((a, b) => a.y - b.y)) {
    w.at += dt;
    const dx = w.tx - w.x;
    const dy = w.ty - w.y;
    const d = Math.hypot(dx, dy);
    const moving = d > 1.5;
    if (moving) {
      const s = Math.min(d, SPEED * dt);
      w.x += (dx / d) * s;
      w.y += (dy / d) * s;
      if (Math.abs(dx) > 0.5) w.face = dx > 0 ? 1 : -1;
    } else if ((w.wait -= dt) <= 0) {
      [w.tx, w.ty] = pick(w);
      w.wait = 2 + Math.random() * 4;
    }
    const art = artOf(heroOf(w.id));
    const { def } = animOf(art.anims, moving ? 'walk' : 'idle');
    const ref = art.anims.idle!.frames[0];
    if (!sheet.img[ref]) continue;
    const p = town(w.x, w.y);
    const k = (HGT * p.k) / heightOf(sheet, ref);
    // 발밑 그림자 (발이 가운데 · 미리 그린 흐린 타원)
    const sk = (15 * p.k) / 52;
    ctx.drawImage(shadowSprite(), p.x - 64 * sk, p.y - 24 * sk, 128 * sk, 48 * sk);
    drawFrame(ctx, sheet, def.frames[frameAt(def, w.at)], p.x, p.y, k, w.face);
  }
  if (bubbleOf && bubble) {
    bubbleOf.t -= dt;
    if (bubbleOf.t <= 0) ((bubble.hidden = true), (bubbleOf = null));
    else {
      const p = town(bubbleOf.w.x, bubbleOf.w.y);
      // 머리 위 (발 y − 98 · 정답 화면 lobby.jpg)
      bubble.style.left = `${p.x}px`;
      bubble.style.top = `${p.y - 98 * p.k}px`;
    }
  }
}
export function lobbyLifeStop() {
  bubble?.remove();
  bubble = null;
  bubbleOf = null;
}
