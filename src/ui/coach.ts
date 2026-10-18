// 기능 열림 튜토리얼 (RECOVER_1018 S6 · AUDIT I2 · 킹스레이드식): 화면을 어둡게 · 누를 곳만 밝은 네모 · 손가락 · 아래 설명 2줄
//  한 번 누르면 다음 · 마지막 칸은 그 버튼을 눌러 줌(go) · 본 것은 세이브 S.seen[`tut:키`] — 기능마다 처음 한 번만
import { persist, S } from '../game/state';
import { icon } from '../theme/tokens';
import { $, currentScreen } from './core';

export interface Step {
  /** 강조할 요소 (지금 화면 안) */
  sel: string;
  /** 설명 (줄바꿈 \n · 2줄 안쪽) */
  text: string;
  /** 마지막에 이 요소를 눌러 줄까 */
  press?: boolean;
}
/** 요소의 #stage 안 자리 (stage는 돌리고 키운 상태라 화면 좌표 대신 offset을 더함) */
export function rectIn(el: HTMLElement) {
  let x = 0;
  let y = 0;
  const stage = $('#stage');
  for (let e: HTMLElement | null = el; e && e !== stage; e = e.offsetParent as HTMLElement | null) {
    x += e.offsetLeft;
    y += e.offsetTop;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
const busy = () => !!document.querySelector('#stage .modal, #stage .notice, #stage .coach, #stage .talk, #stage .recruit');
/** 창·알림이 다 닫힌 뒤 (지금 화면이 그대로면) 한 번 */
export function whenFree(f: () => void, screen = currentScreen()) {
  let tries = 0;
  const wait = window.setInterval(() => {
    if (currentScreen() !== screen || ++tries > 120) return clearInterval(wait);
    if (busy()) return;
    clearInterval(wait);
    f();
  }, 500);
}
/** 창·알림이 다 닫힌 뒤 (지금 화면이 그대로면) 튜토리얼 한 번 */
export function coach(key: string, steps: Step[], screen = currentScreen(), onEnd?: () => void) {
  if (S.seen[`tut:${key}`]) return onEnd?.();
  whenFree(() => show(key, steps.filter((s) => document.querySelector(s.sel)), onEnd), screen);
}
function show(key: string, steps: Step[], onEnd?: () => void) {
  if (!steps.length) return onEnd?.();
  S.seen[`tut:${key}`] = true;
  persist();
  const el = document.createElement('div');
  el.className = 'coach';
  $('#stage').append(el);
  let i = 0;
  const draw = (): void => {
    const s = steps[i];
    const t = document.querySelector<HTMLElement>(s.sel);
    if (!t) return next();
    const r = rectIn(t);
    const pad = 4;
    // 손가락은 네모 아래(위쪽 절반이면) 또는 위에 · 설명은 반대쪽
    const top = r.y + r.h / 2 < $('#stage').offsetHeight / 2;
    el.innerHTML = `<i class="hole" style="left:${r.x - pad}px;top:${r.y - pad}px;width:${r.w + pad * 2}px;height:${r.h + pad * 2}px"></i>
      <i class="finger${top ? ' up' : ''}" style="left:${r.x + r.w / 2}px;top:${top ? r.y + r.h + pad : r.y - pad}px">${icon('pointer')}</i>
      <div class="ctext${top ? ' low' : ''}">${s.text.split('\n').map((x) => `<span>${x}</span>`).join('')}<small>${i + 1} / ${steps.length} · 눌러서 ${i === steps.length - 1 ? '시작' : '다음'}</small></div>`;
  };
  const next = (): void => {
    const s = steps[i];
    if (++i < steps.length) return draw();
    el.remove();
    onEnd?.();
    if (s?.press) document.querySelector<HTMLElement>(s.sel)?.click();
  };
  el.onclick = (e) => {
    e.stopPropagation();
    next();
  };
  draw();
}
