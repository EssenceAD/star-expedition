// W.I.N.D 「바람의 원정대」 1단계: 부팅 → 테마 토큰 → 그림 → 저장 불러오기 → 타이틀 · 매 프레임 지금 화면 tick (전투 화면은 캔버스 직접, 나머지는 배경만)
import { CONFIG } from './config';
import { renderBg, type Art } from './battle/render';
import { loadFlags } from './core/flags';
import { heroDirs, HEROES, setPxHeights } from './data/heroes';
import { loadSave, newSave, PARTY_MAX, partyIds, persist, S } from './game/state';
import { loadInto } from './sprite/sheet';
import { img } from './ui/assets';
import { applyTheme } from './theme/tokens';
import { initAudioEngine } from './core/audio/engine';
import { sfx } from './core/audio/sfx';
import { initTips } from './ui/tip';
import { $, currentScreen, go, scrollHints, tickChat, watchFit } from './ui/core';
import { fitView, view } from './ui/view';
import './ui/screens';
import './ui/screensB';
import './ui/screensC';
import './ui/screensD';
import './ui/screensE';
import * as cloud from './core/net/cloud';
import { battleArtWait, battleNow } from './ui/battle';
import { gachaShow } from './ui/gacha';
import { loadFxArt } from './battle/fxart';
import { requestSkill } from './battle/sim';
import { makeGear } from './game/gear';

