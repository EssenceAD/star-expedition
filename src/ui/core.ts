// 화면 라우터 + 공통 부품 (공통 상단 바 · 채팅 한 줄 · 재화 · 토스트 · 창 · 대화 재생 · 초상화)
//  화면 흐름은 FLOW 표 하나 → tests/flow.test.ts 가 탭 수(로비에서 1탭/3탭 이내)를 확인하고 docs/FLOW.md 흐름도를 만든다
//  상단 바(STAR_PLAN_v2 §1-8): ← 뒤로 + 화면 이름 / 행동력·금화·별가루 [+] / 우편·채팅 — 모든 화면 같은 자리 (타이틀·전투 빼고)
import { CONFIG } from '../config';
import { artOf, HD_PORTRAIT, heroOf } from '../data/heroes';
import { SPEAKER, type Line } from '../data/story';
import * as cloud from '../core/net/cloud';
import { aiLine, mailUnread, pushChat } from '../game/social';
import { buyStamina, staMax, staNextSec, stamina } from '../game/account';
import { cur, persist, S, type ChatLine } from '../game/state';
import { fullbodyPath } from '../game/costume';
import { icon, iconText } from '../theme/tokens';

export const $ = <E extends HTMLElement = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as E;
export const $$ = <E extends HTMLElement = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll(s)] as E[];
const BASE = import.meta.env.BASE_URL;
export const portraitUrl = (key: string) => `${BASE}art/portraits/${key}.png`;
/** 전신 일러스트 (영입·영웅 정보·로딩 · 입은 코스튬이 있으면 코스튬) */
export const fullbodyUrl = (id: string, set?: string | null) => `${BASE}art/${fullbodyPath(id, S, set)}`;
/** 영웅 초상화: 고화질 일러스트가 있으면 그것 (메뉴 화면 전부) · 없으면 도트 초상화 */
/** 스킬 아이콘 (public/art/skills/<영웅>_<0|1|2>.png · 128 · 금테 포함 · docs/ART_UI_1017.md) */
export const skillIconUrl = (id: string, k: number) => `${BASE}art/skills/${id}_${k}.png`;
/** UI 그림 (public/art/ui/<폴더>/<이름>.png · HARMONY: 탭·빈 칸·능력치 아이콘) */
export const uiPic = (path: string, cls = 'up') => `<img class="${cls} px" src="${BASE}art/ui2/${path}.png" alt="">`;
/** 탭 = 아이콘 + 글씨 */
export const tabLabel = (_pic: string, text: string) => `<span>${text}</span>`;
/** 틀 구조 (FINAL §1): .framed > .framed-in(초상 · 틀 구멍 모양으로 잘림) + .framed-frame(원형 틀 그림 · 맨 위) */
export const framedPt = (url: string, cls = '') => `<span class="fpt framed ${cls}"><i class="framed-in" style="background-image:url(${url})"></i></span>`;
export const heroPortrait = (id: string) => (HD_PORTRAIT.has(id) ? `${BASE}art/portraits_hd/${id}.png` : portraitUrl(artOf(heroOf(id)).portrait));
export const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface Screen {
  /** 화면 그리기 (root = #ui 안의 새 div) */
  enter(root: HTMLElement, params: Record<string, unknown>): void;
  leave?(): void;
  /** 매 프레임 (선택) */
  tick?(dt: number): void;
  /** 전투 화면처럼 캔버스를 직접 쓰는가 (아니면 배경만) */
  canvas?: boolean;
  /** 공통 상단 바 제목 (없으면 바 없음 — 타이틀·전투) */
  title?: string | ((p: Record<string, unknown>) => string);
  /** 상단 바 ← 뒤로 (없으면 로비로 · false면 버튼 없음) */
  back?: false | ((p: Record<string, unknown>) => void);
}
export type ScreenId = 'title' | 'lobby' | 'adventure' | 'prep' | 'battle' | 'heroes' | 'hero' | 'bag' | 'shop' | 'portal' | 'mission' | 'guild' | 'friends' | 'ranking' | 'mail' | 'settings';
export const SCREEN_NAME: Record<ScreenId, string> = { title: '타이틀', lobby: '메인(모험 지도)', adventure: '모험', prep: '전투 준비', battle: '전투', heroes: '영웅 목록', hero: '영웅 정보', bag: '가방', shop: '상점', portal: '콘텐츠', mission: '미션', guild: '길드', friends: '친구', ranking: '랭킹', mail: '우편', settings: '설정' };
/** 화면 흐름: 이 화면에서 1탭으로 갈 수 있는 곳 [가는 곳, 누르는 것] (흐름도 · 탭 수 시험 · 실제 이동은 go()) */
export const FLOW: Record<ScreenId, [ScreenId, string][]> = {
  title: [['battle', '원정 출발 (처음: 프롤로그 > 1-1)'], ['lobby', '원정 출발 (이어서)']],
  lobby: [['adventure', '위 가운데 장 이름'], ['prep', '지도 노드 > 스테이지 정보 > 전투 준비 · 오른쪽 아래 「전투 준비」 · 왼쪽 위 스토리 줄 · 아래 편성'], ['portal', '포탈 (아래 줄) · 왼쪽 위 이정표 줄'], ['heroes', '영웅 (아래 줄)'], ['bag', '가방 (아래 줄)'], ['shop', '상점 (아래 줄 · 상단 바 [+])'], ['friends', '친구 (아래 줄)'], ['guild', '길드 (아래 줄)'], ['mission', '미션·이벤트 (왼쪽 세로) · 업적 (≡ 메뉴)'], ['ranking', '≡ 메뉴 > 랭킹'], ['mail', '우편 (상단 바) · ≡ 메뉴'], ['settings', '≡ 메뉴 > 설정']],
  adventure: [['prep', '스테이지 고르고 「전투 준비」'], ['portal', '지도 위 토벌·상급 던전·탑 입구'], ['lobby', '뒤로']],
  prep: [['battle', '전투 시작 (로딩 팁 화면 뒤)'], ['hero', '영웅 카드 길게 > 정보'], ['adventure', '뒤로 (모험에서 왔을 때)'], ['lobby', '뒤로 (메인 지도에서 왔을 때)']],
  battle: [['portal', '콘텐츠 결과 > 콘텐츠'], ['lobby', '결과 > 로비'], ['adventure', '결과 > 모험'], ['battle', '결과 > 다시 / 다음'], ['prep', '패배 > 편성']],
  heroes: [['hero', '영웅 카드'], ['lobby', '뒤로']],
  hero: [['heroes', '뒤로']],
  bag: [['lobby', '뒤로']],
  shop: [['lobby', '뒤로']],
  portal: [['prep', '콘텐츠·단계 고르기 > 전투 준비'], ['lobby', '뒤로']],
  mission: [['adventure', '바로가기'], ['portal', '바로가기'], ['shop', '바로가기'], ['bag', '바로가기'], ['guild', '바로가기'], ['lobby', '뒤로']],
  guild: [['prep', '길드 레이드 > 전투 준비'], ['lobby', '뒤로']],
  friends: [['lobby', '뒤로']],
  ranking: [['lobby', '뒤로']],
  mail: [['lobby', '뒤로']],
  settings: [['title', '타이틀로'], ['lobby', '뒤로']],
};
const screens: Partial<Record<ScreenId, Screen>> = {};
export const register = (id: ScreenId, s: Screen) => (screens[id] = s);
let current: { id: ScreenId; s: Screen; root: HTMLElement; params: Record<string, unknown> } | null = null;
const history: { id: ScreenId; params: Record<string, unknown> }[] = [];
export const currentId = () => current?.id ?? null;
export const currentScreen = () => current?.s ?? null;
export function go(id: ScreenId, params: Record<string, unknown> = {}, push = true) {
  const s = screens[id];
  if (!s) throw new Error(`화면 없음: ${id}`);
  // 화면이 바뀌면 앞 화면 알림은 지움 (B 보강 §5)
  for (const o of $$('.toast')) o.remove();
  if (current) {
    current.s.leave?.();
    current.root.remove();
    if (push) history.push({ id: current.id, params: current.params });
  }
  const root = document.createElement('div');
  root.className = s.title ? 'scr withbar' : 'scr';
  root.dataset.screen = id;
  // 화면 배경 그림 (타이틀·로비·지도·길드 · docs/ART_DONE_1017_3.md §4)
  const sb = CONFIG.ui.screenBg[id];
  // 변수 안 url은 쓰는 CSS 파일 기준으로 풀리므로 절대 주소로
  if (sb) (root.classList.add('artbg'), root.style.setProperty('--scr-art', `url(${new URL(`${BASE}art/screens/${sb}.jpg`, location.href).href})`));
  if (CONFIG.ui.screenVeil.includes(id)) root.classList.add('veiled');
  $('#ui').append(root);
  current = { id, s, root, params };
  drawBar(id, s, params);
  s.enter(root, params);
}

