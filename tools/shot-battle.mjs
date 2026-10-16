// 전투 한 장면 찍기: node tools/shot-battle.mjs <장-스테이지-난이도> <초> <out.png> [영웅,영웅,영웅,영웅] [레벨]
//  (먼저 npm run build) · 편성 순서는 상관없음(위치는 직업으로 자동) · AUTO ×2
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const [key = '1-10-0', sec = '6', out = 'out/battle.png', party = 'woongs,luna,ikamolly,aria', lv = '8'] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const srv = createServer((q, r) => {
  let p = join('dist', decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  if (!existsSync(p)) return r.writeHead(404).end();
  r.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p));
}).listen(0);
const exe = process.env.CHROME ?? (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const br = await chromium.launch(exe ? { executablePath: exe } : { channel: 'chrome' });
const p = await br.newPage({ viewport: { width: Number(process.env.W ?? 900), height: Number(process.env.H ?? 412) } });
p.on('pageerror', (e) => console.log('pageerror', String(e)));
await p.goto(`http://localhost:${srv.address().port}/`);
await p.waitForFunction(() => window.__ready);
await p.evaluate(([key, party, lv]) => {
  const S = window.__S();
  const ids = party.split(',');
  S.party = ids;
  for (const id of ids) S.heroes[id] = { lv: +lv, exp: 0 };
  S.sta.n = 999;
  S.prologue = true;
  S.seen = { '1:intro': true, '1:preBoss': true, '2:intro': true, '2:preBoss': true, '3:intro': true, '3:preBoss': true };
  const [c, s, d] = key.split('-').map(Number);
  window.__go('battle', { stage: { c, s, d } });
  const b = window.__b();
  b.auto = true;
  b.speed = 2;
}, [key, party, lv]);
await p.waitForTimeout(+sec * 1000);
await p.screenshot({ path: out });
await br.close();
srv.close();
console.log('saved', out);
