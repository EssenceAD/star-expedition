// 메인 = 모험 지도 (docs/RECOVER_1018.md S1 · 킹스레이드 영상 sheet_00 v1_010 · sheet_04 v2_001 · sheet_08 v3_025)
//  장 지도 그림(map_<지역>.jpg)이 화면을 덮고, 노드 줄은 늘 위 HUD 밑 ~ 아래 메뉴 위(safe 띠) 안에 들어오게 (형철 10/18 ①④)
//  캔버스: 지도만 · 노드 버튼(DOM)은 같은 자리(.mlayer)에 % · 원정대장·장 보스는 노드 위 작은 캔버스(.mfig)라 메달 바로 위·앞에 섬
import { CONFIG } from '../config';
import { artOf, heroOf } from '../data/heroes';
import { CHAPTERS } from '../data/story';
import { buildMobs } from '../game/stage';
import { animOf, drawFrame, frameAt, hasSheet, heightOf, loadInto } from '../sprite/sheet';
import { T } from '../theme/tokens';
import { view } from './view';

const M = CONFIG.ui.mainMap;
/** 장별 지도 그림 (public/art/screens/map_<지역>.jpg · 1장 숲은 map.jpg) + 노드 자리 (그림 안 %)
 *  노드 메달은 그림 세로 약 33~65% 띠 안에만 (폰·PC 모두 위 HUD 밑 ~ 아래 메뉴 위 · 형철 10/18 ①④)
 *  그림의 길이 그 띠 안에 있는 곳은 길 위에, 길이 띠를 벗어나는 곳은 띠 안 땅 위에 점선 길로 이음 · 왼쪽 세로 아이콘(미션·이벤트·출석)과 안 겹치게 x 9% 이상 */
export const MAP_NODES: Record<string, [number, number][]> = {
  forest: [[21, 63], [29, 66], [37, 60], [45, 56], [52, 53], [60, 47], [66, 38], [74, 34], [80, 41], [87, 44]],
  swamp: [[9, 60], [14, 52], [22, 40], [31, 46], [38, 58], [45, 63], [50, 56], [57, 48], [64, 40], [71, 34]],
  mine: [[9, 62], [10, 48], [18, 38], [26, 56], [34, 48], [43, 40], [55, 44], [59, 54], [65, 62], [73, 52]],
  ice: [[10, 60], [19, 56], [27, 50], [35, 46], [43, 49], [51, 55], [58, 52], [64, 47], [69, 41], [75, 34]],
  abyss: [[9, 56], [15, 46], [20, 42], [29, 38], [36, 60], [44, 63], [51, 56], [57, 49], [62, 42], [68, 34]],
  coast: [[24, 40], [30, 49], [34, 58], [40, 64], [46, 57], [51, 51], [57, 46], [63, 41], [73, 40], [84, 45]],
  dune: [[9, 56], [13, 48], [21, 56], [29, 48], [37, 56], [45, 48], [53, 56], [61, 50], [69, 58], [72, 40]],
  ember: [[10, 58], [16, 48], [24, 58], [32, 50], [42, 63], [48, 58], [54, 52], [60, 46], [65, 40], [71, 34]],
  sky: [[10, 40], [17, 42], [30, 46], [38, 36], [45, 50], [51, 61], [57, 56], [63, 48], [69, 42], [75, 35]],
  deep: [[10, 56], [16, 48], [24, 56], [32, 48], [40, 56], [48, 48], [56, 56], [64, 60], [72, 56], [80, 42]],
};
const regionOf = (c: number) => CHAPTERS[c - 1]?.region ?? 'forest';
/** 이 장 노드 자리 (그림이 없는 장은 숲 자리) */
export const nodesOf = (c: number) => MAP_NODES[regionOf(c)] ?? MAP_NODES.forest;
/** 이 장 지도 그림 주소 */
export const mapUrl = (c: number) => `${import.meta.env.BASE_URL}art/screens/${regionOf(c) === 'forest' || !MAP_NODES[regionOf(c)] ? 'map' : `map_${regionOf(c)}`}.jpg`;
let NODES = MAP_NODES.forest;
let yMin = 0;
let yMax = 1;
const imgs: Record<string, HTMLImageElement> = {};
let img: HTMLImageElement | null = null;
/** 지도 그림 화면 자리 (논리 px) */
const at = { x: 0, y: 0, w: 0, h: 0 };
let layer: HTMLElement | null = null;
type Anim = { key: string; frames: string[]; def: ReturnType<typeof animOf>['def'] };
interface Fig { cv: HTMLCanvasElement; anim: Anim; h: number; face: number }
let figs: Fig[] = [];
let t = 0;

