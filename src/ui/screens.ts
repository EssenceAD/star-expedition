// 타이틀 · 로비(여관) · 모험 · 전투 준비(편성) · 영웅 목록/정보 (STAR_PLAN_v2 §0-2·0-4·§1)
//  배치는 킹스레이드 문법(구조·밀도만), 꾸밈은 2단계 — 색·폰트·여백·테두리·아이콘은 전부 토큰(var / icon())
import { CONFIG } from '../config';
import { activeBonds, BONDS } from '../data/bonds';
import { HEROES, heroOf } from '../data/heroes';
import { JOBS, ZONE_NAME, ZONES, type Zone } from '../data/jobs';
import { heroStock } from '../game/shop';
import { heroShopCard } from './screensB';
import { CHAPTER_MOBS } from '../data/mobs';
import { CHAPTERS } from '../data/story';
import { accNeed, boostLeft, buyBooster, stageCost, stamina } from '../game/account';
import { freeSummonLeft } from '../game/gear';
import { buildRun, lockOf, MILESTONES, milesReady, triesText, type Run } from '../game/content';
import { runTitle } from './screensC';
import { attendPopup, dailyText, missionBadge } from './screensD';
import { eventLeft } from '../game/missions';
import { claimOffline, computeOffline } from '../game/idle';
import { heroPower, owned } from '../game/heroes';
import { buildMobs, byZone, canRepeat, diffOpen, isBoss, nextStage, recLevel, repeatBattle, stageName, starsAt, unlocked, type StageId } from '../game/stage';
import { newSave, PARTY_MAX, partyIds, persist, S, setSave } from '../game/state';
import { icon } from '../theme/tokens';
import { repeatText } from './battle';
import { $, $$, comingSoon, CUR_NAME, esc, fmt, go, heroPortrait, modal, refresh, register, starsHtml, syncBar, toast } from './core';

const C = CONFIG.story;
const partyPower = () => partyIds().reduce((a, id) => a + heroPower(id), 0);
const zoneOf = (id: string): Zone => JOBS[heroOf(id).job].zone;
const fmtTime = (sec: number) => (sec >= 3600 ? `${Math.floor(sec / 3600)}시간 ${Math.floor((sec % 3600) / 60)}분` : sec >= 60 ? `${Math.floor(sec / 60)}분 ${Math.floor(sec % 60)}초` : `${Math.ceil(sec)}초`);
/** 영웅 카드 (세로 · 왼쪽 위 위치 문장 · 오른쪽 위 레벨 · 이름 띠) */
const card = (id: string, extra = '', cls = '') => {
  const h = heroOf(id);
  const own = owned(id);
  return `<button class="btn hcard${own ? '' : ' lock'} ${cls}" data-h="${id}"><span class="zn">${icon(`zone_${zoneOf(id)}`)}</span>${own ? `<span class="lv">Lv.${S.heroes[id].lv}</span>` : ''}<div class="pt" style="background-image:url(${heroPortrait(id)})"></div><span class="nm">${h.name}</span><span class="xs dim">${JOBS[h.job].name}</span>${extra}</button>`;
};
const zoneTabs = (on: string, withUnowned = false) =>
  `<div class="tabs">${[['all', '전체'], ...ZONES.map((z) => [z, ZONE_NAME[z]]), ...(withUnowned ? [['none', '미보유']] : [])].map(([k, n]) => `<button class="tab${on === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>`;

