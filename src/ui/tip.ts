// 툴팁 (형철 10/18): title이 붙은 것 = PC는 마우스를 올리면 · 폰은 길게 누르면 도트 말풍선
//  처음 만날 때 title → data-tip으로 옮겨 기본 회색 툴팁은 안 뜨게
import { $ } from './core';
import { rectIn } from './coach';

let el: HTMLDivElement | null = null;
let timer = 0;
const tipOf = (t: EventTarget | null) => {
  const x = (t as Element | null)?.closest?.<HTMLElement>('[title], [data-tip]');
  if (!x || !$('#stage').contains(x)) return null;
  if (x.hasAttribute('title')) {
    x.dataset.tip = x.getAttribute('title') ?? '';
    x.removeAttribute('title');
  }
  return x.dataset.tip ? x : null;
};
function show(x: HTMLElement) {
  hide();
  const r = rectIn(x);
  el = document.createElement('div');
  el.className = 'tip';
  el.textContent = x.dataset.tip!;
  $('#stage').append(el);
  const W = $('#stage').offsetWidth;
  const left = Math.max(4, Math.min(W - el.offsetWidth - 4, r.x + r.w / 2 - el.offsetWidth / 2));
  const top = r.y - el.offsetHeight - 6 < 4 ? r.y + r.h + 6 : r.y - el.offsetHeight - 6;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}
function hide() {
  clearTimeout(timer);
  el?.remove();
  el = null;
}
export function initTips() {
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const x = tipOf(e.target);
    if (!x) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => show(x), 350);
  });
  document.addEventListener('pointerout', (e) => e.pointerType === 'mouse' && hide());
  document.addEventListener('pointerdown', (e) => {
    hide();
    if (e.pointerType === 'mouse') return;
    const x = tipOf(e.target);
    if (x) timer = window.setTimeout(() => (show(x), (timer = window.setTimeout(hide, 2200))), 450);
  });
  document.addEventListener('pointerup', (e) => e.pointerType !== 'mouse' && el === null && clearTimeout(timer));
  document.addEventListener('pointermove', (e) => e.pointerType !== 'mouse' && !el && clearTimeout(timer));
}