/** 노드 줄이 safe 띠(위 HUD 밑 ~ 아래 메뉴 위) 안에 오는 세로 범위 ∩ 화면을 덮는 범위 (안 겹치면 가운데 한 점) */
function yRange(): [number, number] {
  const lo = Math.max(view.h - at.h, M.nodeTop - at.h * yMin);
  const hi = Math.min(0, M.nodeBottom - at.h * yMax);
  if (lo <= hi) return [lo, hi];
  const mid = Math.min(0, Math.max(view.h - at.h, (M.nodeTop + M.nodeBottom - at.h * (yMin + yMax)) / 2));
  return [mid, mid];
}
function clamp() {
  const [lo, hi] = yRange();
  at.x = Math.min(0, Math.max(view.w - at.w, at.x));
  at.y = Math.min(hi, Math.max(lo, at.y));
  if (layer) layer.style.transform = `translate(${at.x}px, ${at.y}px)`;
}

/** 노드 n 위에 서는 그림 하나 (DOM 캔버스 · 발 = 메달 윗변 · 노드 메달보다 앞) · [dx, dy] = 오른쪽·뒤로 비켜 서기(px) */
function addFig(n: number, h: number, face: number, anim: Anim, [dx, dy] = [0, 0]) {
  const [x, y] = NODES[n - 1];
  const H = h + M.figPad;
  const cv = document.createElement('canvas');
  cv.className = 'mfig';
  cv.style.left = `${x}%`;
  cv.style.top = `${y}%`;
  if (dx || dy) cv.style.transform = `translate(calc(-50% + ${dx}px), calc(-100% - ${7 + dy}px))`;
  cv.style.width = `${M.figW}px`;
  cv.style.height = `${H}px`;
  cv.width = Math.round(M.figW * view.dpr);
  cv.height = Math.round(H * view.dpr);
  layer!.append(cv);
  figs.push({ cv, anim, h, face });
}

/** 메인에 들어올 때: 지도 레이어 · 이 장 · 원정대장 · 다음 노드 n */
export function mainMapStart(el: HTMLElement, c: number, d: number, leadId: string, next: number) {
  layer = el;
  t = 0;
  figs = [];
  NODES = nodesOf(c);
  yMin = Math.min(...NODES.map(([, y]) => y)) / 100;
  yMax = Math.max(...NODES.map(([, y]) => y)) / 100;
  const fit = () => {
    const iw = img?.naturalWidth || 1672;
    const ih = img?.naturalHeight || 940;
    const k = Math.max(view.w / iw, view.h / ih) * M.zoom;
    at.w = iw * k;
    at.h = ih * k;
    el.style.width = `${at.w}px`;
    el.style.height = `${at.h}px`;
    // 처음: 다음 노드가 가로 가운데 · 세로는 노드 줄이 safe 띠 가운데
    at.x = view.w / 2 - (at.w * NODES[next - 1][0]) / 100;
    const [lo, hi] = yRange();
    at.y = (lo + hi) / 2;
    clamp();
  };
  const src = mapUrl(c);
  img = imgs[src] ??= Object.assign(new Image(), { src });
  if (!img.complete) img.addEventListener('load', fit, { once: true });
  fit();
  // 장 보스 (마지막 스테이지 마지막 웨이브의 보스) — 시트가 없으면 받아 둠 · 왼쪽(길 쪽)을 봄 · 노드 오른쪽 뒤에 섬
  const b = buildMobs({ c, s: NODES.length, d }).flat().find((m) => m.boss);
  if (b) {
    const { def } = animOf(b.kind.anims, 'idle');
    const dirs = [...new Set(def.frames.map((f) => f.split(':')[0]))].filter((x) => !hasSheet(view.art.sheet, x));
    if (dirs.length) void loadInto(view.art.sheet, dirs);
    addFig(NODES.length, M.bossH, -1, { key: b.kind.anims.idle!.frames[0], frames: def.frames, def }, M.boss);
  }
  // 원정대장: 마지막으로 깬 노드 (장 처음이면 1번 노드)
  const art = artOf(heroOf(leadId));
  const { def } = animOf(art.anims, 'idle');
  addFig(Math.max(1, next - 1), M.leadH, 1, { key: art.anims.idle!.frames[0], frames: def.frames, def });
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

/** 매 프레임: 지도(배경 캔버스) → 노드 위 그림(작은 캔버스마다 · 그림 키 = h · 발밑 그림자) */
export function mainMapTick(dt: number) {
  t += dt;
  if (img?.complete && img.naturalWidth) view.ctx.drawImage(img, at.x, at.y, at.w, at.h);
  const sheet = view.art?.sheet;
  if (!sheet) return;
  for (const { cv, anim, h, face } of figs) {
    const ctx = cv.getContext('2d')!;
    const dpr = cv.width / M.figW;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, M.figW, h + M.figPad);
    if (!sheet.img[anim.key]) continue;
    const fx = M.figW / 2;
    const fy = h + M.figPad - M.figFoot;
    ctx.fillStyle = T.battle.shadow;
    ctx.beginPath();
    ctx.ellipse(fx, fy, M.figW / 5, M.figFoot / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    drawFrame(ctx, sheet, anim.frames[frameAt(anim.def, t)], fx, fy, h / heightOf(sheet, anim.key), face);
  }
}