// ───────── 타이틀 ─────────
register('title', {
  enter(root) {
    root.id = 'title';
    root.innerHTML = `<div class="logo"><small>용사님 체크인 외전</small><b>별의 원정대</b><i>(가제) · 1단계 시스템 시험판</i></div>
      <button class="btn hi big" data-go>원정 출발</button>
      <p class="tip">${S.prologue ? '이어서 하기 · 자동 저장' : '처음이면 프롤로그 다음 바로 첫 전투'}</p>
      <div class="row"><button class="btn mini" data-reset>처음부터</button></div>
      <div class="ver">v${__APP_VERSION__}</div>`;
    $('[data-go]', root).onclick = async () => {
      const { initAudioEngine } = await import('../core/audio/engine');
      initAudioEngine();
      // 첫 진입: 프롤로그(1-1 필드에서) → 1-1 전투 → 승리 → 로비 (STAR_PLAN_v2 §1-1)
      if (!S.prologue) go('battle', { stage: { c: 1, s: 1, d: 0 }, first: true });
      else go('lobby');
    };
    $('[data-reset]', root).onclick = () =>
      modal('처음부터 할까요?', '<p class="dim">이 기기에 저장된 원정대 기록이 모두 지워져요.</p>', [
        ['그만두기', null],
        ['처음부터', () => {
          setSave(newSave());
          persist();
          refresh();
          toast('새 원정대를 꾸렸어요');
        }, true],
      ]);
  },
});

// ───────── 로비 (원정대 거점 = 여관 · 킹스레이드 0-2 배치) ─────────
register('lobby', {
  title: '원정대 여관',
  enter(root) {
    root.classList.add('lobby');
    const ns = nextStage();
    const lead = partyIds()[0] ?? 'woongs';
    const bl = boostLeft();
    root.innerHTML = `
      <div class="me panel"><div class="pt" style="background-image:url(${heroPortrait(lead)})"></div><div class="col grow"><b>${S.titles.on ? `<span class="chip on">${esc(S.titles.on)}</span> ` : ''}${esc(S.acc.name)} <span class="gold">Lv.${S.acc.lv}</span></b>
        <div class="xbar"><i style="width:${Math.min(100, (S.acc.exp / accNeed(S.acc.lv)) * 100)}%"></i></div>
        <span class="xs dim">${bl ? `${icon('booster')} 부스터 ${fmtTime(bl)}` : `파티 전투력 ${fmt(partyPower())}`}</span></div></div>
      <div class="quest panel col">
        <b class="sm">${icon('mission')} 진행 중</b>
        <button class="btn qrow" data-next>${icon('adventure')} 다음: ${stageName(ns)} ${CHAPTERS[ns.c - 1].name}</button>
        <button class="btn qrow" data-mis="d">${icon('mission')} 일일 미션 ${dailyText()}${missionBadge() ? ` <em class="badge">${missionBadge()}</em>` : ''}</button>
        <button class="btn qrow" data-portal="miles">${icon('star')} 이정표 ${S.miles.length}/${MILESTONES.length}${milesReady().length ? ` <em class="badge">${milesReady().length}</em>` : ''}</button>
        <span class="sm b">${icon('star')} 이벤트</span>
        <button class="btn qrow" data-mis="ev">${CONFIG.social.event.name} ${eventLeft() ? `남은 ${eventLeft()}일` : '(끝)'}</button>
        <div class="bondl">${activeBonds(partyIds()).map((x) => `<span class="chip on">${x.name}</span>`).join('')}</div>
      </div>
      <div class="bigs">
        <button class="round" data-portal="world">${icon('world')}<span>월드 보스</span></button>
        <button class="round" data-portal="raid">${icon('raid')}<span>레이드</span></button>
        <button class="round main" data-go="adventure">${icon('adventure')}<span>모험</span></button>
      </div>
      <div class="dock">
        ${[['heroes', '영웅', 'heroes'], ['prep', '편성', 'formation'], ['portal', '콘텐츠', 'content'], ['bag', '가방', 'bag'], ['mission', '미션', 'mission'], ['mission:ach', '업적', 'achieve'], ['friends', '친구', 'friend'], ['shop', '상점', 'shop'], ['guild', '길드', 'guild'], ['ranking', '랭킹', 'ranking'], ['settings', '설정', 'settings']]
          .map(([to, n, ic]) => `<button class="dk" ${to.startsWith('soon:') ? `data-soon="${to.slice(5)}"` : to.includes(':') ? `data-mis="${to.split(':')[1]}"` : `data-go="${to}"`}>${icon(ic)}<span>${n}</span>${to === 'shop' && freeSummonLeft() ? '<em class="badge">FREE</em>' : to === 'mission' && missionBadge() ? `<em class="badge">${missionBadge()}</em>` : ''}</button>`)
          .join('')}
      </div>`;
    $$('[data-go]', root).forEach((b) => (b.onclick = () => go(b.dataset.go as never)));
    $('[data-next]', root).onclick = () => go('prep', { stage: ns });
    $$('[data-portal]', root).forEach((b) => (b.onclick = () => go('portal', { tab: b.dataset.portal })));
    $$('[data-mis]', root).forEach((b) => (b.onclick = () => go('mission', { tab: b.dataset.mis })));
    $$('[data-soon]', root).forEach((b) => (b.onclick = () => comingSoon(...(b.dataset.soon!.split('|') as [string, string]))));
    offlinePopup();
    if (!document.querySelector('.modal')) attendPopup();
  },
});
let offlineChecked = false;
/** 로비에 처음 들어올 때 한 번: 방치 보상 */
function offlinePopup() {
  if (offlineChecked) return;
  offlineChecked = true;
  const o = computeOffline();
  if (!o) return;
  const r = o.reward;
  modal(`${icon('offline')} 그동안 원정대는…`, `<p class="dim">${fmtTime(o.away)} 동안 ${stageName(o.stage)}에서 사냥했어요${o.away > o.seconds ? ` (최대 ${CONFIG.offline.maxHours}시간까지)` : ''}.</p>
    <div class="rw row">${[['gold', r.gold], ['exp', r.exp], ['enh', r.enh]].filter(([, v]) => v).map(([k, v]) => `<div class="panel col">${icon(k as string)}<span class="xs">${k === 'exp' ? '영웅 경험치' : CUR_NAME[k as string]}</span><b class="gold">+${fmt(v as number)}</b></div>`).join('')}</div>`, [
    ['모두 받기', () => {
      const ups = claimOffline(o);
      persist();
      syncBar();
      if (ups.length) toast(`레벨 업! ${ups.map((id) => heroOf(id).name).join(' · ')}`);
    }, true],
  ]);
}

