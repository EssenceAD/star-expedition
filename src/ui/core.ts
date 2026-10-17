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
export const uiPic = (path: string, cls = 'up') => `<img class="${cls}" src="${BASE}art/ui/${path}.png" alt="">`;
/** 탭 = 아이콘 + 글씨 */
export const tabLabel = (pic: string, text: string) => `${uiPic(pic, 'ti')}<span>${text}</span>`;
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
export const SCREEN_NAME: Record<ScreenId, string> = { title: '타이틀', lobby: '로비(여관)', adventure: '모험', prep: '전투 준비', battle: '전투', heroes: '영웅 목록', hero: '영웅 정보', bag: '가방', shop: '상점', portal: '콘텐츠', mission: '미션', guild: '길드', friends: '친구', ranking: '랭킹', mail: '우편', settings: '설정' };
/** 화면 흐름: 이 화면에서 1탭으로 갈 수 있는 곳 [가는 곳, 누르는 것] (흐름도 · 탭 수 시험 · 실제 이동은 go()) */
export const FLOW: Record<ScreenId, [ScreenId, string][]> = {
  title: [['battle', '원정 출발 (처음: 프롤로그 > 1-1)'], ['lobby', '원정 출발 (이어서)']],
  lobby: [['adventure', '모험 (오른쪽 큰 버튼)'], ['portal', '월드 보스·레이드 (오른쪽 큰 버튼) · 콘텐츠 (아래 줄)'], ['prep', '왼쪽 「다음 스테이지」 > 전투 준비'], ['heroes', '영웅 (아래 줄)'], ['prep', '편성 (아래 줄)'], ['bag', '가방 (아래 줄)'], ['shop', '상점 (아래 줄 · 상단 바 [+])'], ['mission', '미션·업적 (아래 줄 · 진행 중)'], ['guild', '길드 (아래 줄)'], ['friends', '친구 (아래 줄)'], ['ranking', '랭킹 (아래 줄)'], ['mail', '우편 (상단 바)'], ['settings', '설정 (아래 줄)']],
  adventure: [['prep', '스테이지 고르고 「전투 준비」'], ['portal', '지도 위 토벌·상급 던전·탑 입구'], ['lobby', '뒤로']],
  prep: [['battle', '전투 시작'], ['hero', '영웅 카드 길게 > 정보'], ['adventure', '뒤로']],
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
  bar.hidden = tk.hidden = !s.title;
  if (!s.title) return;
  const title = typeof s.title === 'function' ? s.title(p) : s.title;
  const backBtn = s.back === false || id === 'lobby' ? '' : `<button class="btn mini" data-back>${icon('back')}</button>`;
  bar.innerHTML = `${backBtn}<h2>${title}</h2><div class="curs">
    <span class="cur" title="행동력">${icon('stamina')}<b data-sta></b><button class="plus" data-plus="sta" title="채우기">${uiPic('icons/plus', 'pl')}</button></span>
    <span class="cur" title="금화">${icon('gold')}<b data-cur="gold">${fmt(cur('gold'))}</b><button class="plus" data-plus="gold" title="상점">${uiPic('icons/plus', 'pl')}</button></span>
    <span class="cur" title="별가루">${icon('stardust')}<b data-cur="stardust">${fmt(cur('stardust'))}</b><button class="plus" data-plus="stardust" title="상점">${uiPic('icons/plus', 'pl')}</button></span>
    <button class="medalbtn" data-ic="mail" title="우편">${icon('mail')}${mailUnread() ? `<em class="badge">${mailUnread()}</em>` : ''}</button><button class="medalbtn" data-ic="chat" title="채팅">${icon('chat')}</button></div>`;
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
  setTimeout(() => t.remove(), 2300);
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
export const fxt = (text: string, cls = '') => `<span class="fxt ${cls}" data-t="${esc(text)}"><span>${esc(text)}</span></span>`;
export const comingSoon = (what: string, chunk: string) => toast(`${what}: 준비 중이에요 (1단계 ${chunk}덩어리)`);

export const syncCur = (root: ParentNode = document) => $$('[data-cur]', root).forEach((e) => (e.textContent = fmt(cur(e.dataset.cur!))));
export const CUR_NAME: Record<string, string> = { gold: '금화', stardust: '별가루', enh: '강화석', exp: '경험치 물약', stamina: '행동력', tierMat: '티어 재료', exShard: '전용 무기 조각', arenaCoin: '결투장 코인', towerCoin: '탑 코인', skillBook: '스킬북', awakenStone: '각성석', transStone: '초월석', optTicket: '옵션 티켓' };
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
