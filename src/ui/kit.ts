// UI 키트 kit2 (docs/UI_KIT_1018.md §1): 틀·판·버튼·바·받침은 전부 public/art/ui/kit2/ 그림
//  _kit.json = {이름: {w, h, inset:[l,t,r,b], slice?:[s,s,s,s]}} (원본 px) · slice 있는 부품은 9-slice(CSS border-image) · inset은 안쪽 내용 자리
//  좌표·크기는 논리 px(844×390 기준) — tools/target_screens.py 와 같은 계산(nine · inner · bar · socket_icon)
export interface KitPart {
  w: number;
  h: number;
  inset: [number, number, number, number];
  slice?: [number, number, number, number];
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const B = import.meta.env.BASE_URL;
let KIT: Record<string, KitPart> = {};
export const kitUrl = (name: string) => `${B}art/ui/kit2/${name}.png`;
export const titleUrl = (name: string) => `${B}art/ui/title/${name}`;
/** 부팅 때 한 번 (main.ts) */
export async function loadKit() {
  try {
    const r = await fetch(`${B}art/ui/kit2/_kit.json`);
    if (r.ok) KIT = (await r.json()) as Record<string, KitPart>;
  } catch {
    /* 그림 정보가 없으면 9-slice 기본값으로 */
  }
}
/** 시험용 */
export const setKit = (k: Record<string, KitPart>) => (KIT = k);
export const kitOf = (name: string): KitPart => KIT[name] ?? { w: 100, h: 100, inset: [0, 0, 0, 0] };
const n2 = (v: number) => Math.round(v * 100) / 100;

/** 9-slice 인라인 스타일 (border-image · 틀 두께 corner = 논리 px) — border-width 0이라 배치는 그대로, 그림은 상자 안쪽에 그려짐 */
export function k9(name: string, corner: number) {
  const k = kitOf(name);
  const s = k.slice?.[0] ?? Math.round(Math.min(k.w, k.h) / 3);
  return `border-style:solid;border-width:0;border-image:url("${kitUrl(name)}") ${s} fill / ${n2(corner)}px / 0 stretch;`;
}
/** 요소에 9-slice 틀 */
export function kitFrame(el: HTMLElement, name: string, o: { corner: number }) {
  el.style.cssText += k9(name, o.corner);
}
/** 안쪽 자리 (부품을 w×h로 그렸을 때 · inset × 배율) */
export function innerRect(name: string, w: number, h: number): Rect {
  const k = kitOf(name);
  const sx = w / k.w;
  const sy = h / k.h;
  const [l, t, r, b] = k.inset;
  return { x: l * sx, y: t * sy, w: w - (l + r) * sx, h: h - (t + b) * sy };
}
const box = (x: number, y: number, w: number, h: number) => `left:${n2(x)}px;top:${n2(y)}px;width:${n2(w)}px;height:${n2(h)}px;`;
/** 고정 그림 부품 (늘리지 않는 그림: medal · pause · handle · loot_band · card_N …) */
export function kitPart(name: string, w: number, h: number, cls = '', extra = '') {
  return `<img class="kp ${cls}" src="${kitUrl(name)}" alt="" draggable="false" style="width:${n2(w)}px;height:${n2(h)}px;${extra}">`;
}
/** 9-slice 부품 하나 (빈 상자) */
export function kit9(name: string, w: number, h: number, corner: number, cls = '', extra = '', inner = '') {
  return `<div class="k9 ${cls}" style="width:${n2(w)}px;height:${n2(h)}px;${k9(name, corner)}${extra}">${inner}</div>`;
}
export type Rarity = 'common' | 'rare' | 'epic' | 'legend';
/** 아이콘 받침: 아이콘을 받침 안쪽 창에 꽉 채우고(사방 1px 더) 받침 그림을 위에 겹침 (받침 가운데는 투명) */
export function kitSocket(iconUrl: string, size: number, rarity?: Rarity | null, cls = '', inner = '') {
  const frame = rarity ? `socket_${rarity}` : 'socket';
  const r = innerRect(frame, size, size);
  return `<div class="ksock ${cls}" style="width:${n2(size)}px;height:${n2(size)}px"><img class="ki" src="${iconUrl}" alt="" draggable="false" style="${box(r.x - 1, r.y - 1, r.w + 2, r.h + 2)}"><i class="kwin" style="${box(r.x, r.y, r.w, r.h)}">${inner}</i><img class="kf" src="${kitUrl(frame)}" alt="" draggable="false"></div>`;
}
/** 바: 9-slice 틀(corner = 높이/2) 위에 안쪽 채움 단색 사각형 (x+h·0.32, y+h·0.26, w−h·0.64, h·0.48) · 채움 폭은 --p(0~1) */
export function kitBar(w: number, h: number, ratio: number, color: string, frame: 'bar' | 'bar_thick' = 'bar', cls = '', label = '') {
  const f = { x: h * 0.32, y: h * 0.26, w: w - h * 0.64, h: h * 0.48 };
  return `<div class="kbar ${cls}" style="width:${n2(w)}px;height:${n2(h)}px;${k9(frame, h / 2)}--p:${Math.max(0, Math.min(1, ratio))}"><i class="kfill" style="${box(f.x, f.y, f.w, f.h)}background-color:${color}"></i>${label ? `<em>${label}</em>` : ''}</div>`;
}
/** 바 채움 바꾸기 */
export const setBar = (el: Element | null, ratio: number) => (el as HTMLElement | null)?.style.setProperty('--p', String(Math.max(0, Math.min(1, ratio))));
/** 영웅 카드 틀 (별 수 → card_1..4) */
export const cardFrame = (star: number) => `card_${star >= 5 ? 4 : star === 4 ? 3 : star === 3 ? 2 : 1}`;