// ───────── 모험: 필드 지도 (STAR_PLAN_v2 §3 · 스테이지 = 길 위 노드 · 지금 위치에 영웅 · 지도 안 토벌·상급 던전·탑 입구) ─────────
/** 노드 자리 (지도 안 %) — 왼쪽 아래에서 오른쪽 위로 굽이치는 길 */
const NODES: [number, number][] = [[6, 78], [16, 58], [27, 72], [37, 50], [46, 66], [55, 42], [64, 58], [73, 34], [82, 50], [92, 26]];
function fieldMap(c: number, d: number, sel: StageId) {
  const ns = nextStage();
  const here = ns.c === c && d === 0 ? ns.s : null;
  const lead = partyIds()[0] ?? 'woongs';
  return `<div class="fmap panel">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${NODES.map(([x, y]) => `${x},${y}`).join(' ')}" /></svg>
    ${NODES.map(([x, y], i) => {
      const id = { c, s: i + 1, d };
      const open = unlocked(id);
      return `<button class="node${isBoss(id) ? ' boss' : ''}${sel.s === i + 1 ? ' sel' : ''}${open ? '' : ' off'}" style="left:${x}%;top:${y}%" data-s="${i + 1}" ${open ? '' : 'disabled'}><b>${open ? `${c}-${i + 1}` : icon('lock')}</b>${starsHtml(starsAt(id))}</button>`;
    }).join('')}
    ${here ? `<div class="me-pin" style="left:${NODES[here - 1][0]}%;top:${NODES[here - 1][1] - 16}%"><div class="pt s" style="background-image:url(${heroPortrait(lead)})"></div></div>` : ''}
    <div class="gates"><button class="btn mini" data-portal="hunt">${icon('battle')} 토벌</button><button class="btn mini" data-portal="dungeon">${icon('bag')} 상급 던전</button><button class="btn mini" data-portal="tower">${icon('tower')} 도전의 탑</button></div>
  </div>`;
}

