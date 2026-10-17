// 별의 원정대 (가제) 1단계: 부팅 → 테마 토큰 → 그림 → 저장 불러오기 → 타이틀 · 매 프레임 지금 화면 tick (전투 화면은 캔버스 직접, 나머지는 배경만)
import { CONFIG } from './config';
import { renderBg, type Art } from './battle/render';
import { loadFlags } from './core/flags';
import { CUTIN_ART, HD_PORTRAIT, HEROES, setPxHeights, sheetDirs } from './data/heroes';
import { MOB_KINDS } from './data/mobs';
import { loadSave, persist, S } from './game/state';
import { loadSheets } from './sprite/sheet';
import { applyTheme, iconText } from './theme/tokens';
import { $, currentScreen, go, tickChat } from './ui/core';
import { fitView, view } from './ui/view';
import './ui/screens';
import './ui/screensB';
import './ui/screensC';
import './ui/screensD';
import * as cloud from './core/net/cloud';
import { battleNow } from './ui/battle';

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
const img = (src: string) =>
  new Promise<HTMLImageElement>((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => no(new Error(src));
    i.src = src;
  });
// ───────── 그림 ─────────
const dirs = new Set(sheetDirs());
for (const m of Object.values(MOB_KINDS)) for (const d of Object.values(m.anims)) for (const f of d!.frames) dirs.add(f.split(':')[0]);
const sheet = await loadSheets([...dirs]);
setPxHeights(sheet);
const bg = await img(`${B}art/bg.jpg`).catch(() => null);
const cutin: Art['cutin'] = {};
// 컷인 일러스트가 있으면 그것, 없으면 고화질 초상화 (처음 쓸 때 받음)
for (const h of HEROES) {
  const own = CUTIN_ART.has(h.id) ? await img(`${B}art/cutin/${h.id}.png`).catch(() => null) : null;
  if (own) {
    cutin[h.id] = own;
    continue;
  }
  if (HD_PORTRAIT.has(h.id))
    img(`${B}art/portraits_hd/${h.id}.png`)
      .then((p) => (cutin[h.id] = p))
      .catch(() => {});
}
const RB = CONFIG.raidArena.art;
const raidBoss = RB.have ? { intact: await img(`${B}art/${RB.intact}`).catch(() => null), broken: await img(`${B}art/${RB.broken}`).catch(() => null) } : undefined;
const bgs: Record<string, HTMLImageElement> = {};
for (const k of new Set(Object.values(CONFIG.ui.battleBg))) img(`${B}art/bgs/${k}.jpg`).then((im) => (bgs[k] = im)).catch(() => {});
view.art = { sheet, bg, cutin, raidBoss, bgs };

loadSave();
addEventListener('pagehide', () => persist());
document.addEventListener('visibilitychange', () => document.hidden && persist());
// 타이틀 키 아트는 먼저 받아 두고 (첫 화면이 빈 바탕으로 뜨지 않게)
await img(`${B}art/screens/${CONFIG.ui.screenBg.title}.jpg`).catch(() => null);
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
Object.assign(window, { __ready: true, __go: go, __b: battleNow, __cfg: CONFIG, __S: () => S, __tick: frame });
