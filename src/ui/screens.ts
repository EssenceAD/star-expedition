// 타이틀 · 로비(여관) · 모험 · 전투 준비(편성) · 영웅 목록/정보 (STAR_PLAN_v2 §0-2·0-4·§1)
//  배치는 킹스레이드 문법(구조·밀도만), 꾸밈은 2단계 — 색·폰트·여백·테두리·아이콘은 전부 토큰(var / icon())
import { a2hsBanner, goFullscreen } from './mobile';
import { preloadRest } from './assets';
import { CONFIG } from '../config';
import { activeBonds, BONDS } from '../data/bonds';
import { HEROES, heroOf } from '../data/heroes';
import { JOBS, ZONE_NAME, ZONES, type Zone } from '../data/jobs';
import { heroStock } from '../game/shop';
import { restBonus } from '../game/social';
import { heroShopCard } from './screensB';
import { CHAPTER_MOBS } from '../data/mobs';
import { CHAPTERS } from '../data/story';
import { accNeed, boostLeft, boostMult, buyBooster, stageCost, stamina } from '../game/account';
import { freeSummonLeft } from '../game/gear';
import { arenaOpps, autoLast, buildRun, gloryBanOf, lastParties, lockOf, milesReady, nextMile, triesText, validLast, type Run } from '../game/content';
import { openMiles } from './milestones';
import { playNotices } from './notice';
import { runTitle } from './screensC';
import { view } from './view';
import { mainMapStart, mainMapTick, mapUrl, nodesOf } from './mainMap';
import { attendPopup, missionBadge } from './screensD';
import { attendToday, eventToday } from '../game/missions';
import { claimOffline, computeOffline } from '../game/idle';
import { heroPower, join, owned } from '../game/heroes';
import { baseReward, buildMobs, byZone, canRepeat, diffOpen, isBoss, nextStage, recLevel, repeatBattle, stageName, starsAt, taperAt, unlocked, type StageId } from '../game/stage';
import { newSave, PARTY_MAX, partyIds, persist, S, setSave } from '../game/state';
import { icon } from '../theme/tokens';
import { repeatAsk, repeatText } from './battle';
import { coach, whenFree } from './coach';
import { ready as audioReady } from '../core/audio/engine';
import { openReport, opsOnLobby } from './ops';
import { recruitShow } from './screensB';
import { $, $$, CUR_NAME, esc, fitText, fmt, go, heroPortrait, modal, refresh, register, starsHtml, syncBar, toast } from './core';

const C = CONFIG.story;
const partyPower = () => partyIds().reduce((a, id) => a + heroPower(id), 0);
const zoneOf = (id: string): Zone => JOBS[heroOf(id).job].zone;
/** 인연 설명 (편성 화면 칩을 누르면 · 형철 10/18): 멤버 · 몇 명 · 효과 */
const BOND_EFF: Record<string, string> = { spd: '공격 속도', dmgCut: '받는 피해 감소', mana: '마나 회복', skillDmg: '스킬 피해', atk: '공격력', heal: '회복량', crit: '치명타 확률' };
const bondText = (x: (typeof BONDS)[number]) => `${x.name} · ${x.members.map((m) => heroOf(m).name).join('·')} 중 ${x.need}명 · ${BOND_EFF[x.eff.s]} +${Math.round(x.eff.v * 100)}%${x.walkCut ? ' · 첫 이동 빨라짐' : ''}`;
const fmtTime = (sec: number) => (sec >= 3600 ? `${Math.floor(sec / 3600)}시간 ${Math.floor((sec % 3600) / 60)}분` : sec >= 60 ? `${Math.floor(sec / 60)}분 ${Math.floor(sec % 60)}초` : `${Math.ceil(sec)}초`);
/** 영웅 카드 (세로 · 오른쪽 위 레벨 · 아래 위치·직업 칩(상점 카드와 같은 모양) · 이름 · 전투력) */
const card = (id: string, extra = '', cls = '') => {
  const h = heroOf(id);
  const own = owned(id);
  return `<button class="btn hcard${own ? '' : ' lock'} ${cls}" data-h="${id}">${S.fresh?.includes(id) ? '<span class="newh">NEW HERO</span>' : ''}${own ? `<span class="lv chip">Lv.${S.heroes[id].lv}</span>` : ''}<div class="pt" style="background-image:url(${heroPortrait(id)})"></div><div class="row xs chips"><span class="chip">${icon(`zone_${JOBS[h.job].zone}`)} ${ZONE_NAME[JOBS[h.job].zone]}</span><span class="chip">${icon(h.job)} ${JOBS[h.job].name}</span></div><span class="nm fit" data-min="${CONFIG.ui.fit.name}">${h.name}</span>${extra}</button>`;
};
const zoneTabs = (on: string, withUnowned = false) =>
  `<div class="tabs">${[['all', '전체'], ...ZONES.map((z) => [z, ZONE_NAME[z]]), ...(withUnowned ? [['none', '미보유']] : [])].map(([k, n]) => `<button class="tab${on === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>`;

