// 메인 = 모험 지도 (docs/RECOVER_1018.md S1 · 킹스레이드 영상 sheet_00 v1_010 · sheet_04 v2_001 · sheet_08 v3_025)
//  장 지도 그림(map_<지역>.jpg)이 화면을 덮고, 노드 줄은 늘 위 HUD 밑 ~ 아래 메뉴 위(safe 띠) 안에 들어오게 (형철 10/18 ①④)
//  캔버스: 지도만 · 노드 버튼(DOM)은 같은 자리(.mlayer)에 % · 원정대장은 노드 위 작은 캔버스(.mfig) · 장 보스는 보스 노드 아래 얼굴라 메달 바로 위·앞에 섬
import { CONFIG } from '../config';
import { artOf, heroOf } from '../data/heroes';
import { CHAPTERS } from '../data/story';
import { animOf, drawFrame, frameAt, heightOf } from '../sprite/sheet';
import { T } from '../theme/tokens';
import { view } from './view';

const M = CONFIG.ui.mainMap;
/** 장별 지도 그림 (public/art/screens/map_<지역>.jpg · 1장 숲은 map.jpg) + 노드 자리 (그림 안 % · 그림의 길 위)
 *  노드 메달은 그림 세로 약 33~65% 띠 안에만 (폰·PC 모두 위 HUD 밑 ~ 아래 메뉴 위 · 형철 10/18 ①④) · 지도 그림도 길이 그 띠를 따라 가로로 나게 다시 뽑음
 *  왼쪽 세로 아이콘(미션·이벤트·출석)과 안 겹치게 x 9% 이상 */
export const MAP_NODES: Record<string, [number, number][]> = {
  forest: [[21, 63], [29, 66], [37, 60], [45, 56], [52, 53], [60, 47], [66, 38], [74, 34], [80, 41], [87, 44]],
  swamp: [[15, 40], [19, 53], [26, 63], [34, 59], [42, 55], [50, 57], [58, 59], [66, 55], [71, 49], [77, 42]],
  mine: [[10, 66], [17, 59], [25, 55], [33, 52], [41, 49], [48, 43], [56, 40], [64, 38], [72, 38], [80, 40]],
  ice: [[10, 54], [18, 52], [26, 55], [34, 57], [42, 52], [50, 46], [60, 42], [69, 44], [78, 45], [87, 52]],
  abyss: [[9, 49], [15, 54], [22, 56], [32, 48], [40, 50], [47, 55], [55, 47], [63, 45], [71, 56], [84, 42]],
  coast: [[9, 62], [15, 59], [21, 55], [27, 51], [33, 47], [39, 43], [46, 39], [52, 36], [58, 34], [65, 32]],
  dune: [[22, 66], [28, 63], [34, 60], [40, 57], [46, 54], [52, 51], [58, 48], [64, 45], [70, 41], [78, 36]],
  ember: [[25, 42], [28, 52], [34, 59], [41, 61], [48, 57], [55, 53], [62, 54], [69, 53], [76, 49], [86, 61]],
  sky: [[9, 47], [16, 45], [24, 44], [32, 44], [40, 47], [48, 50], [56, 49], [63, 47], [70, 45], [79, 42]],
  deep: [[10, 63], [16, 61], [22, 57], [29, 53], [36, 52], [44, 53], [52, 51], [60, 48], [67, 45], [75, 38]],
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
export function mainMapStart(el: HTMLElement, c: number, leadId: string, next: number) {
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