// ───────── 공통 상단 바 + 채팅 한 줄 ─────────
function drawBar(id: ScreenId, s: Screen, p: Record<string, unknown>) {
  const bar = $('#topbar');
  const tk = $('#ticker');
  bar.hidden = !s.title;
  // 메인 지도: 바 바탕 없이 지도 위에 · 채팅 한 줄은 숨김 (채팅은 바 오른쪽 버튼)
  bar.classList.toggle('onmap', id === 'lobby');
  // 위 채팅 띠는 모든 화면에서 숨김 (MASTER 1-7) · 채팅은 상단 바 채팅 버튼
  tk.hidden = true;
  if (!s.title) return;
  const title = typeof s.title === 'function' ? s.title(p) : s.title;
  const backBtn = s.back === false || id === 'lobby' ? '' : `<button class="btn mini" data-back>${icon('back')}</button>`;
  bar.innerHTML = `${backBtn}<h2>${title}</h2><div class="curs">
    <span class="cur" title="행동력">${icon('stamina')}<b data-sta></b><button class="plus" data-plus="sta" title="채우기">${icon('plusArt', 'pl')}</button></span>
    <span class="cur" title="금화">${icon('gold')}<b data-cur="gold">${fmt(cur('gold'))}</b><button class="plus" data-plus="gold" title="상점">${icon('plusArt', 'pl')}</button></span>
    <span class="cur" title="별가루">${icon('stardust')}<b data-cur="stardust">${fmt(cur('stardust'))}</b><button class="plus" data-plus="stardust" title="상점">${icon('plusArt', 'pl')}</button></span>
    <button class="medalbtn" data-ic="mail" title="우편">${icon('mail')}${mailUnread() ? `<em class="badge">${mailUnread()}</em>` : ''}</button><button class="medalbtn" data-ic="chat" title="채팅">${icon('chat')}</button>${id === 'lobby' ? `<button class="menubtn" data-menu title="메뉴">${icon('menu')}</button>` : ''}</div>`;
  const b = $('[data-back]', bar);
  if (b) b.onclick = () => (typeof s.back === 'function' ? s.back(p) : go('lobby', {}, false));
  $$('[data-plus]', bar).forEach(
    (x) =>
      (x.onclick = () => {
        if (x.dataset.plus !== 'sta') return go('shop', { cat: x.dataset.plus === 'gold' ? 'goods' : 'special' });
        modal(`${icon('stamina')} 행동력 채우기`, `<p class="dim">별가루 ${CONFIG.stamina.buyDust}개로 행동력 ${CONFIG.stamina.buyN}을 채워요. (최대를 넘겨 쌓여요)</p>`, [
          ['그만두기', null],
          ['채우기', () => {
            if (!buyStamina()) toast('별가루가 모자라요');
            else persist();
            syncBar();
          }, true],
        ]);
      }),
  );
  $$('[data-ic]', bar).forEach((x) => (x.onclick = () => (x.dataset.ic === 'mail' ? go('mail') : chatOpener())));
  const mb = $('[data-menu]', bar);
  if (mb)
    mb.onclick = () => {
      const m = $('.mmenu');
      if (m) m.hidden = !m.hidden;
    };
  tk.onclick = () => chatOpener();
  syncBar();
}
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
/** 상단 바 숫자 새로 (재화 · 행동력 · 회복 남은 시간) */
export function syncBar() {
  syncCur();
  const e = document.querySelector<HTMLElement>('[data-sta]');
  if (!e) return;
  const n = stamina();
  const next = staNextSec();
  e.textContent = `${n}/${staMax()}${next ? ` ${mmss(next)}` : ''}`;
}
let chatT = 0;
let pollT = 0;
let lastReal = Date.now() - 3600e3;
/** 채팅 한 줄 티커 (main 루프에서 매 프레임): AI 한 줄을 월드 채팅에 쌓고 보여 줌 · 로그인했으면 20초마다 실유저 채팅도 받아 섞음 */
export function tickChat(dt: number) {
  pollT -= dt;
  if (pollT <= 0) {
    pollT = 20;
    void cloud.recentChat(lastReal).then((rows) => {
      for (const r of rows) {
        lastReal = Math.max(lastReal, r.at);
        if (r.ch === 'guild' && r.guild !== S.guild.id) continue;
        if (r.name === S.acc.name && S.chat.some((l) => l.me && l.text === r.text)) continue;
        pushChat({ name: r.name, title: r.title ?? undefined, text: r.text, at: r.at, ch: r.ch }, S);
        showTicker(S.chat[S.chat.length - 1]);
      }
    });
  }
  chatT -= dt;
  if (chatT > 0) return;
  const [a, b] = CONFIG.chat.everySec;
  chatT = a + Math.random() * (b - a);
  // AI 길드에 들었으면 가끔 길드 채팅도 (실멤버 길드는 실유저만)
  const g = S.guild.id;
  if (g && g !== 'real' && Math.random() < 0.3) pushChat(aiLine('guild'), S);
  const line = aiLine('world');
  pushChat(line, S);
  showTicker(line);
  syncBar();
}
function showTicker(l: ChatLine) {
  $('#ticker').innerHTML = `${icon('chat')} ${l.title ? `<span class="chip on">${esc(l.title)}</span> ` : ''}<b>${esc(l.name)}</b> : ${esc(l.text)}`;
}
/** 채팅 창 열기 (screensD가 등록) */
let chatOpener: () => void = () => {};
export const setChatOpener = (f: () => void) => (chatOpener = f);
/** 뒤로 (없으면 로비) */
export function back(fallback: ScreenId = 'lobby') {
  const h = history.pop();
  go(h?.id ?? fallback, h?.params ?? {}, false);
}
/** 화면 새로 그리기 (같은 화면 · 같은 인자) */
export const refresh = () => current && go(current.id, current.params, false);