// ───────── 타이틀 ─────────
register('title', {
  enter(root) {
    root.id = 'title';
    // 타이틀 (UI_KIT_1018 §2·§3 · 형철 스케치 10/18): 광원 뺀 키아트 + 가운데 도트 로고 W.I.N.D + 오른쪽 아래 「바람의 원정대」 + 아래 작은 풀네임 · 화면을 눌러 시작
    root.innerHTML = `<div class="logo"><div class="lw"><img class="wind px" src="${import.meta.env.BASE_URL}art/ui2/logo.png" alt="W.I.N.D 바람의 원정대"><b class="kr">바람의 원정대</b></div><small class="full">Wayfarers of the Infinite Night's Dawn</small></div>
      <i class="twinkle">${Array.from({ length: 12 }, (_, i) => `<b style="--i:${i};left:${6 + i * 7.8}%;top:${4 + ((i * 37) % 23)}%"></b>`).join('')}</i>
      <button class="tapgo" data-go>${S.prologue ? '화면을 눌러 이어서 하기' : '화면을 눌러 시작'}</button>
      <div class="tpanel"><button class="btn mini" data-reset>처음부터</button></div>
      <div class="ver">v${__APP_VERSION__}</div>`;
    a2hsBanner(root);
    // 소리는 첫 터치에야 열려서: 소리가 잠긴 채 들어왔으면 첫 터치 = 타이틀 곡(24) 시작, 두 번째 터치 = 출발
    let hold = !audioReady();
    $('[data-go]', root).onclick = async () => {
      goFullscreen();
      if (hold) {
        hold = false;
        $('[data-go]', root).textContent = '한 번 더 누르면 출발!';
        return;
      }
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

// ───────── 메인 = 모험 지도 (RECOVER_1018 S1·S2 배치 · 킹스레이드 영상 그대로) ─────────
//  지도 위 길 따라 노드(메달 + 번호판 + 별 3개) · 다음 노드에 원정대장이 서고 화살표가 통통 · 보스 노드에 장 보스
//  왼쪽 위 진행 중 2줄(이정표 · 스토리) · 왼쪽 세로 미션·이벤트·출석 · 아래 메뉴 6 + 포탈 · 오른쪽 아래 전투 준비 · 위 가운데 장 이름(누르면 모험)
/** 감춘 가이드 말풍선 (이정표 id · 이번 실행 동안) */
const guideOff = new Set<string>();
const sideBtn = (attr: string, ic: string, name: string, badge: string | number = '') => `<button class="sic" ${attr}>${icon(ic)}<span>${name}</span>${badge ? `<em class="badge">${badge}</em>` : ''}</button>`;
register('lobby', {
  title: () => `<span class="prof"><span class="pf"><i class="pt" style="background-image:url(${heroPortrait(partyIds()[0] ?? 'woongs')})"></i></span><span class="col"><b><em>Lv.${S.acc.lv}</em> ${esc(S.acc.name)}</b><span class="xbar"><i style="width:${Math.min(100, (S.acc.exp / accNeed(S.acc.lv)) * 100)}%"></i></span></span><span class="pwr">${icon('power')}<b>${fmt(partyPower())}</b></span></span>`,
  enter(root) {
    root.classList.add('mainmap');
    const ns = nextStage();
    const { c, d } = ns;
    const ch = CHAPTERS[c - 1];
    const lead = partyIds()[0] ?? 'woongs';
    const NODES = nodesOf(c);
    const stars = NODES.reduce((a, _, i) => a + starsAt({ c, s: i + 1, d }), 0);
    const mile = nextMile();
    const ready = milesReady().length;
    const nodes = NODES.map(([x, y], i) => {
      const id = { c, s: i + 1, d };
      const open = unlocked(id);
      const st = !open ? 'off' : starsAt(id) > 0 ? 'done' : 'now';
      // 다음 노드 화살표: 메달 바로 위 · 그 노드에 원정대장(장 첫 노드)이 서 있으면 그 머리 위 (보스는 오른쪽 뒤로 비켜 서서 메달 위가 비어 있음)
      const fig = i === 0 && ns.s === 1 ? CONFIG.ui.mainMap.leadH : 0;
      // 메달·번호판·별 = 그림만 (public/art/ui/map · 형철 10/18 ③④) · 보스는 node_boss 1.3배
      return `<button class="mnode ${st}${isBoss(id) ? ' boss' : ''}" style="left:${x}%;top:${y}%" data-s="${i + 1}" ${open ? '' : 'disabled'}>${st === 'now' ? `<i class="arw"${fig ? ` style="top:-${fig + CONFIG.ui.mainMap.figPad + 20}px"` : ''}>${icon('pointer')}</i>` : ''}${nodeHtml(id, open, st)}</button>`;
    }).join('');
    root.innerHTML = `<div class="mview pan"><div class="mlayer"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${NODES.map(([x, y]) => `${x},${y}`).join(' ')}" /></svg>${nodes}</div></div>
      <div class="mhud">
        <button class="mch" data-go="adventure"><b>${c}장 · ${esc(ch.name)}</b>${icon('star')}<span>${stars}/${NODES.length * 3}</span><i class="dn">${icon('pointer')}</i></button>
        <div class="mquest">
          <button class="mq mile${ready ? ' ready' : ''}" data-miles><span class="mqh"><em class="tag mile">${icon('pointer')} 다음 할 일 · 이정표</em>${ready ? `<em class="badge">${ready}</em>` : ''}</span><b>${mile ? esc(mile.name) : '모두 달성'}</b>${mile ? `<span class="mqd">${ready ? '보상을 받을 수 있어요 · 눌러서 받아요' : esc(mile.desc)}</span>` : ''}</button>
          <button class="mq" data-next><em class="tag story">스토리</em>${stageName(ns)} 클리어</button>
        </div>
        <div class="mside">
          ${sideBtn('data-go="mission"', 'mission', '미션', missionBadge())}
          ${sideBtn('data-mis="ev"', 'event', '이벤트', eventToday() ? 'N' : '')}
          ${sideBtn('data-attend', 'attend', '출석', attendToday() ? 'N' : '')}
        </div>
        <div class="mdock">
          ${[['heroes', '영웅', 'heroes'], ['prep', '편성', 'formation'], ['bag', '가방', 'bag'], ['shop', '상점', 'shop'], ['friends', '친구', 'friend'], ['guild', '길드', 'guild'], ['world', '포탈', 'content']]
            .map(([to, n, ic]) => `<button class="dk" data-go="${to}">${icon(ic)}<span>${n}</span>${to === 'shop' && freeSummonLeft() ? '<em class="badge">FREE</em>' : ''}${to === 'heroes' && S.fresh?.length ? '<em class="badge">N</em>' : ''}</button>`)
            .join('')}
        </div>
        <button class="mgo btn hi" data-next>${icon('battle')}<span>전투 준비</span></button>
        <div class="mmenu panel col" hidden>
          ${[['mission', 'ach', '업적', 'achieve'], ['ranking', '', '랭킹', 'ranking'], ['mail', '', '우편', 'mail'], ['settings', '', '설정', 'settings']].map(([to, tab, n, ic]) => `<button class="btn qrow" data-go="${to}"${tab ? ` data-tab="${tab}"` : ''}>${icon(ic)} ${n}</button>`).join('')}<button class="btn qrow" data-report>${icon('mail')} 제보·건의</button>
        </div>
      </div>`;
    $$('[data-go]', root).forEach((b) => (b.onclick = () => go(b.dataset.go as never, b.dataset.tab ? { tab: b.dataset.tab } : {})));
    $$('[data-next]', root).forEach((b) => (b.onclick = () => go('prep', { stage: ns, from: 'lobby' })));
    $$('[data-s]', root).forEach((b) => (b.onclick = () => stageInfo({ c, s: +b.dataset.s!, d })));
    $$('[data-portal]', root).forEach((b) => (b.onclick = () => go('portal', { tab: b.dataset.portal })));
    $$('[data-mis]', root).forEach((b) => (b.onclick = () => go('mission', { tab: b.dataset.mis })));
    $('[data-miles]', root).onclick = () => openMiles();
    $('[data-report]', root).onclick = () => void openReport();
    opsOnLobby();
    // 가이드 화살표 (형철 10/18): 다음 이정표를 하러 갈 버튼 위에 「여기를 눌러요」 말풍선 · 누르면 그 탭으로 바로
    const gd = mile && !mile.done(S) && !guideOff.has(mile.id) ? mile.go : null;
    // 스테이지 깨기(prep)는 오른쪽 아래 「전투 준비」 위에
    const gb = gd && root.querySelector<HTMLElement>(gd[0] === 'prep' ? '.mgo' : gd[0] === 'portal' ? '.mdock [data-go="world"]' : `.mdock [data-go="${gd[0]}"], .mside [data-go="${gd[0]}"]`);
    if (gd && gb) {
      gb.classList.add('guide');
      gb.insertAdjacentHTML('beforeend', `<i class="gbub" title="눌러서 감추기"><mark class="gtx">「${esc(mile!.name)}」<br>여기를 눌러요</mark>${icon('pointer')}</i>`);
      // 말풍선을 누르면 이 할 일 안내는 감춤 (다음 할 일이 되면 다시 · 앱을 다시 켜면 다시)
      $('.gbub', gb).onclick = (e) => (e.stopPropagation(), guideOff.add(mile!.id), gb.classList.remove('guide'), (e.currentTarget as HTMLElement).remove());
      // 전투 준비는 원래대로(다음 스테이지) · 나머지는 이정표가 가리키는 탭으로
      if (gd[0] !== 'prep') gb.onclick = () => go(gd[0] as never, gd[1]);
    }
    // 출석: 7일 보상 판 화면으로 (오늘 몇 일째 · 앞으로 받을 보상 미리 보기)
    $('[data-attend]', root).onclick = () => go('mission', { tab: 'att' });
    mainMapStart($('.mlayer', root), c, lead, ns.s);
    offlinePopup();
    if (!document.querySelector('.modal')) attendPopup();
    // 새 장에 처음 들어오면 그 장 이정표 창을 한 번 (S5) · 첫 진입(프롤로그 직후)은 1장부터
    if (!document.querySelector('.modal') && !S.seen[`miles:${c}`]) {
      S.seen[`miles:${c}`] = true;
      persist();
      openMiles(c);
    }
    // 휴식 보너스: 못 들어온 날만큼 우편으로
    const rested = restBonus();
    if (rested) (persist(), toast(`${rested}일 만이에요! 휴식 보너스를 우편함에 넣었어요`));
    // 전투에서 쌓인 알림 카드 (S4)
    playNotices();
    // 기능 열림 튜토리얼 (S6): 진도에 맞는 것 하나만 · 창·알림이 다 닫힌 뒤
    const did = (c2: number, s2: number) => starsAt({ c: c2, s: s2, d: 0 }) > 0;
    const TH = CONFIG.start.tutorialHero;
    // 튜토리얼 보상: 1-1을 깨면 따뜻한밤 합류 (빠밤~ 영입 무대) → 로비로 돌아와 이어서 안내
    if (did(1, 1) && !S.heroes[TH] && !S.seen['tut:warm']) {
      whenFree(() => {
        S.seen['tut:warm'] = true;
        join(TH);
        persist();
        toast('튜토리얼 보상 · 새 동료가 원정대에 합류했어요!');
        recruitShow(TH, () => go('lobby', {}, false), true);
      });
    } else if (!S.seen['tut:lobby'])
      coach('lobby', [
        { sel: '.mgo', text: '「전투 준비」를 눌러 보세요!\n다음 스테이지로 바로 출발해요.' },
        { sel: '.mq.mile', text: '할 일이 헷갈리면 「다음 할 일」 카드를 봐 주세요.\n제가 늘 적어 둘게요.' },
        { sel: '.mside', text: '옆의 미션·이벤트·출석을 눌러서\n보상을 꼭 받아 가세요!' },
      ]);
    else if (did(1, 1) && !S.seen['tut:hero'])
      coach('hero', [{ sel: '.mdock [data-go="heroes"]', text: '장비를 얻었어요! 아래 「영웅」을 눌러\n영웅에게 장비를 껴 볼까요?', press: true }]);
    else if (did(1, 3) && !S.seen['tut:shop'])
      coach('shop', [{ sel: '.mdock [data-go="shop"]', text: '아래 「상점」을 눌러 보세요.\n「영웅」 칸에서 새 동료를 데려올 수 있어요.', press: true }]);
    else if (did(1, 10) && !S.seen['tut:portal'])
      coach('portal', [{ sel: '.mdock [data-go="world"]', text: '아래 「포탈」을 눌러 월드맵을 열어 보세요.\n수도·도전의 탑·세계수·레이드로 갈 수 있어요.', press: true }]);
    // 메인이 뜬 뒤: 나머지 영웅 시트를 뒤에서 천천히 (SPRITE_RES §C)
    preloadRest();
  },
  tick: (dt) => mainMapTick(dt),
});
/** 지도 노드 (UI v2 · 그림 없이 코드): 메달(깬 곳 금 체크 · 지금 파랑 번호 · 잠김 회색 · 보스 빨강) + 번호판 + 별 3 */
function nodeHtml(id: StageId, open: boolean, st: string) {
  const n = starsAt(id);
  const md = isBoss(id) ? 'BOSS' : st === 'done' ? icon('check') : String(id.s);
  const stars = open && st === 'done' ? `<span class="mstars">${[0, 1, 2].map((k) => `<i class="${k < n ? 'on' : ''}">${icon('star')}</i>`).join('')}</span>` : '';
  // 보스 노드: 번호판 아래 그 장 보스 얼굴 (지도 위 보스 그림은 화살표를 가려서 뺌 · 형철 10/18)
  const face = isBoss(id) ? `<i class="bface" style="background-image:url(${import.meta.env.BASE_URL}art/ui2/bossface/${CHAPTERS[id.c - 1].region}.png)"></i>` : '';
  return `<i class="md">${md}</i><b class="pl">${id.c}-${id.s}</b>${face}${stars}`;
}
/** 스테이지 정보 창 (RECOVER_1018 S3 · 영상 sheet_08 v3_027): 얻는 경험치·금화 · 적 카드(보스 BOSS) · 떨어지는 것 · [소탕][전투 준비] */
export function stageInfo(st: StageId) {
  const R = CONFIG.reward;
  const base = baseReward(st, () => 1, partyIds(), !starsAt(st));
  const gold = Math.round(base.gold * taperAt(S.day.runs + 1) * boostMult());
  const rl = recLevel(st);
  const myLv = Math.round(partyIds().reduce((a, id) => a + S.heroes[id].lv, 0) / Math.max(1, partyIds().length));
  // 적 카드: 얼굴(대기 첫 칸) + 이름 · 보스는 맨 앞에 BOSS
  const mobs = [...new Map(buildMobs(st).flat().map((m) => [m.name, m])).values()].sort((a, b) => +b.boss - +a.boss);
  const enemy = mobs.map((m) => `<div class="ecard${m.boss ? ' boss' : ''}"><i style="background-image:url(${import.meta.env.BASE_URL}art/${m.kind.anims.idle!.frames[0].replace(':', '/')}.png)"></i>${m.boss ? '<em>BOSS</em>' : ''}<span class="fit" data-min="${CONFIG.ui.fit.tiny}">${esc(m.name)}</span></div>`).join('');
  const pct = (p: number) => `${Math.round(p * 100)}%`;
  const drops: [string, string, string][] = [['gold', '금화', '늘'], ['stardust', '별가루', pct(R.dust.chance)], ['enh', '강화석', pct(R.enh.chance)], ['gear', '장비', pct(CONFIG.gear.drop.chance)], ...(isBoss(st) ? [['rune', '룬', pct(CONFIG.gear.drop.runeBoss)] as [string, string, string]] : [])];
  const dropHtml = drops.map(([k, n, p]) => `<div class="dcell">${k === 'gear' ? icon('weapon') : icon(k)}<span>${n}</span><b>${p}</b></div>`).join('');
  const rep = canRepeat(st);
  const m = modal(`${stageName(st)} · ${esc(CHAPTERS[st.c - 1].name)} ${starsHtml(starsAt(st))}`, `<div class="sinfo">
      <div class="row kvs"><span>추천 레벨 <b class="${myLv >= rl ? 'good' : 'bad'}">${rl}</b></span><span>행동력 ${icon('stamina')} <b>${stageCost(st.d)}</b></span></div>
      <b class="sm">얻는 것${boostMult() > 1 ? ' · 부스터 2배' : ''}</b>
      <div class="row gains"><span>${icon('exp')} 영웅 경험치 <b>+${fmt(base.exp)}</b></span><span>${icon('gold')} 금화 <b>+${fmt(gold)}</b></span></div>
      <b class="sm">나오는 적</b><div class="row enemies">${enemy}</div>
      <b class="sm">떨어지는 것</b><div class="row drops">${dropHtml}</div>
    </div>`, [
    [`${icon('repeat')} 소탕 ×${CONFIG.repeat.choices[0]}`, () => {
      if (!rep) return (toast(`별 ${CONFIG.repeat.minStars}개로 깨면 소탕할 수 있어요`), false);
      const h = repeatBattle(st, CONFIG.repeat.choices[0]);
      if (!h) return (toast('행동력이 모자라요'), false);
      persist();
      syncBar();
      toast(repeatText(h));
    }],
    ['닫기', null],
    [`${icon('battle')} 전투 준비`, () => go('prep', { stage: { ...st }, from: 'lobby' }), true],
  ]);
  m.classList.add('stagewin');
  // 창 바깥(어두운 곳)을 눌러도 닫힘 (형철 10/18 「취소하고 싶어도 취소가 안 돼」)
  m.addEventListener('click', (e) => e.target === m && m.remove());
  if (view.scale >= CONFIG.ui.pcWin.minScale) $('.panel', m).style.transform = `scale(${CONFIG.ui.pcWin.scale})`;
  fitText(m);
  if (!rep) m.querySelector<HTMLButtonElement>('button[data-i="0"]')!.classList.add('off');
}

let offlineChecked = false;
/** 로비에 처음 들어올 때 한 번: 방치 보상 */
function offlinePopup() {
  if (offlineChecked) return;
  offlineChecked = true;
  const o = computeOffline();
  if (!o) return;
  const r = o.reward;
  modal(`${icon('offline')} 그동안 원정대는…`, `<p class="dim">${fmtTime(o.away)} 동안 ${stageName(o.stage)}에서 사냥했어요${o.away > o.seconds ? ` (최대 ${CONFIG.offline.maxHours}시간까지)` : ''}.</p>
    <div class="rw gifts">${[['gold', r.gold], ['exp', r.exp], ['enh', r.enh]].filter(([, v]) => v).map(([k, v]) => `<div class="rwc ${k}"><span>${icon(k as string)}</span>${k === 'exp' ? '영웅 경험치' : CUR_NAME[k as string]}<b>+${fmt(v as number)}</b></div>`).join('')}</div>`, [
    ['모두 받기', () => {
      const ups = claimOffline(o);
      persist();
      syncBar();
      if (ups.length) toast(`레벨 업! ${ups.map((id) => heroOf(id).name).join(' · ')}`);
    }, true],
  ]);
}

// ───────── 모험: 필드 지도 (STAR_PLAN_v2 §3 · 스테이지 = 길 위 노드 · 지금 위치에 영웅 · 지도 안 토벌·상급 던전·탑 입구) ─────────
function fieldMap(c: number, d: number, sel: StageId) {
  const ns = nextStage();
  const NODES = nodesOf(c);
  const here = ns.c === c && d === 0 ? ns.s : null;
  const lead = partyIds()[0] ?? 'woongs';
  return `<div class="fmap panel"><div class="fmap-in" style="background-image:url(${mapUrl(c)})">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${NODES.map(([x, y]) => `${x},${y}`).join(' ')}" /></svg>
    ${NODES.map(([x, y], i) => {
      const id = { c, s: i + 1, d };
      const open = unlocked(id);
      // 둥근 메달: 깬 곳 금 · 지금 갈 곳 파랑 빛 · 잠김 회색 자물쇠 · 아래 별 3개 (PLAYTEST §8)
      const st = !open ? 'off' : starsAt(id) > 0 ? 'done' : 'now';
      // 메인 지도와 같은 노드 그림 (FINAL §5): 메달 4종 + 번호판 + 별
      return `<button class="node mnode ${st}${isBoss(id) ? ' boss' : ''}${sel.s === i + 1 ? ' sel' : ''}" style="left:${x}%;top:${y}%" data-s="${i + 1}" ${open ? '' : 'disabled'}>${nodeHtml(id, open, st)}</button>`;
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
            <div class="row"><b class="grow">${c}장 · ${ch.name}</b>
              <div class="tabs">${C.diffName.map((n, i) => `<button class="tab${i === d ? ' on' : ''}" data-d="${i}" ${diffOpen(c, i) ? '' : 'disabled'}>${diffOpen(c, i) ? '' : icon('lock')}${n}</button>`).join('')}</div></div>
            ${chOpen ? fieldMap(c, d, sel) : `<div class="panel mute">이전 장을 깨면 열려요</div>`}
            <div class="xs mute note">${ch.star} · 장을 깨면 별이 하나 다시 켜지고 지역 전설 영웅이 합류해요</div>
          </div>
          <div class="panel col side">
            <b class="b">${stageName(sel)}${isBoss(sel) ? ` · ${CHAPTER_MOBS[c - 1].boss}` : ''}</b>
            <div class="kv"><span>추천 레벨</span><b class="${myLv >= rl ? 'good' : 'bad'}">${rl}</b></div>
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
      <div class="roster scroll lfr">${bench.map((h) => card(h.id, `<span class="xs gold">${fmt(heroPower(h.id))}</span>`, ps.flat().includes(h.id) ? 'in' : '')).join('') || '<span class="mute">파티 밖 영웅이 없어요</span>'}</div>`;
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
  back: (p) => (p.run ? go('portal', { tab: (p.run as Run).mode }, false) : p.stage && p.from !== 'lobby' ? go('adventure', { ...(p.stage as StageId) }, false) : go('lobby', {}, false)),
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
            <div class="roster grow scroll">${mine.map((h) => card(h.id, `<span class="xs gold">${fmt(heroPower(h.id))}</span>`, ids.includes(h.id) ? 'in' : '')).join('')}${notMine.map((h) => card(h.id, `<span class="lk">${icon('lock')}</span>`).replace('data-h=', 'data-lk=')).join('')}</div>
            <span class="xs mute fdesc">카드를 눌러 넣고 빼요 (최대 ${PARTY_MAX}명) · 길게 누르면 영웅 정보</span>
          </div>
          <div class="col side pside">
            <div class="panel col tsum">
              <div class="kv"><span>팀 레벨</span><b>Lv.${S.acc.lv}</b></div>
              <div class="kv"><span>파티 전투력</span><b class="gold">${fmt(partyPower())}</b></div>
              <div class="party">${[0, 1, 2, 3].map((i) => {
                const id = byZone(ids)[i];
                // 누르면 파티에서 빼기 (편성 바꾸기 · v1.0.11에서 뺐다가 되돌림 · 형철 10/18)
                return id ? `<div class="pcard" data-out="${id}" title="${heroOf(id).name} · 눌러서 빼기"><div class="pt" style="background-image:url(${heroPortrait(id)})"></div></div>` : '<div class="pcard empty"></div>';
              }).join('')}</div>
              <div class="bondl">${BONDS.filter((x) => x.members.some((m) => ids.includes(m))).map((x) => `<button class="chip${bonds.includes(x) ? ' on' : ''}" data-bond="${x.id}" title="${esc(bondText(x))}">${x.name}</button>`).join('') || '<span class="xs mute">인연 없음</span>'}</div>
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
              <div class="kv"><span>행동력</span><b>${icon('stamina')} ${cost} / 보유 ${stamina()}</b></div>
              <button class="btn hi big pstart" data-start ${ids.length ? '' : 'disabled'}>전투 시작</button>
              <div class="row"><select data-n class="tab">${CONFIG.repeat.choices.map((n) => `<option value="${n}" ${n === rep ? 'selected' : ''}>${n}회</option>`).join('')}</select>
                <button class="btn grow" data-repeat ${canRepeat(st) ? '' : 'disabled'} title="${canRepeat(st) ? `행동력 ${cost} × 횟수 · 바로 끝나요` : '별 3개면 열려요'}">${icon('repeat')} 반복 전투</button></div>
              <div class="row"><span class="grow xs dim">${icon('booster')} 부스터 (전리품 ${CONFIG.booster.mult}배 1시간)</span><button class="btn mini${bl ? ' on' : ''}" data-boost>${bl ? fmtTime(bl) : `${icon('gold')}${fmt(CONFIG.booster.gold)}`}</button></div>
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
      $$('[data-lk]', root).forEach((b) => (b.onclick = () => go('shop', { cat: 'hero' })));
      $$('[data-bond]', root).forEach((b) => (b.onclick = () => toast(bondText(BONDS.find((x) => x.id === b.dataset.bond)!))));
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
      // 행동력은 전투 화면으로 가기 전에 확인 → 빈 전투 배경이 잠깐 보이고 알림이 뜨던 것 (고느끼 10/18)
      $('[data-start]', root).onclick = () =>
        stamina() < stageCost(st.d)
          ? void modal(`${icon('stamina')} 행동력이 모자라요`, `<p class="dim">이 스테이지는 행동력이 ${stageCost(st.d)}개 필요해요 (지금 ${stamina()}개). 시간이 지나면 차거나, 상단 바 [+]로 채울 수 있어요.</p>`, [['확인', null, true]])
          : go('battle', { stage: { ...st } });
      $('[data-repeat]', root).onclick = () => repeatAsk(st, rep, draw);
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
      const unowned = `<div class="cards hcards grow scroll hscroll">${heroStock().map((h) => heroShopCard(h.id)).join('') || '<span class="mute">모든 영웅을 모았어요!</span>'}</div>`;
      root.innerHTML = `<div class="body"><div class="col grow">${zoneTabs(tab, true)}${tab === 'none' ? unowned : `<div class="roster grow scroll hscroll">${list
        .map((h) => card(h.id, owned(h.id) ? `<span class="xs gold">${fmt(heroPower(h.id))}</span>` : `<span class="xs mute">${h.joinChapter ? `${h.joinChapter}장 클리어` : '영웅 상점 (B)'}</span>`))
        .join('') || '<span class="mute">없어요</span>'}</div>`}</div></div>`;
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab!), draw())));
      $$('[data-hero]', root).forEach((b) => (b.onclick = (e) => (e.stopPropagation(), go('shop', { cat: 'hero' }))));
      $$('[data-h]', root).forEach((b) => (b.onclick = () => go('hero', { id: b.dataset.h })));
    };
    draw();
  },
});
