// 화면 크기 · 캔버스 · 그림 (main.ts가 채움) — 기준 844×390(가로 폰)을 min(창 너비/844, 창 높이/390)로 균일 확대 (docs/UI_KIT_1018.md §0-4)
//  더 넓은 창은 논리 너비가 wMax까지 늘어남(배경만 더 보임) · 더 높은 창(아이패드)은 위·아래 남는 곳에 배경(#bd)이 보임
//  안전 여백 --sl/--sr/--st/--sb = max(16px, 노치·홈바가 화면을 가린 만큼) (논리 px · §0-3)
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
  /** 안전 여백 (논리 px · 최소 16) */
  safe: { l: 16, r: 16, t: 16, b: 16 },
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
  const [gw, gh] = rot ? [ih, iw] : [iw, ih];
  const w = Math.round(Math.max(V.wMin, Math.min(V.wMax, (gw / gh) * V.h)));
  const k = Math.min(gw / w, gh / V.h);
  view.w = w;
  view.scale = k;
  stage.style.width = `${w}px`;
  stage.style.transform = `translate(-50%, -50%)${rot ? ' rotate(90deg)' : ''} scale(${k})`;
  // 안전 여백: 노치·홈바(env(safe-area-inset-*))가 게임 화면을 가리는 만큼 · 최소 SAFE(16) · 돌렸으면 화면 위 = 게임 왼쪽, 화면 아래 = 게임 오른쪽
  const s = safeInsets();
  const [il, ir, it, ib] = rot ? [s.t, s.b, s.r, s.l] : [s.l, s.r, s.t, s.b];
  const padX = (gw - w * k) / 2;
  const padY = (gh - V.h * k) / 2;
  const safe = (inset: number, pad: number) => Math.max(V.safe, Math.round((inset - pad) / k));
  const [sl, sr, st, sb] = [safe(il, padX), safe(ir, padX), safe(it, padY), safe(ib, padY)];
  for (const [n, v] of [['--sl', sl], ['--sr', sr], ['--st', st], ['--sb', sb]] as const) stage.style.setProperty(n, `${v}px`);
  stage.style.setProperty('--safeL', `${sl - V.safe}px`);
  stage.style.setProperty('--safeR', `${sr - V.safe}px`);
  // 아래 영웅 4칸(812)이 안전 여백 안에 들어가게 (넘치면 그만큼만 줄임)
  stage.style.setProperty('--unitK', String(Math.min(1, (w - sl - sr + 2 * V.safe - 32) / 812)));
  view.safe = { l: sl, r: sr, t: st, b: sb };
  cv.style.width = `${w}px`;
  const dpr = Math.min(3, (window.devicePixelRatio || 1) * k);
  view.dpr = dpr;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(V.h * dpr);
  view.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view.ctx.imageSmoothingEnabled = false;
  for (const f of view.onResize) f(w);
}
/** 화면 밖 남는 곳(아이패드 위·아래)에 깔 배경 그림 (지금 화면 배경 · 흐리게) */
export function setBackdrop(url: string | null) {
  const bd = document.getElementById('bd');
  if (bd) bd.style.backgroundImage = url ? `url("${new URL(url, location.href).href}")` : 'none';
}
