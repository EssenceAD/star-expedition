// 동작 프레임 띠: node tools/strip.mjs <out.png> hero=woongs acts=idle,walk n=6
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { PNG } from 'pngjs';
const [out, ...kv] = process.argv.slice(2);
const o = Object.fromEntries(kv.map((s) => s.split('=')));
const hero = o.hero ?? 'woongs';
const acts = (o.acts ?? 'idle,walk,attack,skill1,skill2,skill3,hurt,down,win').split(',');
const n = +(o.n ?? 6);
const URL = process.env.URL ?? 'http://localhost:5191/';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 330, height: 280 } });
p.on('pageerror', (e) => console.log('pageerror', String(e).slice(0, 200)));
const rows = [];
for (const a of acts) {
  await p.goto(`${URL}lab.html?bar=0&frozen=1&hero=${hero}&act=${a}&w=300&h=240${o.hgt ? '&hgt=' + o.hgt : ''}`, { waitUntil: 'networkidle' });
  await p.waitForFunction(() => window.__ready, null, { timeout: 15000 });
  const len = await p.evaluate((a) => window.__len(a), a);
  const row = [];
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.__at(t), (len * (i + 0.5)) / n);
    row.push(PNG.sync.read(await p.locator('#cv').screenshot()));
  }
  rows.push(row);
}
await b.close();
const fw = rows[0][0].width, fh = rows[0][0].height;
const img = new PNG({ width: fw * n, height: fh * rows.length });
rows.forEach((row, r) => row.forEach((f, c) => PNG.bitblt(f, img, 0, 0, fw, fh, c * fw, r * fh)));
fs.writeFileSync(out, PNG.sync.write(img));
console.log('saved', out);
