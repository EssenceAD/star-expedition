// 화면 크기 · 캔버스 · 그림 (main.ts가 채움) — 화면 꽉 채우기: 높이 390 고정, 너비는 창 비율(wMin~wMax)
import { CONFIG } from '../config';
import type { Art } from '../battle/render';

export const view = {
  w: CONFIG.view.wBase as number,
  h: CONFIG.view.h,
  scale: 1,
  ctx: null as unknown as CanvasRenderingContext2D,
  art: null as unknown as Art,
  /** 창 크기가 바뀔 때 (전투가 적 자리를 옮김) */
  onResize: [] as ((w: number) => void)[],
};
export function fitView(stage: HTMLElement, cv: HTMLCanvasElement, iw = innerWidth, ih = innerHeight) {
  const V = CONFIG.view;
  const w = Math.round(Math.max(V.wMin, Math.min(V.wMax, (iw / ih) * V.h)));
  const k = Math.min(iw / w, ih / V.h);
  view.w = w;
  view.scale = k;
  stage.style.width = `${w}px`;
  stage.style.transform = `translate(-50%, -50%) scale(${k})`;
  cv.style.width = `${w}px`;
  const dpr = Math.min(3, (window.devicePixelRatio || 1) * k);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(V.h * dpr);
  view.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view.ctx.imageSmoothingEnabled = false;
  for (const f of view.onResize) f(w);
}
