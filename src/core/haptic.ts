// 햅틱(진동) · 형철 10/18: 크게 맞을 때 · 치명타 · 승리/패배 · 강화·초월·별 · 전설 뽑기 같은 「팍!」 순간에
//  안드로이드(크롬 등) = navigator.vibrate 패턴 · 아이폰(사파리 18+) = 숨긴 스위치(<input switch>)를 눌러 「톡」 (vibrate가 없어서)
//  설정 「진동」으로 끄기 · 잦은 진동은 120ms에 한 번
import { getPref, setPref } from './save';

export type Feel = 'tap' | 'hit' | 'heavy' | 'success' | 'fail' | 'legend';
const PAT: Record<Feel, number[]> = { tap: [10], hit: [25], heavy: [45, 30, 70], success: [20, 50, 30], fail: [80], legend: [30, 40, 30, 40, 90] };
export const hapticOn = () => getPref<boolean>('haptic', true);
export const setHaptic = (on: boolean) => setPref('haptic', on);
let last = 0;
let sw: HTMLLabelElement | null = null;
/** 아이폰: 숨긴 스위치 라벨을 누르면 시스템 햅틱 한 번 */
function iosTick() {
  if (!sw) {
    const id = 'hx-switch';
    const inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.id = id;
    inp.setAttribute('switch', '');
    sw = document.createElement('label');
    sw.htmlFor = id;
    for (const el of [inp, sw]) el.style.cssText = 'position:fixed;left:-99px;top:-99px;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.append(inp, sw);
  }
  sw.click();
}
export function haptic(f: Feel) {
  if (!hapticOn()) return;
  const now = performance.now();
  if (f !== 'heavy' && f !== 'legend' && now - last < 120) return;
  last = now;
  const p = PAT[f];
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(p);
    return;
  }
  // 아이폰: 패턴의 진동 칸 수만큼 「톡」 (사이는 패턴 간격)
  let t = 0;
  p.forEach((ms, i) => {
    if (i % 2 === 0) setTimeout(iosTick, t);
    t += ms;
  });
}
