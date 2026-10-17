// 타이틀 · 로비(여관) · 모험 · 전투 준비(편성) · 영웅 목록/정보 (STAR_PLAN_v2 §0-2·0-4·§1)
//  배치는 킹스레이드 문법(구조·밀도만), 꾸밈은 2단계 — 색·폰트·여백·테두리·아이콘은 전부 토큰(var / icon())
import { a2hsBanner, goFullscreen } from './mobile';
import { preloadRest } from './assets';
import { CONFIG } from '../config';
import { activeBonds, BONDS } from '../data/bonds';
import { HEROES, heroOf } from '../data/heroes';
import { JOBS, ZONE_NAME, ZONES, type Zone } from '../data/jobs';
import { CHAPTER_MOBS } from '../data/mobs';
import { CHAPTERS } from '../data/story';
import { accNeed, boostLeft, buyBooster, stageCost, stamina } from '../game/account';
import { freeSummonLeft } from '../game/gear';
import { arenaOpps, autoLast, buildRun, gloryBanOf, lastParties, lockOf, MILESTONES, milesReady, triesText, validLast, type Run } from '../game/content';
import { runTitle } from './screensC';
import { lobbyLifeStart, lobbyLifeTick } from './lobbyLife';
import { attendPopup, dailyText, missionBadge } from './screensD';
import { attendToday, eventLeft } from '../game/missions';
import { claimOffline, computeOffline } from '../game/idle';
import { heroPower, owned } from '../game/heroes';
import { buildMobs, byZone, canRepeat, diffOpen, isBoss, nextStage, recLevel, repeatBattle, stageName, starsAt, unlocked, type StageId } from '../game/stage';
import { PARTY_MAX, partyIds, persist, S } from '../game/state';
import { icon, iconArt } from '../theme/tokens';
import { repeatText } from './battle';
import { $, $$, comingSoon, CUR_NAME, esc, fmt, go, heroPortrait, modal, register, rewardRow, starsHtml, syncBar, toast } from './core';
import { setBackdrop } from './view';
import { k9, kit9, kitPart } from './kit';
import { fillCards, heroCard } from './cards';

const C = CONFIG.story;
const partyPower = () => partyIds().reduce((a, id) => a + heroPower(id), 0);
const zoneOf = (id: string): Zone => JOBS[heroOf(id).job].zone;
const fmtTime = (sec: number) => (sec >= 3600 ? `${Math.floor(sec / 3600)}시간 ${Math.floor((sec % 3600) / 60)}분` : sec >= 60 ? `${Math.floor(sec / 60)}분 ${Math.floor(sec % 60)}초` : `${Math.ceil(sec)}초`);
/** 영웅 카드 = 카드 1종 (UI_KIT_1018 §7 · ui/cards.ts) · 편성은 72 폭 · 편성에 든 영웅은 체크 · 없는 영웅은 자물쇠 */
const card = (id: string, extra = '', cls = '') => heroCard(id, { w: 72, attrs: `data-h="${id}"`, cls, extra: `${cls.includes('in') ? kitPart('check', 22, 23, 'cchk') : ''}${owned(id) ? '' : kitPart('lock', 16, 24, 'clock')}${extra}` });
const zoneTabs = (on: string, withUnowned = false) => kitTabs([['all', '전체'], ...ZONES.map((z) => [z, ZONE_NAME[z]] as [string, string]), ...(withUnowned ? [['none', '미보유'] as [string, string]] : [])], on, 'data-tab', 60);

