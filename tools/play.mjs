// 한 판 자동 플레이 (AUTO · ×2) → 몇 초마다 사진 · 결과 화면까지 · 에러 검사
//  node tools/play.mjs <out폴더> [최대 초]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [out = 'shots', max = '200'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const URL = process.env.URL ?? 'http://localhost:5191/';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e).slice(0, 300)));
p.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errs.push(m.text().slice(0, 200)));
await p.goto(`${URL}?go=1&auto=1&speed=2`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__ready, null, { timeout: 20000 });
let i = 0;
const t0 = Date.now();
let res = null;
while ((Date.now() - t0) / 1000 < +max) {
  await p.waitForTimeout(2500);
  const st = await p.evaluate(() => { const b = window.__b(); return { phase: b.phase, wave: b.wave, t: Math.round(b.stats.time), heroes: b.heroes.map((h) => Math.round((h.hp / h.max) * 100)), mobs: b.mobs.filter((m) => !m.dead).length, skills: b.stats.skills }; });
  console.log(JSON.stringify(st));
  if (i < 30) await p.screenshot({ path: `${out}/play_${String(i++).padStart(2, '0')}.png` });
  if (st.phase === 'win' || st.phase === 'lose') {
    await p.waitForTimeout(2600);
    await p.screenshot({ path: `${out}/result.png` });
    res = st;
    break;
  }
}
console.log('결과', JSON.stringify(res), '에러', errs.length ? errs.join(' | ') : '없음');
await b.close();