export function toast(msg: string) {
  // 겹치지 않게 앞 알림은 바로 지움
  for (const o of $$('.toast')) o.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  $('#stage').append(t);
  setTimeout(() => t.remove(), CONFIG.ui.toastSec * 1000);
}
/** 창: 버튼 [글, 할 일, 강조] · 할 일이 false 를 돌려주면 안 닫힘 */
export function modal(title: string, html: string, buttons: [string, (() => void | boolean) | null, boolean?][]): HTMLElement {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="panel"><h3>${title}</h3><div class="grow scroll">${html}</div><div class="row" style="justify-content:flex-end">${buttons.map(([t, , hi], i) => `<button class="btn${hi ? ' hi' : ''}" data-i="${i}">${t}</button>`).join('')}</div></div>`;
  $('#stage').append(m);
  $$('button[data-i]', m).forEach((b) => {
    b.onclick = () => {
      const f = buttons[+b.dataset.i!][1];
      if (f?.() === false) return;
      m.remove();
    };
  });
  return m;
}
/** 꾸밈 글씨 (T3): 뒤 겹 = 굵은 남색 선 + 그림자 · 앞 겹 = 금 그라데이션 — 큰 제목·승리·합류·강화 숫자 */
/** 글씨 자동 축소 (FONT_FINAL2 §2): .fit 글씨가 칸(1줄 또는 줄 수 고정)을 넘치면 data-min까지 조금씩 줄임 · 줄 수는 늘리지 않음 */
export function fitText(root: ParentNode = document) {
  const F = CONFIG.ui.fit;
  for (const el of $$('.fit', root)) {
    el.style.fontSize = '';
    if (!el.clientWidth) continue;
    const min = Number(el.dataset.min ?? F.desc);
    let size = parseFloat(getComputedStyle(el).fontSize);
    while ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && size > min) {
      size = Math.max(min, size - F.step);
      el.style.fontSize = `${size}px`;
    }
  }
}
/** 말줄임 없애기 (FINAL_1018 §2): 글씨가 칸을 넘치면 90%까지만 줄이고, 그래도 넘치면 두 줄로 · 글씨가 그대로면 다시 안 잼 */
export function noClip(root: ParentNode = document) {
  for (const el of $$('span, b, small, em, strong, p, label, h2, h3, button, div, td, a', root)) {
    const t = el.textContent ?? '';
    if (el.dataset.nc === t || el.closest('.fit:not(:scope), canvas')) continue;
    if (!el.clientWidth || el.scrollWidth <= el.clientWidth + 1) continue;
    if (![...el.childNodes].some((k) => k.nodeType === 3 && k.textContent!.trim())) continue;
    el.dataset.nc = t;
    // .fit은 fitText가 이미 줄였음 → 그래도 넘치면 두 줄
    if (el.classList.contains('fit')) {
      el.classList.add('two');
      continue;
    }
    el.style.fontSize = el.style.whiteSpace = '';
    const base = parseFloat(getComputedStyle(el).fontSize);
    const min = base * CONFIG.ui.fit.shrink;
    let size = base;
    while (el.scrollWidth > el.clientWidth + 1 && size > min) ((size = Math.max(min, size - CONFIG.ui.fit.step)), (el.style.fontSize = `${size}px`));
    if (el.scrollWidth > el.clientWidth + 1) el.classList.add('two');
  }
}
/** 화면이 바뀔 때마다 (DOM이 바뀐 다음 프레임에) 한 번 */
export function watchFit(root: HTMLElement) {
  let queued = false;
  const run = () => {
    queued = false;
    fitText(root);
    noClip(root);
  };
  new MutationObserver(() => {
    if (!queued) ((queued = true), requestAnimationFrame(run));
  }).observe(root, { childList: true, subtree: true });
  void document.fonts?.ready.then(run);
}
/** 넘치는 목록 끝 화살표 (MASTER 1-3 · FINAL §0): 스크롤 목록(.scroll)의 안쪽 위·아래 끝에만 · 더 있을 때만 · 그림 ui/battle/scroll_up·down
 *  #stage 위에 겹쳐 그리고 목록 사각형 안쪽에 둠 (목록과 같이 스크롤되지 않게) */
const hints = new Map<HTMLElement, HTMLElement[]>();
export function scrollHints(stage: HTMLElement) {
  for (const [el, hs] of hints) if (!el.isConnected) (hs.forEach((h) => h.remove()), hints.delete(el));
  for (const el of $$('.scroll', stage)) {
    let hs = hints.get(el);
    const over = el.scrollHeight > el.clientHeight + 1 && el.offsetParent !== null;
    if (!over && !hs) continue;
    if (!hs) {
      hs = ['up', 'down'].map((d) => {
        // 그림 대신 코드 화살표 (UI v2)
        const h = document.createElement('i');
        h.className = `scrollhint ${d}`;
        h.innerHTML = icon(d === 'up' ? 'fold' : 'open');
        stage.append(h);
        return h;
      });
      hints.set(el, hs);
    }
    // #stage 안 자리 = offset 합 − 조상 스크롤 (배율·세로 돌림과 상관없음)
    let x = 0;
    let y = 0;
    for (let e: HTMLElement | null = el; e && e !== stage; e = e.offsetParent as HTMLElement | null) ((x += e.offsetLeft), (y += e.offsetTop));
    for (let e = el.parentElement; e && e !== stage; e = e.parentElement) ((x -= e.scrollLeft), (y -= e.scrollTop));
    const [up, dn] = hs;
    up.hidden = !over || el.scrollTop <= 1;
    dn.hidden = !over || el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    up.style.left = dn.style.left = `${x + el.offsetWidth / 2}px`;
    up.style.top = `${y + 2}px`;
    dn.style.top = `${y + el.offsetHeight - 2}px`;
  }
}
/** 순위 표시: 1~3 금·은·동 메달 · 그 밖은 숫자 (PLAYTEST §7) */
export const medal = (i: number) => `<i class="rk r${Math.min(i + 1, 4)}">${i + 1}</i>`;
export const fxt = (text: string, cls = '') => `<span class="fxt ${cls}" data-t="${esc(text)}"><span>${esc(text)}</span></span>`;
export const comingSoon = (what: string, chunk: string) => toast(`${what}: 준비 중이에요 (1단계 ${chunk}덩어리)`);

export const syncCur = (root: ParentNode = document) => $$('[data-cur]', root).forEach((e) => (e.textContent = fmt(cur(e.dataset.cur!))));
export const CUR_NAME: Record<string, string> = { gold: '금화', stardust: '별가루', enh: '강화석', exp: '경험치 물약', stamina: '행동력', tierMat: '티어 재료', exShard: '전용 무기 조각', arenaCoin: '결투장 코인', towerCoin: '탑 코인', skillBook: '스킬북', awakenStone: '각성석', transStone: '초월석', optTicket: '옵션 티켓', guildCoin: '길드 코인' };
export const starsHtml = (n: number, max = 3) => `<span class="stars">${iconText('star').repeat(n)}<i>${iconText('star').repeat(Math.max(0, max - n))}</i></span>`;

/** 대화 재생: 탭으로 넘기기 · 스킵 → 끝나면 done */
export function playTalk(lines: Line[], done: () => void) {
  if (!lines.length) return done();
  const el = document.createElement('div');
  $('#stage').append(el);
  let i = 0;
  const finish = () => {
    el.remove();
    done();
  };
  const show = () => {
    const [who, text] = lines[i];
    const hero = SPEAKER[who] === undefined ? heroOf(who) : null;
    const name = hero ? hero.name : SPEAKER[who];
    el.className = 'talk';
    el.innerHTML = `<button class="btn mini skip">${icon('skip')} 스킵</button><div class="box">${hero ? `<div class="pt l" style="background-image:url(${heroPortrait(who)})"></div>` : ''}<div class="tx${who === 'narr' ? ' narr' : ''}">${name ? `<div class="who">${esc(name)}</div>` : ''}<div class="say">${esc(text)}</div></div></div><div class="nxt">${i + 1} / ${lines.length} · 눌러서 다음</div>`;
    $('.skip', el).onclick = (e) => {
      e.stopPropagation();
      finish();
    };
  };
  el.onclick = () => {
    i++;
    if (i >= lines.length) finish();
    else show();
  };
  show();
}
/** 대사를 한 번만 (본 적 있으면 바로 done) */
export function talkOnce(key: string, lines: Line[] | undefined, done: () => void) {
  if (!lines?.length || S.seen[key]) return done();
  S.seen[key] = true;
  persist();
  playTalk(lines, done);
}