register('adventure', {
  title: `${icon('adventure')} 모험`,
  back: () => go('lobby', {}, false),
  enter(root, p) {
    const ns = nextStage();
    let c = (p.c as number) ?? ns.c;
    let d = (p.d as number) ?? 0;
    let sel: StageId = { c, s: (p.s as number) ?? (c === ns.c ? ns.s : 1), d };
    const draw = () => {
      sel = { ...sel, c, d };
      if (!unlocked(sel)) sel.s = 1;
      const ch = CHAPTERS[c - 1];
      const chOpen = unlocked({ c, s: 1, d });
      const rec = S.stages[`${sel.c}-${sel.s}-${sel.d}`];
      const mobs = buildMobs(sel);
      const names = [...new Set(mobs.flat().map((m) => m.name))];
      const rl = recLevel(sel);
      const myLv = Math.round(partyIds().reduce((a, id) => a + S.heroes[id].lv, 0) / Math.max(1, partyIds().length));
      root.innerHTML = `<div class="body">
          <div class="col grow">
            <div class="tabs">${CHAPTERS.map((x) => `<button class="tab${x.n === c ? ' on' : ''}" data-c="${x.n}" ${unlocked({ c: x.n, s: 1, d: 0 }) ? '' : 'disabled'}>${x.n}장</button>`).join('')}</div>
            <div class="row"><b class="grow">${c}장 · ${ch.name}${ch.waves ? '' : ' <span class="xs mute">(자리표시자)</span>'}</b>
              <div class="tabs">${C.diffName.map((n, i) => `<button class="tab${i === d ? ' on' : ''}" data-d="${i}" ${diffOpen(c, i) ? '' : 'disabled'}>${diffOpen(c, i) ? '' : icon('lock')}${n}</button>`).join('')}</div></div>
            ${chOpen ? fieldMap(c, d, sel) : `<div class="panel mute">이전 장을 깨면 열려요</div>`}
            <div class="xs mute">${ch.star} · 장을 깨면 별이 하나 다시 켜지고 지역 전설 영웅이 합류해요</div>
          </div>
          <div class="panel col side">
            <b class="b">${stageName(sel)}${isBoss(sel) ? ` · ${CHAPTER_MOBS[c - 1].boss}` : ''}</b>
            <div class="kv"><span>추천 레벨</span><b class="${myLv >= rl ? 'good' : 'bad'}">${rl} (내 평균 ${myLv})</b></div>
            <div class="kv"><span>행동력</span><b>${icon('stamina')} ${stageCost(d)}</b></div>
            <div class="kv"><span>웨이브</span><b>${mobs.length}</b></div>
            <div class="mobs">${names.map((n) => `<span class="chip">${esc(n)}</span>`).join('')}</div>
            <div class="kv"><span>별</span>${starsHtml(rec?.stars ?? 0)}</div>
            ${rec ? `<div class="kv"><span>최고 기록</span><b>${rec.bestTime}초 · 초당 ${fmt(rec.bestDps)}</b></div><div class="kv"><span>그때 MVP</span><b>${rec.mvp ? heroOf(rec.mvp).name : '-'}</b></div>` : ''}
            <div class="grow"></div>
            <button class="btn hi big" data-prep ${unlocked(sel) ? '' : 'disabled'}>전투 준비</button>
          </div>
        </div>`;
      $$('[data-c]', root).forEach((b) => (b.onclick = () => ((c = +b.dataset.c!), (sel.s = 1), draw())));
      $$('[data-d]', root).forEach((b) => (b.onclick = () => ((d = +b.dataset.d!), draw())));
      $$('[data-s]', root).forEach((b) => (b.onclick = () => ((sel.s = +b.dataset.s!), draw())));
      $$('[data-portal]', root).forEach((b) => (b.onclick = () => go('portal', { tab: b.dataset.portal })));
      $('[data-prep]', root).onclick = () => go('prep', { stage: { ...sel } });
    };
    draw();
  },
});