// ───────── 타이틀 (docs/UI_KIT_1018.md §3 · target_1018/title.jpg) ─────────
//  키 아트 cover · 로고(그림) 가로 380 · 위 SAFE+4 · 「바람의 원정대」 Hahmlet 19 · 「화면을 눌러 시작」 1.6초 깜빡 · 오른쪽 아래 버전 · 하늘에 별 12개 반짝
//  어디를 눌러도 시작 (처음부터는 설정 안으로)
register('title', {
  enter(root) {
    root.id = 'title';
    root.dataset.go = '';
    const T = `${import.meta.env.BASE_URL}art/ui/title/`;
    setBackdrop(`${T}key_art.jpg`);
    const stars = Array.from({ length: 12 }, () => `<i class="tw" style="left:${(4 + Math.random() * 92).toFixed(1)}%;top:${(3 + Math.random() * 42).toFixed(1)}%;animation-delay:-${(Math.random() * 2.4).toFixed(2)}s;animation-duration:${(1.6 + Math.random() * 1.6).toFixed(2)}s"></i>`).join('');
    root.innerHTML = `<div class="tt-art" style="background-image:url(${T}key_art.jpg)"></div>${stars}
      <img class="tt-logo" src="${T}logo.png" alt="W.I.N.D — Wayfarers of the Infinite Night's Dawn" draggable="false">
      <h1 class="tt-sub th">바람의 원정대</h1>
      <p class="tt-tap tx">화면을 눌러 시작</p>
      <span class="tt-ver tx">v${__APP_VERSION__}</span>`;
    a2hsBanner(root);
    root.onclick = async (e) => {
      if ((e.target as HTMLElement).closest('.a2hs')) return;
      root.onclick = null;
      goFullscreen();
      const { initAudioEngine } = await import('../core/audio/engine');
      initAudioEngine();
      // 첫 진입: 프롤로그(1-1 필드에서) → 1-1 전투 → 승리 → 로비 (STAR_PLAN_v2 §1-1)
      if (!S.prologue) go('battle', { stage: { c: 1, s: 1, d: 0 }, first: true });
      else go('lobby');
    };
  },
});

/** 지금 켜진 버프 (팀 레벨 띠 아래 아이콘 줄): 부스터 · 출석 보너스 · 이벤트 · 인연 */
function buffChips() {
  const bl = boostLeft();
  const out: string[] = [];
  if (bl) out.push(`<span class="chip on" title="부스터: 전리품 2배">${icon('booster')} ${fmtTime(bl)}</span>`);
  if (!attendToday()) out.push(`<span class="chip on" title="오늘 출석 보상을 받았어요">${icon('check')} 출석</span>`);
  if (eventLeft()) out.push(`<span class="chip on" title="${esc(CONFIG.social.event.name)}">${icon('star')} 이벤트</span>`);
  for (const x of activeBonds(partyIds())) out.push(`<span class="chip on" title="인연: ${x.members.map((m) => heroOf(m).name).join(' · ')}">${icon('heroes')} ${esc(x.name)}</span>`);
  return out.join('');
}
/** 「팀 레벨」 띠 (로비·편성 · MOBILE_REF §3-C-3): 원정대 레벨 · 경험치 % 막대 · 켜진 버프 */
export function teamBand(extra = '') {
  const p = Math.min(100, (S.acc.exp / accNeed(S.acc.lv)) * 100);
  return `<div class="tband"><div class="row"><span class="tl">팀 레벨</span><b class="lv">${S.acc.lv}</b><div class="xbar grow"><i style="width:${p}%"></i><em>${Math.floor(p)}%</em></div>${extra}</div><div class="buffs">${buffChips() || '<span class="xs mute">켜진 버프 없음</span>'}</div></div>`;
}

