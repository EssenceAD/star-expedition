// 메뉴 화면 캡처 (docs/PLAYTEST_1017.md 확인용): 로비 · 출석 · 콘텐츠 9탭 · 편성 · 모험 · 가방 · 미션(업적) · 친구 · 랭킹 · 길드 · 상점(영웅·재화)
//  node tools/shot-menus.mjs [out폴더]  (먼저 npm run build · W=844 H=390)
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const [out = 'out/menus'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const srv = createServer((q, r) => {
  let p = join('dist', decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  if (!existsSync(p)) return r.writeHead(404).end();
  r.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p));
}).listen(0);
const exe = process.env.CHROME ?? (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const br = await chromium.launch(exe ? { executablePath: exe } : { channel: 'chrome' });
const p = await br.newPage({ viewport: { width: Number(process.env.W ?? 844), height: Number(process.env.H ?? 390) } });
p.on('pageerror', (e) => console.log('pageerror', String(e)));
await p.goto(`http://localhost:${srv.address().port}/`);
await p.waitForFunction(() => window.__ready);

const shot = (name) => p.screenshot({ path: `${out}/${name}.png` });
const wait = (ms) => p.waitForTimeout(ms);
const closeModals = () => p.evaluate(() => document.querySelectorAll('.modal').forEach((m) => m.remove()));
const go = async (id, params = {}, ms = 700) => {
  await p.evaluate(([id, params]) => window.__go(id, params), [id, params]);
  await wait(ms);
};
// 진행된 저장: 1장 다 깸 · 영웅 몇 명 · 장비 조금
await p.evaluate(() => {
  const S = window.__S();
  S.prologue = true;
  for (const c of [1, 2, 3]) S.seen[`${c}:intro`] = S.seen[`${c}:preBoss`] = true;
  for (let s = 1; s <= 10; s++) S.stages[`1-${s}-0`] = { stars: 3, best: 60 };
  for (const id of Object.keys(S.heroes)) S.heroes[id].lv = 30;
});
await go('lobby', {}, 900);
await shot('01_lobby_attend');
await closeModals();
await shot('02_lobby');
for (const tab of ['hunt', 'dungeon', 'tower', 'day', 'raid', 'world', 'arena', 'side', 'miles']) {
  await go('portal', { tab });
  await closeModals();
  await shot(`03_portal_${tab}`);
}
await go('prep', {});
await shot('04_prep');
await go('adventure', {});
await shot('05_adventure');
await go('bag', {});
await shot('06_bag');
await go('mission', {});
await shot('07_mission');
await go('mission', { tab: 'ach' });
await shot('08_mission_ach');
await go('friends', {});
await shot('09_friends');
await go('ranking', {});
await shot('10_ranking');
await go('guild', {});
await shot('11_guild');
await go('shop', { cat: 'hero' });
await shot('12_shop_hero');
await go('shop', { cat: 'goods' });
await shot('13_shop_goods');
await go('shop', { cat: 'summon' });
await shot('14_shop_summon');
await br.close();
srv.close();
console.log('saved', out);
