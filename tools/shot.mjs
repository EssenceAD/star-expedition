// 실험실 한 장 찍기: node tools/shot.mjs "<쿼리>" <밀리초|초> <out.png> ["<실행할 JS>"]
import { chromium } from 'playwright-core';
const [qs, t, out, js] = process.argv.slice(2);
const URL = process.env.URL ?? 'http://localhost:5191/';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 960, height: 470 } });
p.on('pageerror', (e) => console.log('pageerror', String(e).slice(0, 200)));
p.on('console', (m) => m.type() === 'error' && console.log('console', m.text().slice(0, 200)));
await p.goto(`${URL}lab.html?bar=0&frozen=1&${qs}`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__ready, null, { timeout: 15000 });
if (js) await p.evaluate(js);
await p.evaluate((t) => window.__at(+t), t);
await p.locator('#cv').screenshot({ path: out });
await b.close();
console.log('saved', out);