// ───────── 전투 준비 = 편성 (킹스레이드 0-4: 왼쪽 카드 격자 + 위치 탭 · 오른쪽 파티 4 + 부스터 + 행동력 + [반복 전투][전투 시작]) ─────────
register('prep', {
  title: (p) => (p.run ? `${icon('battle')} 전투 준비 · ${runTitle(p.run as Run)}` : p.stage ? `${icon('battle')} 전투 준비 · ${stageName(p.stage as StageId)}` : `${icon('formation')} 편성`),
  back: (p) => (p.run ? go('portal', { tab: (p.run as Run).mode }, false) : p.stage ? go('adventure', { ...(p.stage as StageId) }, false) : go('lobby', {}, false)),
  enter(root, p) {
    const st = p.stage as StageId | undefined;
    const run = p.run as Run | undefined;
    let tab = 'all';
    let rep = 10;
    const draw = () => {
      const ids = partyIds();
      const bonds = activeBonds(ids);
      const mine = HEROES.filter((h) => owned(h.id) && (tab === 'all' || zoneOf(h.id) === tab));
      const bl = boostLeft();
      const cost = st ? stageCost(st.d) : 0;
      root.innerHTML = `<div class="body">
          <div class="col grow">
            ${zoneTabs(tab)}
            <div class="roster grow scroll">${mine.map((h) => card(h.id, `<span class="xs gold">${fmt(heroPower(h.id))}</span>`, ids.includes(h.id) ? 'in' : '')).join('')}</div>
            <span class="xs mute">카드를 눌러 넣고 빼요 (최대 ${PARTY_MAX}명) · 위치(전방·중앙·후방)는 직업으로 정해지고 전투에서 그 순서로 서요 · 길게 누르면 영웅 정보</span>
          </div>
          <div class="col side">
            <div class="panel col">
              <div class="party">${[0, 1, 2, 3].map((i) => {
                const id = byZone(ids)[i];
                return id ? `<div class="pcard" data-out="${id}"><div class="pt" style="background-image:url(${heroPortrait(id)})"></div><span class="xs">${ZONE_NAME[zoneOf(id)]}</span><b class="xs">${heroOf(id).name}</b></div>` : '<div class="pcard empty"><span class="xs mute">비어 있음</span></div>';
              }).join('')}</div>
              <div class="kv"><span>파티 전투력</span><b>${fmt(partyPower())}</b></div>
              <div class="bondl">${BONDS.filter((x) => x.members.some((m) => ids.includes(m))).map((x) => `<span class="chip${bonds.includes(x) ? ' on' : ''}" title="${x.members.map((m) => heroOf(m).name).join(' · ')} (${x.need}명)">${x.name}</span>`).join('') || '<span class="xs mute">인연 없음</span>'}</div>
            </div>
            ${run ? `<div class="panel col">
              <b>${runTitle(run)}</b>
              <div class="kv"><span>오늘 남은 도전</span><b>${triesText(run) || '제한 없음'}</b></div>
              <div class="kv"><span>적</span><b>${esc(buildRun(run).waves.flat().filter((m) => m.boss)[0]?.name ?? `${buildRun(run).waves.length}웨이브`)}</b></div>
              ${run.mode === 'raid' ? `<span class="xs dim">AI 동료: ${(buildRun(run).allies ?? []).map((h) => h.def.name).join(' · ')}</span>` : ''}
              <button class="btn hi big" data-runstart ${lockOf(run) || !ids.length ? 'disabled' : ''}>전투 시작</button>
              ${lockOf(run) ? `<span class="xs bad">${esc(lockOf(run)!)}</span>` : ''}
            </div>` : ''}
            ${st ? `<div class="panel col">
              <div class="row"><span class="grow sm">${icon('booster')} 부스터 (전리품 ${CONFIG.booster.mult}배 1시간)</span><button class="btn mini${bl ? ' on' : ''}" data-boost>${bl ? fmtTime(bl) : `${icon('gold')}${fmt(CONFIG.booster.gold)}`}</button></div>
              <div class="kv"><span>행동력</span><b>${icon('stamina')} ${cost} / 보유 ${stamina()}</b></div>
              <div class="row"><select data-n class="tab">${CONFIG.repeat.choices.map((n) => `<option value="${n}" ${n === rep ? 'selected' : ''}>${n}회</option>`).join('')}</select>
                <button class="btn grow" data-repeat ${canRepeat(st) ? '' : 'disabled'} title="${canRepeat(st) ? '바로 끝나요' : '별 3개면 열려요'}">${icon('repeat')} 반복 전투</button>
                <button class="btn hi grow" data-start ${ids.length ? '' : 'disabled'}>전투 시작</button></div>
              <span class="xs mute">${canRepeat(st) ? `반복 전투 = 행동력 ${cost} × 횟수 · 바로 끝나요` : '반복 전투는 별 3개 스테이지만'}</span>
            </div>` : ''}
          </div>
        </div>`;
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab!), draw())));
      $$('[data-h]', root).forEach((b) => {
        const id = b.dataset.h!;
        let held = 0;
        b.onpointerdown = () => (held = window.setTimeout(() => ((held = -1), go('hero', { id, from: p })), 550));
        b.onpointerup = b.onpointerleave = () => held > 0 && clearTimeout(held);
        b.onclick = () => {
          if (held === -1) return;
          const at = S.party.indexOf(id);
          if (at >= 0) {
            if (S.party.length <= 1) return toast('한 명은 있어야 해요');
            S.party.splice(at, 1);
          } else {
            if (S.party.length >= PARTY_MAX) return toast(`파티는 ${PARTY_MAX}명까지 — 오른쪽에서 빼고 넣어 주세요`);
            S.party.push(id);
          }
          persist();
          draw();
        };
      });
      $$('[data-out]', root).forEach(
        (b) =>
          (b.onclick = () => {
            if (S.party.length <= 1) return toast('한 명은 있어야 해요');
            S.party = S.party.filter((x) => x !== b.dataset.out);
            persist();
            draw();
          }),
      );
      const rs = root.querySelector<HTMLElement>('[data-runstart]');
      if (rs && run) rs.onclick = () => go('battle', { run });
      if (!st) return;
      $<HTMLSelectElement>('[data-n]', root).onchange = (e) => (rep = +(e.target as HTMLSelectElement).value);
      $('[data-boost]', root).onclick = () => {
        if (!buyBooster()) return toast('금화가 모자라요');
        persist();
        syncBar();
        toast(`부스터 켬 · 전리품 ${CONFIG.booster.mult}배`);
        draw();
      };
      $('[data-start]', root).onclick = () => go('battle', { stage: { ...st } });
      $('[data-repeat]', root).onclick = () => {
        const h = repeatBattle(st, rep);
        if (!h) return toast('행동력이 모자라요');
        persist();
        syncBar();
        toast(repeatText(h));
        draw();
      };
    };
    draw();
  },
});

