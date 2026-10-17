// 전투 아래 영웅 상반신 (docs/UI_KIT_1018.md §4 · target_screens.py bust()): 전신 그림을 투명 테두리 잘라(trim) 위 42%만 · 높이 84 · 최대 너비 66
//  가운데 기준으로 넓으면 양옆을 자름 · 아래 25%는 알파 페이드 · 틀 없음 (캔버스로 한 번 만들어 dataURL로 둠)
//  얼굴이 잘리는 영웅은 data/heroes.ts 의 bust:{dx,dy,scale} 로 보정 (docs/captures/impl_1018/busts.jpg 로 확인)
import { HEROES, heroOf } from '../data/heroes';
import { T } from '../theme/tokens';
import { img } from './assets';
import { fullbodyUrl } from './core';

/** 만드는 해상도 (논리 px × 3 → 폰 dpr 3에서도 또렷) */
const D = 3;
const cache = new Map<string, Promise<string>>();
const boxes = new Map<HTMLImageElement, [number, number, number, number]>();
/** 투명이 아닌 영역 (알파 > 16) · 1/4 크기로 재서 원본 좌표로 */
function bbox(im: HTMLImageElement): [number, number, number, number] {
  const hit = boxes.get(im);
  if (hit) return hit;
  const k = 0.25;
  const w = Math.max(1, Math.round(im.naturalWidth * k));
  const h = Math.max(1, Math.round(im.naturalHeight * k));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(im, 0, 0, w, h);
  const a = x.getImageData(0, 0, w, h).data;
  let [x0, y0, x1, y1] = [w, h, 0, 0];
  for (let y = 0; y < h; y++)
    for (let i = 0; i < w; i++)
      if (a[(y * w + i) * 4 + 3] > 16) {
        if (i < x0) x0 = i;
        if (i > x1) x1 = i;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  const r: [number, number, number, number] = x1 < x0 ? [0, 0, im.naturalWidth, im.naturalHeight] : [x0 / k, y0 / k, (x1 + 1) / k, (y1 + 1) / k];
  boxes.set(im, r);
  return r;
}
/** 상반신 그림 (dataURL) · h = 논리 높이 · maxW = 최대 논리 너비 */
export function bustUrl(id: string, h = 84, maxW = 66): Promise<string> {
  const src = fullbodyUrl(id);
  const key = `${src}|${h}|${maxW}`;
  let p = cache.get(key);
  if (!p) {
    p = img(src).then((im) => {
      const [x0, y0, x1, y1] = bbox(im);
      const adj = heroOf(id).bust ?? {};
      const bw = x1 - x0;
      const bh = y1 - y0;
      const cropH = (bh * 0.42) / (adj.scale ?? 1);
      const top = y0 + (adj.dy ?? 0) * bh;
      const outH = Math.round(h * D);
      const s = outH / cropH;
      const outW = Math.round(Math.min(bw * s, maxW * D));
      const srcW = outW / s;
      const sx = x0 + bw / 2 + (adj.dx ?? 0) * bw - srcW / 2;
      const c = document.createElement('canvas');
      c.width = outW;
      c.height = outH;
      const x = c.getContext('2d')!;
      x.imageSmoothingQuality = 'high';
      x.drawImage(im, sx, top, srcW, cropH, 0, 0, outW, outH);
      // 아래 25% 알파 페이드
      x.globalCompositeOperation = 'destination-in';
      const g = x.createLinearGradient(0, 0, 0, outH);
      g.addColorStop(0, T.kit2.black);
      g.addColorStop(0.75, T.kit2.black);
      g.addColorStop(1, T.battle.clear);
      x.fillStyle = g;
      x.fillRect(0, 0, outW, outH);
      return c.toDataURL('image/png');
    });
    cache.set(key, p);
  }
  return p;
}
/** 전신 그림을 투명 테두리 잘라(trim) 높이 h로 (결과 화면 · 영웅 카드 · target_screens.py fullbody()) */
export function fullUrl(id: string, h = 190): Promise<string> {
  const src = fullbodyUrl(id);
  const key = `full|${src}|${h}`;
  let p = cache.get(key);
  if (!p) {
    p = img(src).then((im) => {
      const [x0, y0, x1, y1] = bbox(im);
      const outH = Math.round(h * 2);
      const s = outH / (y1 - y0);
      const outW = Math.max(1, Math.round((x1 - x0) * s));
      const c = document.createElement('canvas');
      c.width = outW;
      c.height = outH;
      const x = c.getContext('2d')!;
      x.imageSmoothingQuality = 'high';
      x.drawImage(im, x0, y0, x1 - x0, y1 - y0, 0, 0, outW, outH);
      return c.toDataURL('image/png');
    });
    cache.set(key, p);
  }
  return p;
}
/** 36명 상반신 확인 시트 (tools/capture_1018.mjs → docs/captures/impl_1018/busts.jpg) */
export async function bustSheet(): Promise<string> {
  const cols = 9;
  const cw = 92;
  const ch = 112;
  const rows = Math.ceil(HEROES.length / cols);
  const c = document.createElement('canvas');
  c.width = cols * cw * 2;
  c.height = rows * ch * 2;
  const x = c.getContext('2d')!;
  x.scale(2, 2);
  x.fillStyle = T.kit2.ink;
  x.fillRect(0, 0, cols * cw, rows * ch);
  for (const [i, h] of HEROES.entries()) {
    const url = await bustUrl(h.id).catch(() => '');
    const cx = (i % cols) * cw;
    const cy = Math.floor(i / cols) * ch;
    // 칸 = 전투 아래 칸과 같은 66×84 창 (가운데 · 아래 붙임) + 이름
    x.strokeStyle = T.kit2.lv;
    x.lineWidth = 0.5;
    x.strokeRect(cx + 13, cy + 6, 66, 84);
    if (url) {
      const im = await img(url);
      const w = im.naturalWidth / D;
      x.drawImage(im, cx + 46 - w / 2, cy + 6 + 84 - im.naturalHeight / D, w, im.naturalHeight / D);
    }
    x.fillStyle = T.kit2.cream;
    x.font = `${T.font.weight.black} 9px ${T.font.base}`;
    x.textAlign = 'center';
    x.fillText(`${h.name} (${h.id})`, cx + 46, cy + 104);
  }
  return c.toDataURL('image/jpeg', 0.9);
}