// ───────── 로비 (원정대 거점 = 여관 · 킹스레이드 0-2 배치) ─────────
register('lobby', {
  title: '원정대 여관',
  enter(root) {
    root.classList.add('lobby');
    const ns = nextStage();
    const lead = partyIds()[0] ?? 'woongs';
    root.innerHTML = `
      <div class="me panel"><div class="pt" style="background-image:url(${heroPortrait(lead)})"></div><div class="col grow"><b>${S.titles.on ? `<span class="chip on">${esc(S.titles.on)}</span> ` : ''}${esc(S.acc.name)} <span class="gold">Lv.${S.acc.lv}</span></b>
        ${teamBand(`<span class="xs pwr">${icon('power')} <b class="pw">${fmt(partyPower())}</b></span>`)}</div></div>
      <div class="quest panel col">
        <b class="sm">${icon('mission')} 진행 중</b>
        <button class="btn qrow" data-next>${icon('adventure')} 다음: ${stageName(ns)} ${CHAPTERS[ns.c - 1].name}</button>
        <button class="btn qrow" data-mis="d">${icon('mission')} 일일 미션 ${dailyText()}${missionBadge() ? ` <em class="badge">${missionBadge()}</em>` : ''}</button>
        <button class="btn qrow" data-portal="miles">${icon('star')} 이정표 ${S.miles.length}/${MILESTONES.length}${milesReady().length ? ` <em class="badge">${milesReady().length}</em>` : ''}</button>
        <span class="sm b">${icon('star')} 이벤트</span>
        <button class="btn qrow" data-mis="ev">${CONFIG.social.event.name} ${eventLeft() ? `남은 ${eventLeft()}일` : '(끝)'}</button>
      </div>
      <div class="bigs">
        <button class="medal" data-portal="world">${icon('world')}<span>월드 보스</span></button>
        <button class="medal" data-portal="raid">${icon('raid')}<span>레이드</span></button>
        <button class="medal main" data-go="adventure">${icon('adventure')}<span>모험</span></button>
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
    lobbyLifeStart();
    // 로비가 뜬 뒤: 나머지 영웅 시트를 뒤에서 천천히 (SPRITE_RES §C)
    preloadRest();
  },
  tick: (dt) => lobbyLifeTick(dt),
});
let offlineChecked = false;
/** 로비에 처음 들어올 때 한 번: 방치 보상 */
function offlinePopup() {
  if (offlineChecked) return;
  offlineChecked = true;
  const o = computeOffline();
  if (!o) return;
  const r = o.reward;
  // 보상 = 등급 받침 줄 (팝업 1종 · 예전엔 결과 화면 CSS가 섞여 글씨 40px · 가로 스크롤이 나던 화면 · AUDIT_1018 B1)
  modal('그동안 원정대는…', `<p>${fmtTime(o.away)} 동안 ${stageName(o.stage)}에서 사냥했어요${o.away > o.seconds ? ` (최대 ${CONFIG.offline.maxHours}시간까지)` : ''}.</p>
    ${rewardRow(([['gold', r.gold], ['exp', r.exp], ['enh', r.enh]] as [string, number][]).filter(([, v]) => v).map(([k, v]) => [iconArt(k) ?? '', k === 'enh' ? 'rare' : 'common', `+${fmt(v)}`, k === 'exp' ? '영웅 경험치' : CUR_NAME[k]]))}`, [
    ['모두 받기', () => {
      const ups = claimOffline(o);
      persist();
      syncBar();
      if (ups.length) toast(`레벨 업! ${ups.map((id) => heroOf(id).name).join(' · ')}`);
    }, true],
  ]);
}

// ───────── 모험: 필드 지도 (STAR_PLAN_v2 §3 · 스테이지 = 길 위 노드 · 지금 위치에 영웅 · 지도 안 토벌·상급 던전·탑 입구) ─────────
/** 노드 자리 (지도 그림 map.jpg 안 % · 그림의 길 위) — 왼쪽 아래 항구에서 다리를 건너 오른쪽 위 폐성(보스)까지 */
const NODES: [number, number][] = [[18, 78], [30, 68], [37, 58], [47, 55], [57, 48], [63, 39], [69, 34], [77, 31], [83, 23], [87, 16]];
function fieldMap(c: number, d: number, sel: StageId) {
  const ns = nextStage();
  const here = ns.c === c && d === 0 ? ns.s : null;
  const lead = partyIds()[0] ?? 'woongs';
  return `<div class="fmap panel"><div class="fmap-in" style="background-image:url(${import.meta.env.BASE_URL}art/screens/map.jpg)">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${NODES.map(([x, y]) => `${x},${y}`).join(' ')}" /></svg>
    ${NODES.map(([x, y], i) => {
      const id = { c, s: i + 1, d };
      const open = unlocked(id);
      // 둥근 메달: 깬 곳 금 · 지금 갈 곳 파랑 빛 · 잠김 회색 자물쇠 · 아래 별 3개 (PLAYTEST §8)
      const st = !open ? 'off' : starsAt(id) > 0 ? 'done' : 'now';
      return `<button class="node ${st}${isBoss(id) ? ' boss' : ''}${sel.s === i + 1 ? ' sel' : ''}" style="left:${x}%;top:${y}%" data-s="${i + 1}" ${open ? '' : 'disabled'}><b>${open ? `${c}-${i + 1}` : icon('lock')}</b>${open ? starsHtml(starsAt(id)) : ''}</button>`;
    }).join('')}
    ${here ? `<div class="me-pin" style="left:${NODES[here - 1][0]}%;top:${NODES[here - 1][1] - 12}%"><div class="pt s" style="background-image:url(${heroPortrait(lead)})"></div></div>` : ''}
    </div><div class="gates"><button class="btn mini" data-portal="hunt">${icon('battle')} 토벌</button><button class="btn mini" data-portal="dungeon">${icon('bag')} 상급 던전</button><button class="btn mini" data-portal="tower">${icon('tower')} 도전의 탑</button></div>
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
      // 몬스터 칩 = 얼굴(대기 첫 칸 그림) + 이름
      const faces = [...new Map(mobs.flat().map((m) => [m.name, m.kind.anims.idle!.frames[0].replace(':', '/') + '.png'])).entries()];
      const rl = recLevel(sel);
      const myLv = Math.round(partyIds().reduce((a, id) => a + S.heroes[id].lv, 0) / Math.max(1, partyIds().length));
      root.innerHTML = `<div class="body">
          <div class="col grow">
            <div class="tabs">${CHAPTERS.map((x) => `<button class="tab${x.n === c ? ' on' : ''}" data-c="${x.n}" ${unlocked({ c: x.n, s: 1, d: 0 }) ? '' : 'disabled'}>${x.n}장</button>`).join('')}</div>
            <div class="row"><b class="grow">${c}장 · ${ch.name}${ch.waves ? '' : ' <span class="xs mute">(자리표시자)</span>'}</b>
              <div class="tabs">${C.diffName.map((n, i) => `<button class="tab${i === d ? ' on' : ''}" data-d="${i}" ${diffOpen(c, i) ? '' : 'disabled'}>${diffOpen(c, i) ? '' : icon('lock')}${n}</button>`).join('')}</div></div>
            ${chOpen ? fieldMap(c, d, sel) : `<div class="panel mute">이전 장을 깨면 열려요</div>`}
            <div class="xs mute note">${ch.star} · 장을 깨면 별이 하나 다시 켜지고 지역 전설 영웅이 합류해요</div>
          </div>
          <div class="panel col side">
            <b class="b">${stageName(sel)}${isBoss(sel) ? ` · ${CHAPTER_MOBS[c - 1].boss}` : ''}</b>
            <div class="kv"><span>추천 레벨</span><b class="${myLv >= rl ? 'good' : 'bad'}">${rl} (내 평균 ${myLv})</b></div>
            <div class="kv"><span>행동력</span><b>${icon('stamina')} ${stageCost(d)}</b></div>
            <div class="kv"><span>웨이브</span><b>${mobs.length}</b></div>
            <div class="mobs">${faces.map(([n, f]) => `<span class="chip mob"><i style="background-image:url(${import.meta.env.BASE_URL}art/${f})"></i>${esc(n)}</span>`).join('')}</div>
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
/** 영광의 리그 밴픽 패널: 상대 영웅 하나 막기 · 상대가 막는 내 영웅 · 대신 들어갈 영웅 */
function gloryHtml(run: Run, ban: string, swap: string) {
  const opp = arenaOpps()[run.sub ?? 0];
  const strong = [...opp.party].sort((a, b) => b.st.atk - a.st.atk)[0].def.id;
  const myBan = gloryBanOf();
  const bench = HEROES.filter((h) => owned(h.id) && !partyIds().includes(h.id)).sort((a, b) => heroPower(b.id) - heroPower(a.id)).slice(0, 8);
  return `<div class="col banpick"><b class="sm">밴픽 — 상대 영웅 1명 막기</b>
    <div class="row">${opp.party.map((h) => `<button class="pcard${(ban || strong) === h.def.id ? ' ban' : ''}" data-ban="${h.def.id}" title="${esc(h.def.name)}"><div class="pt" style="background-image:url(${heroPortrait(h.def.id)})"></div><b class="xs">${esc(h.def.name)}</b>${(ban || strong) === h.def.id ? `<em class="xs bad">${icon('lock')} 금지</em>` : ''}</button>`).join('')}</div>
    <span class="xs dim">${ban ? '직접 골랐어요' : '안 고르면 가장 센 영웅을 막아요'} · 상대는 내 <b class="bad">${esc(heroOf(myBan).name)}</b>을(를) 막아요</span>
    <b class="sm">대신 들어갈 영웅 ${swap ? `· ${esc(heroOf(swap).name)}` : '(안 고르면 3명으로)'}</b>
    <div class="row wrap">${bench.map((h) => `<button class="pt s${swap === h.id ? ' on' : ''}" data-swap="${h.id}" title="${esc(h.name)}" style="background-image:url(${heroPortrait(h.id)})"></button>`).join('') || '<span class="xs mute">파티 밖 영웅이 없어요</span>'}</div></div>`;
}
/** 최후의 리그 파티 2·3 요약 */
function lastHtml() {
  const ps = lastParties();
  return `<div class="col"><b class="sm">최후의 리그 파티 3개 ${validLast(S.arena.parties) ? '(직접 편성)' : '(자동)'}</b>${ps.map((p, i) => `<div class="row"><span class="xs dim">파티 ${i + 1}</span>${p.map((id) => `<div class="pt s" title="${esc(heroOf(id).name)}" style="background-image:url(${heroPortrait(id)})"></div>`).join('')}</div>`).join('')}<button class="btn" data-lastform>${icon('formation')} 파티 2·3 편성</button></div>`;
}
/** 최후의 리그 파티 2·3 직접 편성 창 (파티 1 = 지금 편성) */
function lastForm(done: () => void) {
  let ps = validLast(S.arena.parties) ? S.arena.parties.map((p) => [...p]) : autoLast().map((p) => [...p]);
  let at = 0;
  const m = modal(`${icon('formation')} 최후의 리그 · 파티 2·3`, '<div data-lf></div>', [
    ['자동 채우기', () => ((ps = autoLast().map((p) => [...p])), draw(), false)],
    ['저장', () => {
      S.arena.parties = ps;
      persist();
      done();
    }, true],
  ]);
  const draw = () => {
    const bench = HEROES.filter((h) => owned(h.id) && !partyIds().includes(h.id)).sort((a, b) => heroPower(b.id) - heroPower(a.id));
    $('[data-lf]', m).innerHTML = `<div class="row">${ps.map((p, i) => `<button class="panel col lfp${i === at ? ' on' : ''}" data-at="${i}"><b class="sm">파티 ${i + 2}</b><div class="row">${[0, 1, 2, 3].map((k) => (p[k] ? `<div class="pt s" data-rm="${p[k]}" title="${esc(heroOf(p[k]).name)}" style="background-image:url(${heroPortrait(p[k])})"></div>` : '<div class="pt s empty"></div>')).join('')}</div></button>`).join('')}</div>
      <span class="xs mute">파티 1은 지금 편성 파티 · 파티를 고르고 아래 영웅을 눌러 넣어요 (넣은 영웅을 다시 누르면 빠짐) · 4명까지</span>
      <div class="roster scroll lfr">${bench.map((h) => card(h.id, '', ps.flat().includes(h.id) ? 'in' : '')).join('') || '<span class="mute">파티 밖 영웅이 없어요</span>'}</div>`;
    fillCards(m);
    $$('[data-at]', m).forEach((b) => (b.onclick = () => ((at = +b.dataset.at!), draw())));
    $$('.lfr [data-h]', m).forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.h!;
          const where = ps.findIndex((p) => p.includes(id));
          if (where >= 0) ps[where] = ps[where].filter((x) => x !== id);
          else if (ps[at].length >= 4) return toast('한 파티는 4명까지');
          else ps[at].push(id);
          draw();
        }),
    );
  };
  draw();
}

register('prep', {
  title: (p) => (p.run ? `${icon('battle')} 전투 준비 · ${runTitle(p.run as Run)}` : p.stage ? `${icon('battle')} 전투 준비 · ${stageName(p.stage as StageId)}` : `${icon('formation')} 편성`),
  back: (p) => (p.run ? go('portal', { tab: (p.run as Run).mode }, false) : p.stage ? go('adventure', { ...(p.stage as StageId) }, false) : go('lobby', {}, false)),
  enter(root, p) {
    const st = p.stage as StageId | undefined;
    const run = p.run as Run | undefined;
    let tab = 'all';
    let rep = 10;
    // 영광의 리그 밴픽 (직접 고르기)
    let ban = '';
    let swap = '';
    const draw = () => {
      const ids = partyIds();
      const bonds = activeBonds(ids);
      const mine = HEROES.filter((h) => owned(h.id) && (tab === 'all' || zoneOf(h.id) === tab));
      // 빈 땅이 안 남게: 아직 없는 영웅을 흐리게(자물쇠) 뒤에 채움 · 누르면 상점 영웅 칸으로 (docs/SCREENS_1017.md)
      const notMine = HEROES.filter((h) => !owned(h.id) && (tab === 'all' || zoneOf(h.id) === tab));
      const bl = boostLeft();
      const cost = st ? stageCost(st.d) : 0;
      root.innerHTML = `<div class="body">
          <div class="col grow">
            ${zoneTabs(tab)}
            <div class="roster grow scroll">${mine.map((h) => card(h.id, '', ids.includes(h.id) ? 'in' : '')).join('')}${notMine.map((h) => card(h.id).replace('data-h=', 'data-lk=')).join('')}</div>
            <span class="xs mute">카드를 눌러 넣고 빼요 (최대 ${PARTY_MAX}명) · 위치(전방·중앙·후방)는 직업으로 정해지고 전투에서 그 순서로 서요 · 길게 누르면 영웅 정보</span>
          </div>
          <div class="col side">
            <div class="panel col">
              ${teamBand()}
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
              ${run.mode === 'arena' && run.arg === 'glory' ? gloryHtml(run, ban, swap) : ''}
              ${run.mode === 'arena' && run.arg === 'last' ? lastHtml() : ''}
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
      fillCards(root);
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
      $$('[data-lk]', root).forEach((b) => (b.onclick = () => go('shop', { cat: 'hero' })));
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
      if (rs && run) rs.onclick = () => go('battle', { run: run.arg === 'glory' ? { ...run, ban: ban || undefined, swap: swap || undefined } : run });
      $$('[data-ban]', root).forEach((b) => (b.onclick = () => ((ban = b.dataset.ban!), draw())));
      $$('[data-swap]', root).forEach((b) => (b.onclick = () => ((swap = swap === b.dataset.swap ? '' : b.dataset.swap!), draw())));
      const lf = root.querySelector<HTMLElement>('[data-lastform]');
      if (lf) lf.onclick = () => lastForm(draw);
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

// ───────── 영웅 목록 (UI_KIT_1018 §7 · target_1018/heroes.jpg) — 정보 화면은 screensB.ts ─────────
//  위: back 30 · title_ribbon 160×34 「영웅」 · 탭 tab_on/off 68×26 × 5 (전체·전사·궁수·마법사·사제) · 카드 92×190 (x = SAFE+8 + k·101, y 78) · 아래로 스크롤
//  없는 영웅은 가진 영웅 뒤에 흐리게(자물쇠) · 누르면 미리보기
const CLASS_TABS: [string, string, string[]][] = [['all', '전체', []], ['warrior', '전사', ['knight', 'warrior', 'fighter', 'assassin']], ['archer', '궁수', ['archer', 'engineer']], ['mage', '마법사', ['mage']], ['priest', '사제', ['priest', 'druid']]];
export const kitTabs = (tabs: [string, string][], on: string, attr = 'data-tab', w = 68) =>
  `<div class="ktabs">${tabs.map(([k, n]) => `<button class="ktab${k === on ? ' on' : ''}" ${attr}="${k}" style="width:${w}px;${k9(k === on ? 'tab_on' : 'tab_off', 12)}"><span class="tx">${n}</span></button>`).join('')}</div>`;
register('heroes', {
  enter(root) {
    let tab = 'all';
    root.classList.add('kscr');
    const draw = () => {
      const jobs = CLASS_TABS.find(([k]) => k === tab)![2];
      const fits = (id: string) => !jobs.length || jobs.includes(heroOf(id).job);
      const mine = HEROES.filter((h) => owned(h.id) && fits(h.id)).sort((a, b) => (S.heroes[b.id].star ?? 1) - (S.heroes[a.id].star ?? 1) || heroPower(b.id) - heroPower(a.id));
      const rest = HEROES.filter((h) => !owned(h.id) && fits(h.id));
      root.innerHTML = `<div class="kbg" style="background-image:url(${import.meta.env.BASE_URL}art/ui/bg/lobby_town.jpg)"></div>
        <button class="kback" data-back title="뒤로">${kitPart('back', 30, 30)}</button>
        ${kit9('title_ribbon', 160, 34, 16, 'kttl', '', `<span class="th">영웅</span><small class="tx">${HEROES.filter((h) => owned(h.id)).length}/${HEROES.length}</small>`)}
        ${kitTabs(CLASS_TABS.map(([k, n]) => [k, n]), tab)}
        <div class="hgrid">${[...mine, ...rest].map((h) => heroCard(h.id, { attrs: `data-h="${h.id}"`, extra: owned(h.id) ? `<span class="tx clv">Lv.${S.heroes[h.id].lv}</span>` : kitPart('lock', 20, 30, 'clock') })).join('') || '<span class="tx">없어요</span>'}</div>`;
      fillCards(root);
      $('[data-back]', root).onclick = () => go('lobby', {}, false);
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab!), draw())));
      $$('[data-h]', root).forEach((b) => (b.onclick = () => go('hero', { id: b.dataset.h })));
    };
    draw();
  },
});
