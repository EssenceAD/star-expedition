// 내 프로필 창 (형철 10/18): 왼쪽 위 프로필을 누르면 — 초상 바꾸기 · 이름 · 원정대 레벨 자세히(경험치 · 다음 레벨 · 행동력) · 내 기록
//  초상(acc.avatar)은 클라우드 저장에 실려 실유저 랭킹·윈드 길드에도 보임
import { CONFIG } from '../config';
import { HEROES, heroOf } from '../data/heroes';
import { accNeed, staMax } from '../game/account';
import { heroPower, owned } from '../game/heroes';
import { nextStage, stageName } from '../game/stage';
import { partyIds, persist, S } from '../game/state';
import { icon } from '../theme/tokens';
import { $, $$, esc, fmt, heroPortrait, modal, syncBar, toast } from './core';

/** 내 초상 영웅 (고른 게 없거나 없는 영웅이면 파티 대장) */
export const myAvatar = () => (S.acc.avatar && owned(S.acc.avatar) ? S.acc.avatar : (partyIds()[0] ?? 'woongs'));

/** 왼쪽 위 프로필(로비 상단 바)만 다시 그림 — 화면을 새로 그리면 프로필 창이 닫혀서 */
function syncProf() {
  const pt = document.querySelector<HTMLElement>('#topbar .prof .pt');
  if (pt) pt.style.backgroundImage = `url(${heroPortrait(myAvatar())})`;
  const nm = document.querySelector<HTMLElement>('#topbar .prof .nm');
  if (nm) nm.textContent = S.acc.name;
  syncBar();
}
export function openProfile() {
  let pick = false;
  const m = modal(`${icon('heroes')} 내 프로필`, '', [['닫기', null, true]]);
  m.classList.add('profwin');
  const body = $('.grow', m);
  const draw = () => {
    const need = accNeed(S.acc.lv);
    const pct = Math.min(100, (S.acc.exp / need) * 100);
    const ST = CONFIG.stamina;
    const mine = HEROES.filter((h) => owned(h.id));
    const power = partyIds().reduce((a, id) => a + heroPower(id), 0);
    const ns = nextStage();
    body.innerHTML = pick
      ? `<p class="sm dim">프로필 초상으로 쓸 영웅을 골라요 (가진 영웅)</p><div class="avpick">${mine.map((h) => `<button class="pt${h.id === myAvatar() ? ' on' : ''}" data-av="${h.id}" title="${esc(h.name)}" style="background-image:url(${heroPortrait(h.id)})"></button>`).join('')}</div><button class="btn mini" data-back>${icon('back')} 돌아가기</button>`
      : `<div class="row ptop"><button class="pt big" data-pick title="초상 바꾸기" style="background-image:url(${heroPortrait(myAvatar())})"><em>${icon('rotate')} 바꾸기</em></button>
          <div class="col grow"><div class="row"><input class="tab grow" data-name maxlength="10" value="${esc(S.acc.name)}"><button class="btn mini" data-rename>이름 바꾸기</button></div>
            <b class="md">원정대 Lv.${S.acc.lv} <span class="xs dim">${fmt(S.acc.exp)} / ${fmt(need)}</span></b><div class="xbar"><i style="width:${pct}%"></i></div>
            <span class="xs dim">다음 레벨까지 원정대 경험치 ${fmt(need - S.acc.exp)} (행동력 1 쓰면 경험치 1)</span></div></div>
        <div class="pgrid"><div class="panel col"><b class="sm">원정대 레벨이 오르면</b>
          <div class="kv"><span>행동력 최대</span><b>${staMax()} ${icon('next')} ${staMax() + ST.perLv}</b></div>
          <div class="kv"><span>레벨 오를 때</span><b>행동력 가득 채움</b></div>
          <div class="kv"><span>다음 레벨 경험치</span><b class="xs">${[1, 2].map((d) => `Lv.${S.acc.lv + d} ${fmt(accNeed(S.acc.lv + d - 1))}`).join(' · ')}</b></div></div>
        <div class="panel col"><b class="sm">내 기록</b>
          <div class="kv"><span>파티 전투력</span><b class="gold">${fmt(power)}</b></div>
          <div class="kv"><span>모은 영웅</span><b>${mine.length} / ${HEROES.length}</b></div>
          <div class="kv"><span>다음 스테이지</span><b>${stageName(ns)}</b></div>
          <div class="kv"><span>칭호</span><b>${S.titles.on ? esc(S.titles.on) : '없음'}</b></div></div></div>`;
    $$('[data-av]', body).forEach((b) => (b.onclick = () => {
      S.acc.avatar = b.dataset.av!;
      persist();
      toast(`프로필 초상을 ${heroOf(S.acc.avatar).name}(으)로 바꿨어요`);
      pick = false;
      draw();
      syncProf();
    }));
    body.querySelector<HTMLElement>('[data-pick]')?.addEventListener('click', () => ((pick = true), draw()));
    body.querySelector<HTMLElement>('[data-back]')?.addEventListener('click', () => ((pick = false), draw()));
    body.querySelector<HTMLElement>('[data-rename]')?.addEventListener('click', () => {
      const n = body.querySelector<HTMLInputElement>('[data-name]')!.value.trim().slice(0, 10);
      if (!n) return;
      S.acc.name = n;
      persist();
      toast('이름을 바꿨어요');
      syncProf();
    });
  };
  draw();
}
