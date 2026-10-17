// 화면 조화 캡처: 로비 · 영웅 정보(성장·스킬) · 상점 · 가방 · 승리 (docs/HARMONY_1017.md 확인용)
//  node tools/shot-screens.mjs [out폴더]  (먼저 npm run build · W=844 H=390)
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const [out = 'out/screens'] = process.argv.slice(2);
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
// 출석·방치 보상 같은 팝업은 닫고 찍음
const closeModals = () => p.evaluate(() => document.querySelectorAll('.modal').forEach((m) => m.remove()));
// 장비 몇 개 · 영웅 레벨 (빈 화면이 아니게)
await p.evaluate(() => {
  const S = window.__S();
  S.prologue = true;
  for (const c of [1, 2, 3]) S.seen[`${c}:intro`] = S.seen[`${c}:preBoss`] = true;
  for (const id of Object.keys(S.heroes)) S.heroes[id].lv = 30;
});
await p.evaluate(() => window.__go('lobby'));
await wait(900);
await closeModals();
await shot('1_lobby');
await p.evaluate(() => window.__go('hero', { id: 'woongs' }));
await wait(700);
await closeModals();
await shot('2_hero_growth');
await p.click('[data-tab="skill"]');
await wait(500);
await shot('3_hero_skill');
await p.evaluate(() => window.__go('shop', { cat: 'hero' }));
await wait(800);
await shot('4_shop');
await p.evaluate(() => window.__go('bag'));
await wait(600);
await shot('5_bag');
// 승리: 1-1을 빠르게 이기고 결과 창
await p.evaluate(() => {
  window.__go('battle', { stage: { c: 1, s: 1, d: 0 } });
  const b = window.__b();
  b.auto = true;
  b.speed = 2;
});
await p.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 120000 });
await wait(900);
await shot('6_win');
await br.close();
srv.close();
console.log('saved', out);
