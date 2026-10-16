// 전투 GIF: ?rec=1 로 고정 걸음 녹화 → gifenc (프레임마다 팔레트)
//  node tools/gif.mjs <out.gif> [초=14] [fps=12] [건너뛸 초=0] [쿼리=auto=1&speed=1]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
const [out, secs = '14', fps = '12', skip = '0', qs = 'auto=1&speed=1'] = process.argv.slice(2);
const URL = process.env.URL ?? 'http://localhost:5191/';
const W = +(process.env.W ?? 640);
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: W / 844 });
p.on('pageerror', (e) => console.log('pageerror', String(e).slice(0, 200)));
await p.goto(`${URL}?go=1&rec=1&${qs}`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__ready, null, { timeout: 20000 });
const dt = 1 / +fps;
// 앞부분 건너뛰기 (빠르게)
for (let t = 0; t < +skip; t += 0.05) await p.evaluate(() => window.__tick(0.05));
const gif = GIFEncoder();
const n = Math.round(+secs * +fps);
for (let i = 0; i < n; i++) {
  await p.evaluate((dt) => window.__tick(dt), dt);
  const png = PNG.sync.read(await p.screenshot());
  const pal = quantize(png.data, +(process.env.COLORS ?? 256), { format: 'rgb565' });
  const idx = applyPalette(png.data, pal, 'rgb565');
  gif.writeFrame(idx, png.width, png.height, { palette: pal, delay: Math.round(1000 * dt) });
}
gif.finish();
fs.writeFileSync(out, gif.bytes());
const st = await p.evaluate(() => { const b = window.__b(); return { phase: b.phase, wave: b.wave, t: Math.round(b.stats.time) }; });
console.log('saved', out, (fs.statSync(out).size / 1e6).toFixed(1) + 'MB', JSON.stringify(st));
await b.close();
