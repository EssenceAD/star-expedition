// 이정표 창 (RECOVER_1018 S5 · 영상 sheet_07 v3_018~020): 안내 NPC(public/art/npc/guide.png) 말풍선 · 장 탭 · 할 일 칸이 길처럼 이어진 사슬
//  끝낸 칸 CLEAR 도장 · 칸마다 보상 · 칸을 누르면 설명 + 바로가기 + 받기 · 모두 받기 · 새 장에 들어가면 그 장 창이 한 번 뜸(메인 지도)
import { CONFIG } from '../config';
import { CHAPTERS } from '../data/story';
import { claimMiles, milesOf, milesReady, type Milestone } from '../game/content';
import { unlocked } from '../game/stage';
import { persist, S } from '../game/state';
import { icon } from '../theme/tokens';
import { $, $$, esc, go, syncBar, toast } from './core';
import { view } from './view';

const DUST = CONFIG.content.milestoneDust;
const stateOf = (m: Milestone) => (S.miles.includes(m.id) ? 'got' : m.done(S) ? 'ready' : 'todo');
/** 안내 NPC 한마디 (장 · 남은 할 일) */
function say(c: number, left: Milestone | undefined, ready: number) {
  if (ready) return ready > 1 ? `와, 끝낸 일이 ${ready}개나 있어요! 보상을 받아 가세요.` : '끝낸 일이 있어요! 보상을 받아 가세요.';
  if (!left) return `${c}장 할 일을 모두 마쳤어요. 다음 장으로 가 볼까요?`;
  return c === 1 && left === milesOf(1)[0] ? '원정대장님, 반가워요! 제가 길을 알려 드릴게요. 아래 칸을 하나씩 따라오면 돼요.' : `다음 할 일은 「${left.name}」이에요. 칸을 누르면 바로 갈 수 있어요.`;
}

/** 이정표 창 열기 (c장 · 안 주면 지금 할 일이 있는 장) */
export function openMiles(c0?: number) {
  const open = (c: number) => c === 1 || unlocked({ c, s: 1, d: 0 });
  let c = c0 ?? CHAPTERS.find((ch) => open(ch.n) && milesOf(ch.n).some((m) => !S.miles.includes(m.id)))?.n ?? 1;
  let sel = '';
  const el = document.createElement('div');
  el.className = 'modal mwin';
  $('#stage').append(el);
  const close = () => el.remove();
  const draw = () => {
    const ms = milesOf(c);
    const ready = ms.filter((m) => stateOf(m) === 'ready');
    const left = ms.find((m) => stateOf(m) !== 'got');
    const cur = ms.find((m) => m.id === sel) ?? left ?? ms[ms.length - 1];
    el.innerHTML = `<div class="panel mw">
      <button class="btn mini mx" data-x>${icon('close')}</button>
      <div class="mguide"><img src="${import.meta.env.BASE_URL}art/npc/guide.png" alt=""><p class="say">${esc(say(c, left, ready.length))}</p></div>
      <div class="mmain">
        <div class="tabs">${CHAPTERS.map((ch) => `<button class="tab${ch.n === c ? ' on' : ''}" data-c="${ch.n}" ${open(ch.n) ? '' : 'disabled'}>${ch.n}장${milesOf(ch.n).some((m) => stateOf(m) === 'ready') ? '<em class="badge">N</em>' : ''}</button>`).join('')}</div>
        <b class="mtitle">${c}장 · ${esc(CHAPTERS[c - 1].name)} <span>${ms.filter((m) => stateOf(m) === 'got').length}/${ms.length}</span></b>
        <div class="chain">${ms.map((m, i) => `<button class="mcell ${stateOf(m)}${m === cur ? ' sel' : ''}" data-m="${m.id}"><i class="no">${i + 1}</i><span class="nm">${esc(m.name)}</span><span class="rw">${icon('stardust')}${DUST}</span>${stateOf(m) === 'got' ? '<em class="stamp">CLEAR</em>' : ''}</button>`).join('<i class="link"></i>')}</div>
        <div class="mdet"><div class="col grow"><b>${esc(cur.name)}</b><span class="dim">${esc(cur.desc)}</span></div>
          ${stateOf(cur) === 'ready' ? `<button class="btn hi" data-get>${icon('stardust')} 보상 받기</button>` : stateOf(cur) === 'todo' ? `<button class="btn" data-go>바로가기 ${icon('next')}</button>` : '<span class="gold">받았어요</span>'}</div>
        <div class="row mfoot"><span class="xs mute">칸마다 별가루 ${DUST}</span><button class="btn hi" data-all ${milesReady().length ? '' : 'disabled'}>모두 받기 (${milesReady().length})</button></div>
      </div></div>`;
    if (view.scale >= CONFIG.ui.pcWin.minScale) $('.panel', el).style.transform = `scale(${CONFIG.ui.pcWin.scale})`;
    $('[data-x]', el).onclick = close;
    $$('[data-c]', el).forEach((b) => (b.onclick = () => ((c = +b.dataset.c!), (sel = ''), draw())));
    $$('[data-m]', el).forEach((b) => (b.onclick = () => ((sel = b.dataset.m!), draw())));
    const claim = (ids?: string[]) => {
      const n = claimMiles(S, ids);
      if (!n) return;
      persist();
      syncBar();
      toast(`이정표 ${n}개 · 별가루 +${n * DUST}`);
      draw();
    };
    $('[data-get]', el)?.addEventListener('click', () => claim([cur.id]));
    $('[data-all]', el).onclick = () => claim();
    $('[data-go]', el)?.addEventListener('click', () => {
      close();
      go(cur.go[0] as never, cur.go[1]);
    });
  };
  draw();
}