applyTheme();
// 소리: 첫 터치에 열림 (타이틀 터치부터 음악) · 버튼마다 「톡」 · 뒤로/닫기는 「닫힘」
initAudioEngine();
initTips();
document.addEventListener('click', (e) => {
  const b = (e.target as Element).closest('button');
  if (!b || b.disabled) return;
  sfx(b.matches('[data-back], .x, [data-close]') ? 'close' : 'tap', 0.5);
}, { capture: true });
const stage = $('#stage');
const cv = $('#cv') as HTMLCanvasElement;
view.ctx = cv.getContext('2d')!;
// 화면 맞춤: 창·방향·주소창/키보드가 바뀔 때마다 (채팅 입력 중엔 그대로 두고 채팅만 키보드 위로 · MOBILE_REF §1·§2)
const typing = () => document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
let fitT = 0;
const fit = () => {
  if (typing()) return;
  cancelAnimationFrame(fitT);
  fitT = requestAnimationFrame(() => fitView(stage, cv));
};
addEventListener('resize', fit);
addEventListener('orientationchange', fit);
// 페이지 자체가 손가락 따라 밀리지 않게: 스크롤되는 목록 안이 아니면 touchmove 막기 (지도 끌기는 pointer 이벤트라 그대로)
const scrollsInside = (el: Element | null) => {
  if (el?.closest('input, textarea')) return true;
  for (; el && el !== document.body; el = el.parentElement) {
    const cs = getComputedStyle(el);
    if ((/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight) || (/(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth)) return true;
  }
  return false;
};
// 가로로 넘기는 목록(영웅 목록 등): PC 마우스 휠도 가로로
document.addEventListener('wheel', (e) => {
  const el = (e.target as Element).closest<HTMLElement>('.hscroll');
  if (!el || el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  el.scrollLeft += e.deltaY;
  e.preventDefault();
}, { passive: false });
document.addEventListener('touchmove', (e) => !scrollsInside(e.target as Element) && e.cancelable && e.preventDefault(), { passive: false });
visualViewport?.addEventListener('resize', fit);
document.addEventListener('focusout', () => setTimeout(fit, 300));
fitView(stage, cv);

// 로딩 화면 (docs/ART_DONE_1017_3.md §2): 아무 영웅 전신 + 칭호 + 한 줄
{
  // 가진 영웅 중에서만 (처음엔 시작 4명)
  loadSave();
  const pool = HEROES.filter((x) => S.heroes[x.id]);
  const h = pool[Math.floor(Math.random() * pool.length)] ?? HEROES[0];
  const ld = document.getElementById('loading')!;
  ld.innerHTML = `<div class="ld-fb" style="background-image:url(${import.meta.env.BASE_URL}art/fullbody/${h.id}.png)"></div><div class="ld-tx"><small>${h.title}</small><b>${h.name}</b><span>「${h.voice?.[0] ?? h.concept.split('.')[0]}」</span><div class="ld-bar"><i></i></div><small>바람의 원정대를 준비하고 있어요…</small></div>`;
}
await loadFlags();
const B = import.meta.env.BASE_URL;
// ───────── 그림 (SPRITE_RES_1017 §C: 처음엔 꼭 필요한 것만) ─────────
// 꼭 필요한 것: 전투 기본 배경 · 치명타 별 · 타이틀 그림 · 지금 편성(메인 지도 원정대장 포함) · 영웅 키(칸 정보만)
//  몹·보스 시트와 지역 배경은 그 전투 전에(ensureBattleArt) · 나머지 영웅 시트는 로비 뜬 뒤 뒤에서 · 컷인은 그 영웅이 나오는 전투 전에 · 레이드 보스 그림·콘텐츠 배경은 뒤에서
const firstHeroes = [...new Set([...partyIds(), ...Object.keys(S.heroes)])].slice(0, PARTY_MAX);
const sheet: Art['sheet'] = { img: {}, cell: {}, base: {} };
const bar = document.querySelector<HTMLElement>('#loading .ld-bar i');
const jobs: Promise<unknown>[] = [];
let done = 0;
let moved = Date.now();
// 그림 하나가 오래 걸려도 전체를 막지 않게: loadItemSec 지나면 그 그림 없이 넘어감 (PLAYTEST §1)
const track = <T,>(p: Promise<T>) => {
  const capped = Promise.race([p, new Promise<undefined>((ok) => setTimeout(() => ok(undefined), CONFIG.ui.loadItemSec * 1000))]);
  jobs.push(capped);
  void capped.finally(() => {
    moved = Date.now();
    if (bar) bar.style.width = `${Math.round((++done / jobs.length) * 100)}%`;
  });
  return capped as Promise<T>;
};
// 막대가 loadStallSec 동안 그대로면 「다시 시도」 (새로고침)
const stall = setInterval(() => {
  const ld = document.getElementById('loading');
  if (!ld) return clearInterval(stall);
  if (Date.now() - moved < CONFIG.ui.loadStallSec * 1000 || ld.querySelector('[data-retry]')) return;
  const b2 = document.createElement('button');
  b2.className = 'btn hi';
  b2.dataset.retry = '1';
  b2.textContent = '다시 시도';
  b2.onclick = () => location.reload();
  ld.querySelector('.ld-tx')?.append(b2);
}, 1000);
if (bar) bar.classList.add('real');
track(setPxHeights());
// 도트 글꼴 (갈무리 · public/fonts) — 캔버스 글씨가 첫 프레임부터 도트로
track(Promise.all(['400 12px Galmuri11', '700 12px Galmuri11'].map((f) => document.fonts.load(f))).catch(() => null));
track(loadInto(sheet, heroDirs(firstHeroes)));
const bgP = track(img(`${B}art/bg.jpg`).catch(() => null));
track(img(`${B}art/screens/${CONFIG.ui.screenBg.title}.jpg`).catch(() => null));
await Promise.all(jobs);
const bgs: Record<string, HTMLImageElement> = {};
for (const k of new Set(Object.values(CONFIG.ui.battleBg))) img(`${B}art/bgs/${k}.jpg`).then((im) => (bgs[k] = im)).catch(() => {});
view.art = { sheet, bg: await bgP, cutin: {}, bgs, critBurst: null, fx: null };
// 스킬 이펙트 그림은 뒤에서 (오기 전까진 선 그리기 · ANIM_1017 ②)
void loadFxArt().then((a) => (view.art.fx = a));
// 긴 글씨는 줄 수를 늘리지 않고 크기를 줄여 맞춤 (메뉴 화면 · 결과 창)
watchFit($('#stage'));
setInterval(() => scrollHints($('#stage')), CONFIG.ui.scrollHintMs);
addEventListener('pagehide', () => persist());
document.addEventListener('visibilitychange', () => document.hidden && persist());
go('title', {}, false);
document.getElementById('loading')?.remove();

// 녹화·자동 플레이 (tools/gif.mjs · play.mjs): ?go=1(=1-10) 또는 ?go=장-스테이지-난이도 · &auto=1 · &speed=2 · &rec=1(고정 걸음 · __tick)
const q = new URLSearchParams(location.search);
const REC = q.get('rec') === '1';
let last = performance.now();
let scroll = 0;
function frame(dt: number) {
  tickChat(dt);
  const s = currentScreen();
  if (s?.canvas) s.tick?.(dt);
  else {
    scroll += 20 * dt;
    renderBg(view.ctx, view.art, scroll, view.w, 0);
    s?.tick?.(dt);
  }
}
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!REC) frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// 클라우드 자동 올리기 (로그인했을 때만 · 1분마다 · 앱 내릴 때)
const autoPush = async () => {
  if (!(await cloud.who())) return;
  persist();
  if (!(await cloud.push(S))) S.cloud.pushedAt = Date.now();
};
setInterval(autoPush, CONFIG.social.cloud.pushSec * 1000);
document.addEventListener('visibilitychange', () => document.hidden && void autoPush());
if (q.get('go')) {
  const [c, st, d] = (q.get('go') === '1' ? '1-10-0' : q.get('go')!).split('-').map(Number);
  S.prologue = true;
  S.seen[`${c}:intro`] = S.seen[`${c}:mid3`] = S.seen[`${c}:mid6`] = S.seen[`${c}:preBoss`] = true;
  S.sta.n = Math.max(S.sta.n, 999);
  go('battle', { stage: { c, s: st, d: d || 0 } });
  const b = battleNow();
  if (b) {
    b.auto = q.get('auto') === '1';
    b.speed = Number(q.get('speed') ?? 1);
  }
}
// 시험·녹화용 손잡이
// 소환 연출 녹화용 (tools/gif-gacha.mjs): 정한 등급으로 연출만 (가방에 넣지 않음)
// 스킬 바로 쓰기 (tools/gif-scene.mjs shield): 영웅 번호 · 스킬 번호 · 마나 채워서
const castNow = (h: number, i: number) => {
  const b = battleNow();
  if (!b?.heroes[h]) return false;
  b.heroes[h].mana = 100;
  b.heroes[h].scd[i] = 0;
  return requestSkill(b, b.heroes[h], i);
};
const gachaDemo = (grades: number[]) => gachaShow(grades.map((g, i) => makeGear((['weapon', 'armor', 'acc'] as const)[i % 3], g, 10, newSave())), null, () => {});
Object.assign(window, { __ready: true, __go: go, __b: battleNow, __artWait: battleArtWait, __gachaDemo: gachaDemo, __cast: castNow, __fxReady: () => !!view.art.fx, __cfg: CONFIG, __S: () => S, __tick: frame });
