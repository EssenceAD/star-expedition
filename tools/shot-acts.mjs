// 전투 도트 동작 캡처: 대기 · 공격 · 피격 · 승리 · 패배 (docs/SPRITES_1017.md 확인용)
//  node tools/shot-acts.mjs [out폴더] [영웅,영웅,영웅,영웅]  (먼저 npm run build · W=844 H=390)
//  ?rec=1 고정 걸음(__tick)으로 돌려서 찍을 때마다 같은 장면
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const [out = 'out/acts', party = 'woongs,gonu,kleine,grom'] = process.argv.slice(2);
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
await p.goto(`http://localhost:${srv.address().port}/?rec=1`);
await p.waitForFunction(() => window.__ready);

/** 전투 시작 · 영웅 레벨 · 장-스테이지-난이도 */
const start = (key, lv) =>
  p.evaluate(
    ([key, party, lv]) => {
      const S = window.__S();
      const ids = party.split(',');
      for (const id of ids) S.heroes[id] = { awaken: 0, star: 1, skill: [1, 1, 1], trans: [], ex: 0, gear: { weapon: null, armor: null, acc1: null, acc2: null }, ...(S.heroes[id] ?? {}), lv, exp: 0 };
      S.party = ids;
      S.sta.n = 999;
      S.prologue = true;
      const [c, s, d] = key.split('-').map(Number);
      S.seen[`${c}:intro`] = S.seen[`${c}:preBoss`] = true;
      window.__go('battle', { stage: { c, s, d } });
      window.__b().auto = true;
    },
    [key, party, lv],
  );
/** 고정 걸음으로 조건이 맞을 때까지 (최대 sec초) */
const runUntil = (cond, sec) =>
  p.evaluate(
    ([cond, sec]) => {
      const f = new Function('b', `return ${cond}`);
      for (let t = 0; t < sec; t += 1 / 30) {
        window.__tick(1 / 30);
        if (f(window.__b())) return true;
      }
      return false;
    },
    [cond, sec],
  );
/** 살아 있는 영웅 모두 이 동작의 t초 장면으로 맞춰 한 번 그림 */
const pose = (act, t) =>
  p.evaluate(
    ([act, t]) => {
      const b = window.__b();
      for (const h of b.heroes) if (!h.dead) ((h.act = act), (h.at = t), (h.busy = 9));
      window.__tick(0);
    },
    [act, t],
  );
const shot = (name) => p.screenshot({ path: `${out}/${name}.png` });

// 대기 · 공격 · 피격: 1-3 싸움 중 장면에서 동작만 맞춰 찍기
await start('1-3-0', 30);
await runUntil("b.phase === 'fight' && b.mobs.some((m) => !m.dead && m.x < 720)", 20);
await pose('idle', 0.1);
await shot('1_idle');
await pose('attack', 0.25);
await shot('2_attack');
await pose('hurt', 0.05);
await shot('3_hurt');
// 승리: 끝까지 싸워서 이기면 살아남은 영웅이 승리 자세
console.log('win', await runUntil("b.phase === 'win'", 240));
await runUntil('false', 0.4);
await shot('4_win');
// 패배: 낮은 레벨로 어려운 스테이지 → 모두 쓰러짐
await start('3-10-2', 1);
console.log('lose', await runUntil("b.phase === 'lose'", 240));
await shot('5_lose');
// 결과 창을 숨기고 쓰러진 자세만 한 장 더
await p.addStyleTag({ content: '#result{display:none!important}' });
await shot('5_lose_poses');
await br.close();
srv.close();
console.log('saved', out);
