// 별의 원정대 (가제) 1단계: 부팅 → 테마 토큰 → 그림 → 저장 불러오기 → 타이틀 · 매 프레임 지금 화면 tick (전투 화면은 캔버스 직접, 나머지는 배경만)
import { CONFIG } from './config';
import { renderBg, type Art } from './battle/render';
import { loadFlags } from './core/flags';
import { heroDirs, HEROES, setPxHeights } from './data/heroes';
import { MOB_KINDS } from './data/mobs';
import { loadSave, newSave, PARTY_MAX, partyIds, persist, S } from './game/state';
import { loadInto } from './sprite/sheet';
import { img } from './ui/assets';
import { applyTheme, iconText } from './theme/tokens';
import { $, currentScreen, go, tickChat, watchFit } from './ui/core';
import { fitView, view } from './ui/view';
import './ui/screens';
import './ui/screensB';
import './ui/screensC';
import './ui/screensD';
import * as cloud from './core/net/cloud';
import { battleArtWait, battleNow } from './ui/battle';
import { gachaShow } from './ui/gacha';
import { makeGear } from './game/gear';

applyTheme();
$('#rotate').textContent = `${iconText('rotate')} 가로로 돌려 주세요`;
const stage = $('#stage');
const cv = $('#cv') as HTMLCanvasElement;
view.ctx = cv.getContext('2d')!;
const fit = () => fitView(stage, cv);
addEventListener('resize', fit);
fit();

// 로딩 화면 (docs/ART_DONE_1017_3.md §2): 아무 영웅 전신 + 칭호 + 한 줄
{
  const h = HEROES[Math.floor(Math.random() * HEROES.length)];
  const ld = document.getElementById('loading')!;
  ld.innerHTML = `<div class="ld-fb" style="background-image:url(${import.meta.env.BASE_URL}art/fullbody/${h.id}.png)"></div><div class="ld-tx"><small>${h.title}</small><b>${h.name}</b><span>「${h.voice?.[0] ?? h.concept.split('.')[0]}」</span><div class="ld-bar"><i></i></div><small>별의 원정대를 준비하고 있어요…</small></div>`;
}
await loadFlags();
const B = import.meta.env.BASE_URL;
// ───────── 그림 (SPRITE_RES_1017 §C: 처음엔 꼭 필요한 것만) ─────────
// 꼭 필요한 것: 몬스터 시트 · 전투 기본 배경 · 치명타 별 · 타이틀 그림 · 로비에 걸어 다닐 영웅 + 지금 편성 · 영웅 키(칸 정보만)
//  나머지 영웅 시트는 로비 뜬 뒤 뒤에서 · 컷인은 그 영웅이 나오는 전투 전에 · 레이드 보스 그림·콘텐츠 배경은 뒤에서
loadSave();
const mobDirs = new Set<string>();
for (const m of Object.values(MOB_KINDS)) for (const d of Object.values(m.anims)) for (const f of d!.frames) mobDirs.add(f.split(':')[0]);
const firstHeroes = [...new Set([...partyIds(), ...Object.keys(S.heroes)])].slice(0, Math.max(CONFIG.ui.lobbyLife.walkers, PARTY_MAX));
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
track(loadInto(sheet, [...mobDirs]));
track(loadInto(sheet, heroDirs(firstHeroes)));
const bgP = track(img(`${B}art/bg.jpg`).catch(() => null));
const critP = track(img(`${B}art/ui/battle/crit_burst.png`).catch(() => null));
track(img(`${B}art/screens/${CONFIG.ui.screenBg.title}.jpg`).catch(() => null));
await Promise.all(jobs);
const RB = CONFIG.raidArena.art;
const raidBoss = RB.have ? { intact: null as HTMLImageElement | null, broken: null as HTMLImageElement | null } : undefined;
if (raidBoss) {
  img(`${B}art/${RB.intact}`).then((im) => (raidBoss.intact = im)).catch(() => {});
  img(`${B}art/${RB.broken}`).then((im) => (raidBoss.broken = im)).catch(() => {});
}
const bgs: Record<string, HTMLImageElement> = {};
for (const k of new Set(Object.values(CONFIG.ui.battleBg))) img(`${B}art/bgs/${k}.jpg`).then((im) => (bgs[k] = im)).catch(() => {});
view.art = { sheet, bg: await bgP, cutin: {}, raidBoss, bgs, critBurst: await critP };
// 긴 글씨는 줄 수를 늘리지 않고 크기를 줄여 맞춤 (메뉴 화면 · 결과 창)
watchFit($('#stage'));
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
  S.seen[`${c}:intro`] = S.seen[`${c}:preBoss`] = true;
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
const gachaDemo = (grades: number[]) => gachaShow(grades.map((g, i) => makeGear((['weapon', 'armor', 'acc'] as const)[i % 3], g, 10, newSave())), null, () => {});
Object.assign(window, { __ready: true, __go: go, __b: battleNow, __artWait: battleArtWait, __gachaDemo: gachaDemo, __cfg: CONFIG, __S: () => S, __tick: frame });
