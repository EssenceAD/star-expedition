// 웅스 컷인 순간 한 장 (?rec=1 로 걸음 진행 → 컷인 0.25초 지점)
import { chromium } from 'playwright-core';
const out = process.argv[2] ?? 'out/cutin.png';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:5191/?go=1&rec=1&auto=1', { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__ready, null, { timeout: 20000 });
for (let i = 0; i < 3000; i++) {
  const ok = await p.evaluate(() => { window.__tick(1 / 30); const c = window.__b().cut; return c && c.hero.id === 'woongs' && c.t > 0.22; });
  if (ok) break;
}
await p.screenshot({ path: out });
await b.close();
console.log('saved', out);
