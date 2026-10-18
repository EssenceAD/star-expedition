// 메인 = 모험 지도 (docs/RECOVER_1018.md S1 · 킹스레이드 영상 sheet_00 v1_010 · sheet_04 v2_001 · sheet_08 v3_025)
//  지도 그림(map.jpg)을 화면보다 크게 깔고 끌어서 둘러봄 · 처음엔 다음 스테이지가 가운데
//  캔버스: 지도 → 보스 노드 위 장 보스(대기 동작) → 마지막으로 깬 노드 위 원정대장(대기 동작) · 노드 버튼(DOM)은 같은 자리(.mlayer)에 %로
//  다음 노드에는 화살표(DOM) — 원정대장이 다음 노드(장 첫 노드)나 보스 노드에 서면 옆으로 비켜 섬
import { CONFIG } from '../config';
import { artOf, heroOf } from '../data/heroes';
import { buildMobs } from '../game/stage';
import { animOf, drawFrame, frameAt, hasSheet, heightOf, loadInto } from '../sprite/sheet';
import { T } from '../theme/tokens';
import { view } from './view';

const M = CONFIG.ui.mainMap;
/** 노드 자리 (지도 그림 map.jpg 안 % · 그림의 길 위) — 왼쪽 아래 항구에서 다리를 건너 오른쪽 위 폐성 앞 돌다리(보스)까지 */
export const NODES: [number, number][] = [[22, 76], [28, 67], [35, 60], [43, 57], [51, 53], [58, 48], [62, 41], [68, 33], [76, 29], [83, 23]];
let img: HTMLImageElement | null = null;
/** 지도 그림 화면 자리 (논리 px) */
const at = { x: 0, y: 0, w: 0, h: 0 };
let layer: HTMLElement | null = null;
let lead = '';
let hereNode = 0;
let sideStep = false;
let boss: { key: string; frames: string[]; h: number; anim: ReturnType<typeof animOf>['def'] } | null = null;
let t = 0;

/** 지도 크기: 화면을 덮는 크기 × zoom */
function size() {
  const iw = img?.naturalWidth || 1672;
  const ih = img?.naturalHeight || 940;
  const k = Math.max(view.w / iw, view.h / ih) * M.zoom;
  at.w = iw * k;
  at.h = ih * k;
}
/** 끌어도 화면 밖 빈 곳이 안 보이게 */
function clamp() {
  at.x = Math.min(0, Math.max(view.w - at.w, at.x));
  at.y = Math.min(0, Math.max(view.h - at.h, at.y));
  if (layer) layer.style.transform = `translate(${at.x}px, ${at.y}px)`;
}
/** 노드 n(1부터)을 화면 (fx, fy) 비율 자리에 */
function focus(n: number) {
  const [nx, ny] = NODES[n - 1];
  at.x = view.w * M.focus[0] - (at.w * nx) / 100;
  at.y = view.h * M.focus[1] - (at.h * ny) / 100;
  clamp();
}

/** 메인에 들어올 때: 지도 레이어(노드 버튼이 든 div) · 이 장 · 원정대장 · 다음 노드(n · 처음 비출 곳) */
export function mainMapStart(el: HTMLElement, c: number, d: number, leadId: string, next: number) {
  layer = el;
  lead = leadId;
  hereNode = Math.max(1, next - 1);
  sideStep = hereNode === next || hereNode === NODES.length;
  t = 0;
  const fit = () => {
    size();
    el.style.width = `${at.w}px`;
    el.style.height = `${at.h}px`;
    focus(next);
  };
  if (!img) {
    img = new Image();
    img.src = `${import.meta.env.BASE_URL}art/screens/map.jpg`;
  }
  if (img.complete) fit();
  else img.addEventListener('load', fit, { once: true });
  fit();
  // 장 보스 (마지막 스테이지 마지막 웨이브의 보스) — 시트가 없으면 받아 둠
  const b = buildMobs({ c, s: NODES.length, d }).flat().find((m) => m.boss);
  boss = null;
  if (b) {
    const { def } = animOf(b.kind.anims, 'idle');
    const ref = b.kind.anims.idle!.frames[0];
    boss = { key: ref, frames: def.frames, h: b.kind.h, anim: def };
    const dirs = [...new Set(def.frames.map((f) => f.split(':')[0]))].filter((x) => !hasSheet(view.art.sheet, x));
    if (dirs.length) void loadInto(view.art.sheet, dirs);
  }
  // 끌어서 둘러보기 (조금만 움직이면 누름으로 봄)
  const root = el.parentElement!;
  let drag: { x: number; y: number; ax: number; ay: number; moved: boolean } | null = null;
  root.onpointerdown = (e) => {
    if ((e.target as HTMLElement).closest('.mhud')) return;
    drag = { x: e.clientX, y: e.clientY, ax: at.x, ay: at.y, moved: false };
  };
  root.onpointermove = (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.x) / view.scale;
    const dy = (e.clientY - drag.y) / view.scale;
    if (!drag.moved && Math.hypot(dx, dy) < M.dragPx) return;
    drag.moved = true;
    // 돌린 화면(세로로 든 폰)이면 손가락 방향도 돌려서
    [at.x, at.y] = view.rotated ? [drag.ax + dy, drag.ay - dx] : [drag.ax + dx, drag.ay + dy];
    clamp();
  };
  root.onpointerup = root.onpointercancel = () => {
    // 끌었으면 손을 뗄 때의 누름은 버림
    if (drag?.moved) root.addEventListener('click', (e) => e.stopPropagation(), { capture: true, once: true });
    drag = null;
  };
}

/** 노드 발밑 화면 자리 (노드 메달 위쪽 = 캐릭터가 서는 곳) */
const foot = (n: number) => {
  const [nx, ny] = NODES[n - 1];
  return [at.x + (at.w * nx) / 100, at.y + (at.h * ny) / 100 + M.footDy] as const;
};

/** 매 프레임: 지도 → 보스 → 원정대장 */
export function mainMapTick(dt: number) {
  t += dt;
  const ctx = view.ctx;
  if (img?.complete && img.naturalWidth) ctx.drawImage(img, at.x, at.y, at.w, at.h);
  const sheet = view.art?.sheet;
  if (!sheet) return;
  const shadow = (x: number, y: number, r: number) => {
    ctx.fillStyle = T.battle.shadow;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, r, r / 4, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  if (boss && sheet.img[boss.key]) {
    const [x, y] = foot(NODES.length);
    const k = (boss.h * M.bossScale) / heightOf(sheet, boss.key);
    shadow(x, y, M.shadowR * 1.6);
    drawFrame(ctx, sheet, boss.frames[frameAt(boss.anim, t)], x, y, k, -1);
  }
  if (!lead || !hereNode) return;
  const art = artOf(heroOf(lead));
  const ref = art.anims.idle!.frames[0];
  if (!sheet.img[ref]) return;
  const { def } = animOf(art.anims, 'idle');
  const [fx, y] = foot(hereNode);
  const x = fx + (sideStep ? M.leadDx : 0);
  const k = (art.h * M.heroScale) / heightOf(sheet, ref);
  shadow(x, y, M.shadowR);
  drawFrame(ctx, sheet, def.frames[frameAt(def, t)], x, y, k, 1);
}
