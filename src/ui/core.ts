// 화면 라우터 + 공통 부품 (상단 바 · 재화 · 토스트 · 창 · 대화 재생 · 초상화)
//  화면 흐름은 FLOW 표 하나 (tests/flow.test.ts 가 화면마다 갈 수 있는 곳이 등록돼 있는지 확인 · D덩어리에서 흐름도로)
import { heroOf, artOf } from '../data/heroes';
import { SPEAKER, type Line } from '../data/story';
import { cur, persist, S } from '../game/state';
import { icon, iconText, T } from '../theme/tokens';

export const $ = <E extends HTMLElement = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as E;
export const $$ = <E extends HTMLElement = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll(s)] as E[];
const BASE = import.meta.env.BASE_URL;
export const portraitUrl = (key: string) => `${BASE}art/portraits/${key}.png`;
export const heroPortrait = (id: string) => portraitUrl(artOf(heroOf(id), T.battle.tint.length).portrait);
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
}
export type ScreenId = 'title' | 'prologue' | 'lobby' | 'adventure' | 'formation' | 'battle' | 'heroes' | 'hero';
/** 화면 흐름: 이 화면에서 갈 수 있는 곳 (흐름도 · 테스트용 · 실제 이동은 go()) */
export const FLOW: Record<ScreenId, ScreenId[]> = {
  title: ['prologue', 'lobby'],
  prologue: ['lobby'],
  lobby: ['adventure', 'formation', 'heroes', 'title'],
  adventure: ['lobby', 'formation', 'battle'],
  formation: ['lobby', 'adventure', 'battle', 'hero'],
  battle: ['adventure', 'lobby', 'battle'],
  heroes: ['lobby', 'hero', 'formation'],
  hero: ['heroes', 'formation'],
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
  if (current) {
    current.s.leave?.();
    current.root.remove();
    if (push) history.push({ id: current.id, params: current.params });
  }
  const root = document.createElement('div');
  root.className = 'scr';
  root.dataset.screen = id;
  $('#ui').append(root);
  current = { id, s, root, params };
  s.enter(root, params);
}
/** 뒤로 (없으면 로비) */
export function back(fallback: ScreenId = 'lobby') {
  const h = history.pop();
  go(h?.id ?? fallback, h?.params ?? {}, false);
}
/** 화면 새로 그리기 (같은 화면 · 같은 인자) */
export const refresh = () => current && go(current.id, current.params, false);

export function toast(msg: string) {
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
export const comingSoon = (what: string, chunk: string) => toast(`${what}: 준비 중이에요 (1단계 ${chunk}덩어리)`);

/** 상단 바: 뒤로 · 제목 · 재화 */
export function topBar(title: string, onBack: (() => void) | null, curKeys: string[] = ['gold', 'stardust', 'enh']) {
  return `<div class="top">${onBack ? `<button class="btn mini" data-back>${icon('back')}</button>` : ''}<h2>${title}</h2><div class="curs">${curKeys.map((k) => `<span class="cur" title="${CUR_NAME[k] ?? k}">${icon(k)}<b data-cur="${k}">${fmt(cur(k))}</b></span>`).join('')}</div></div>`;
}
export function wireTop(root: HTMLElement, onBack: () => void) {
  const b = $('[data-back]', root);
  if (b) b.onclick = onBack;
}
export const syncCur = (root: ParentNode = document) => $$('[data-cur]', root).forEach((e) => (e.textContent = fmt(cur(e.dataset.cur!))));
export const CUR_NAME: Record<string, string> = { gold: '금화', stardust: '별가루', enh: '강화석', exp: '경험치 물약' };
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
    el.className = `talk${who === 'narr' ? ' narr' : ''}`;
    el.innerHTML = `<button class="btn mini skip">${icon('skip')} 스킵</button><div class="box">${hero ? `<div class="pt l" style="background-image:url(${heroPortrait(who)})"></div>` : ''}<div class="tx">${name ? `<div class="who">${esc(name)}</div>` : ''}<div class="say">${esc(text)}</div></div></div><div class="nxt">${i + 1} / ${lines.length} · 눌러서 다음</div>`;
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
