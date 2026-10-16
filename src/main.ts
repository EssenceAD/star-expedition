// 별의 원정대 (가제) 1단계: 부팅 → 테마 토큰 → 그림 → 저장 불러오기 → 타이틀 · 매 프레임 지금 화면 tick (전투 화면은 캔버스 직접, 나머지는 배경만)
import { CONFIG } from './config';
import { renderBg, type Art } from './battle/render';
import { loadFlags } from './core/flags';
import { CUTIN_ART, HEROES, sheetDirs } from './data/heroes';
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
const bg = await img(`${B}art/bg.jpg`).catch(() => null);
const cutin: Art['cutin'] = {};
// 컷인 일러스트가 있으면 그것, 없으면 초상화를 크게 (처음 쓸 때 만든다)
const port = (h: (typeof HEROES)[number]) => (h.fiveStar ? `star_${h.id}` : null);
for (const h of HEROES) {
  const own = CUTIN_ART.has(h.id) ? await img(`${B}art/cutin/${h.id}.png`).catch(() => null) : null;
  if (own) {
    cutin[h.id] = own;
    continue;
  }
  const key = port(h) ?? (h.origin === 'legend' ? `legend_${h.id}` : null);
  if (!key) continue;
  img(`${B}art/portraits/${key}.png`)
    .then((p) => {
      const c = document.createElement('canvas');
      c.width = p.width * 4;
      c.height = p.height * 4;
      const x = c.getContext('2d')!;
      x.imageSmoothingEnabled = false;
      x.drawImage(p, 0, 0, c.width, c.height);
      cutin[h.id] = c;
    })
    .catch(() => {});
}
const RB = CONFIG.raidArena.art;
const raidBoss = RB.have ? { intact: await img(`${B}art/${RB.intact}`).catch(() => null), broken: await img(`${B}art/${RB.broken}`).catch(() => null) } : undefined;
view.art = { sheet, bg, cutin, raidBoss };

loadSave();
addEventListener('pagehide', () => persist());
document.addEventListener('visibilitychange', () => document.hidden && persist());
go('title', {}, false);

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
