// 장비 소환 연출 (docs/PLAYTEST_1017.md §11): 마법진 → 상자 떨어져 흔들림(최고 등급 예고) → 카드 뒷면 펼침 → 한 장씩 뒤집힘 → 등급순 결과
//  그림: public/art/ui/gacha · 시간·흔들림 횟수는 CONFIG.ui.gacha · 누르면 바로 다 뒤집기 · 오른쪽 위 건너뛰기
import { CONFIG } from '../config';
import { combatSynth } from '../core/audio/combatSfx';
import { haptic } from '../core/haptic';
import type { Gear } from '../game/state';
import { icon } from '../theme/tokens';
import { $, $$ } from './core';
import { gearCell, gradeKey } from './gearui';

const G = CONFIG.ui.gacha;
const ART = `${import.meta.env.BASE_URL}art/ui/gacha/`;
const pic = (name: string, cls: string) => `<img class="${cls}" src="${ART}${name}.png" alt="">`;
const wait = (sec: number) => new Promise<void>((ok) => setTimeout(ok, sec * 1000));

/** 연출 화면을 띄움 · again = 「다시 소환」 · 닫으면 done */
export function gachaShow(gears: Gear[], again: (() => void) | null, done: () => void) {
  const best = Math.max(...gears.map((g) => g.grade));
  const bestKey = gradeKey(best);
  const el = document.createElement('div');
  el.className = `gacha best-${bestKey}`;
  el.innerHTML = `<button class="btn mini skip" data-skip>건너뛰기 ${icon('next')}</button>
    <div class="stage"><div class="floor">${pic('circle', 'circle')}</div>${pic('orb', 'orb')}</div>
    <div class="cardsg"></div><div class="fx"></div><div class="tail"></div>`;
  $('#stage').append(el);
  let skipped = false;
  let flipAll = false;
  const cards = $('.cardsg', el);
  // 두 줄로 고르게 (10연 = 5×2 · 10+1 = 6+5)
  cards.style.setProperty('--cols', String(gears.length > 5 ? Math.ceil(gears.length / 2) : gears.length));
  const fx = $('.fx', el);
  const tail = $('.tail', el);
  // 뒤집기: 등급별 터짐 · 영웅 = 보라 번개 + 흔들림 · 전설 = 금빛 기둥 + 흰 번쩍 + 반짝이 + 느리게
  const flip = async (card: HTMLElement, g: Gear) => {
    if (card.classList.contains('open')) return;
    const k = gradeKey(g.grade);
    card.classList.add('open');
    card.insertAdjacentHTML('beforeend', pic(`burst_${k}`, 'burst'));
    if (g.grade >= 3) card.insertAdjacentHTML('beforeend', pic('ribbon', 'ribbon') + '<b class="new">NEW</b>');
    if (k === 'epic') {
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      combatSynth('crit', 0.8);
      haptic('hit');
    } else if (k === 'legend') {
      fx.innerHTML = `${pic('beam_legend', 'beam')}${pic('sparkle', 'spark s1')}${pic('sparkle', 'spark s2')}<i class="white"></i>`;
      combatSynth('crit', 1);
      combatSynth('demolish', 1);
      haptic('legend');
      setTimeout(() => (fx.innerHTML = ''), 1400);
      if (!flipAll && !skipped) await wait(G.legendSlow);
    } else combatSynth('hit', 0.5);
  };
  const finish = () => {
    if (tail.innerHTML) return;
    // 결과 정리: 등급 높은 순
    const sorted = [...gears].sort((a, b) => b.grade - a.grade);
    cards.classList.add('done');
    cards.innerHTML = sorted.map((g) => `<div class="gc open g-${gradeKey(g.grade)}">${gearCell(g)}${g.grade >= 3 ? `${pic('ribbon', 'ribbon')}<b class="new">NEW</b>` : ''}</div>`).join('');
    tail.innerHTML = `${again ? '<button class="btn" data-again>다시 소환</button>' : ''}<button class="btn hi" data-ok>확인</button>`;
    $('[data-ok]', el).onclick = () => (el.remove(), done());
    const ag = el.querySelector<HTMLElement>('[data-again]');
    if (ag && again) ag.onclick = () => (el.remove(), again());
  };
  $('[data-skip]', el).onclick = (e) => {
    e.stopPropagation();
    skipped = true;
    el.classList.add('opened');
    finish();
  };
  el.onclick = () => {
    if (el.classList.contains('opened')) flipAll = true;
  };
  void (async () => {
    // 1 마법진 회전 · 빛남
    await wait(G.circleSec);
    if (skipped) return;
    // 2 상자 떨어짐 · 최고 등급만큼 흔들림 (전설은 금빛 3번 크게)
    el.classList.add('drop');
    await wait(G.dropSec);
    const shakes = G.shakes[best] ?? 1;
    for (let i = 0; i < shakes && !skipped; i++) {
      el.classList.remove('rattle');
      void el.offsetWidth;
      el.classList.add('rattle');
      combatSynth('block', 0.5 + i * 0.2);
      await wait(G.shakeSec);
    }
    if (skipped) return;
    // 3 터지며 카드 뒷면이 펼쳐짐
    el.classList.add('opened');
    combatSynth('perfect', 1);
    cards.innerHTML = gears.map((g, i) => `<div class="gc g-${gradeKey(g.grade)}" style="--i:${i}"><div class="back">${pic('card_back', 'cb')}</div><div class="face">${gearCell(g)}</div></div>`).join('');
    const els = $$('.gc', cards);
    els.forEach((c, i) => (c.onclick = (e) => (e.stopPropagation(), void flip(c, gears[i]))));
    await wait(G.spreadSec);
    // 4 한 장씩 (누르면 바로 다)
    for (let i = 0; i < els.length && !skipped; i++) {
      await flip(els[i], gears[i]);
      if (!flipAll) await wait(G.flipGap);
    }
    if (skipped) return;
    await wait(G.endWait);
    // 5 결과 정리
    finish();
  })();
}
