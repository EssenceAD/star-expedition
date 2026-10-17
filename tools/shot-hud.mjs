// 전투 HUD 캡처: 평상시 · DPS 펼침 · 치명타 순간 · 스킬 쿨타임 중 · 자동 켬 (docs/BATTLE_HUD_1017.md 확인용)
//  node tools/shot-hud.mjs [out폴더] [영웅,영웅,영웅,영웅]  (먼저 npm run build · W=844 H=390)
//  ?rec=1 고정 걸음(__tick)으로 돌려서 찍을 때마다 같은 장면
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const [out = 'out/hud', party = 'woongs,gonu,ikamolly,walwal'] = process.argv.slice(2);
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
      window.__b().auto = false;
    },
    [key, party, lv],
  ).then(() => p.waitForFunction(() => !window.__artWait(), null, { timeout: 120000 }));
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

const tick = (sec) => runUntil('false', sec);
const dpsOpen = () => p.evaluate(() => document.getElementById('dps').classList.contains('open'));

await start('1-10-0', 10);
await runUntil("b.phase === 'fight' && b.mobs.some((m) => !m.dead && m.x < 640)", 20);
await tick(1.2);
await shot('1_normal');
// DPS 펼침 (펼쳐져 있지 않으면 탭을 눌러 펼치고, 찍은 뒤 원래대로)
const wasOpen = await dpsOpen();
if (!wasOpen) await p.click('#bDps');
await tick(0.1);
await shot('2_dps');
if (!wasOpen) await p.click('#bDps');
// 치명타가 막 뜬 순간
console.log('crit', await runUntil("b.nums.some((n) => n.kind === 'crit' && n.t > 0.12 && n.t < 0.2)", 40));
await shot('3_crit');
// 스킬 쿨타임: 마나를 채우고 영웅마다 첫 스킬을 눌러 쿨타임을 걸어 둠
await p.evaluate(() => window.__b().heroes.forEach((h) => (h.mana = 100)));
for (const btn of await p.locator('.hc button[data-s="0"]').all()) await btn.click();
await tick(2.5);
await shot('4_cooldown');
// 자동 켬 (이 장면만 컷인 끔 → 싸우는 중 화면)
await p.evaluate(() => (window.__b().cutIns = 'off'));
await p.click('#bAuto');
await tick(0.8);
await shot('5_auto');
await br.close();
srv.close();
console.log('saved', out);
