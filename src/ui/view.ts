// 화면 크기 · 캔버스 · 그림 (main.ts가 채움) — 화면 꽉 채우기: 높이 390 고정, 너비는 창 비율(wMin~wMax)
import { CONFIG } from '../config';
import type { Art } from '../battle/render';

export const view = {
  w: CONFIG.view.wBase as number,
  h: CONFIG.view.h,
  scale: 1,
  /** 화면 1논리px = 실제 몇 px (보조 캔버스도 이 해상도로 · SPRITE_RES_1017) */
  dpr: 1,
  ctx: null as unknown as CanvasRenderingContext2D,
  art: null as unknown as Art,
  /** 세로로 든 폰: 게임을 90° 돌려 그림 (MOBILE_REF §1) */
  rotated: false,
  /** 창 크기가 바뀔 때 (전투가 적 자리를 옮김) */
  onResize: [] as ((w: number) => void)[],
};
/** 노치·홈바 여백 (env(safe-area-inset-*) 을 읽어 옴 · 화면 px) */
let probe: HTMLDivElement | null = null;
function safeInsets() {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.append(probe);
  }
  const c = getComputedStyle(probe);
  return { t: parseFloat(c.paddingTop) || 0, r: parseFloat(c.paddingRight) || 0, b: parseFloat(c.paddingBottom) || 0, l: parseFloat(c.paddingLeft) || 0 };
}
/** 지금 보이는 창 크기 (주소창·키보드 빼고 · visualViewport 우선) */
export const viewportSize = () => ({ w: Math.round(visualViewport?.width ?? innerWidth), h: Math.round(visualViewport?.height ?? innerHeight) });
export function fitView(stage: HTMLElement, cv: HTMLCanvasElement, iw = viewportSize().w, ih = viewportSize().h) {
  const V = CONFIG.view;
  // 세로로 들고 있으면 게임을 시계 방향 90° 돌려서 그림 → 폰을 눕히기만 하면 바로 가로 화면 (창 높이 = 게임 너비)
  const rot = ih > iw;
  view.rotated = rot;
  document.documentElement.classList.toggle('rot', rot);
  // 돌린 화면(세로로 든 폰): 위 상태 표시줄(시간·배터리)·아래 홈 막대 자리는 빼고 그 안에 맞춤 → 게임 왼쪽·오른쪽이 가려지지 않게
  const s = safeInsets();
  const [gw, gh] = rot ? [ih - s.t - s.b, iw] : [iw, ih];
  const w = Math.round(Math.max(V.wMin, Math.min(V.wMax, (gw / gh) * V.h)));
  const k = Math.min(gw / w, gh / V.h);
  view.w = w;
  view.scale = k;
  stage.style.width = `${w}px`;
  // 패드(4:3 · 5:4)처럼 폭이 좁은 화면: 꽉 채우고 메뉴는 촘촘하게 (.narrow)
  stage.classList.toggle('narrow', w < V.narrow);
  stage.style.transform = `translate(-50%, -50%)${rot ? ` translateY(${Math.round((s.t - s.b) / 2)}px) rotate(90deg)` : ''} scale(${k})`;
  // HUD는 노치·홈바만큼 안으로 (게임 좌표 px) · 돌린 화면은 이미 그 자리를 뺐으니 0
  const [sl, sr] = rot ? [0, 0] : [s.l, s.r];
  stage.style.setProperty('--safeL', `${Math.round(sl / k)}px`);
  stage.style.setProperty('--safeR', `${Math.round(sr / k)}px`);
  cv.style.width = `${w}px`;
  const dpr = Math.min(3, (window.devicePixelRatio || 1) * k);
  view.dpr = dpr;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(V.h * dpr);
  view.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view.ctx.imageSmoothingEnabled = false;
  for (const f of view.onResize) f(w);
}