// ───────── 영웅 목록 (정보 화면은 screensB.ts) ─────────
register('heroes', {
  title: () => `${icon('heroes')} 영웅 (${HEROES.filter((h) => owned(h.id)).length} / ${HEROES.length})`,
  enter(root) {
    let tab = 'all';
    const draw = () => {
      const list = HEROES.filter((h) => (tab === 'all' || zoneOf(h.id) === tab) && owned(h.id));
      // 미보유: 상점과 같은 카드 · 같은 섞인 순서 (B 보강 §3)
      const unowned = `<div class="cards hcards grow scroll">${heroStock().map((h) => heroShopCard(h.id)).join('') || '<span class="mute">모든 영웅을 모았어요!</span>'}</div>`;
      root.innerHTML = `<div class="body"><div class="col grow">${zoneTabs(tab, true)}${tab === 'none' ? unowned : `<div class="roster grow scroll">${list
        .map((h) => card(h.id, owned(h.id) ? `<span class="xs gold">${fmt(heroPower(h.id))}</span>` : `<span class="xs mute">${h.joinChapter ? `${h.joinChapter}장 클리어` : '영웅 상점 (B)'}</span>`))
        .join('') || '<span class="mute">없어요</span>'}</div>`}</div></div>`;
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab!), draw())));
      $$('[data-hero]', root).forEach((b) => (b.onclick = (e) => (e.stopPropagation(), go('shop', { cat: 'hero' }))));
      $$('[data-h]', root).forEach((b) => (b.onclick = () => go('hero', { id: b.dataset.h })));
    };
    draw();
  },
});
