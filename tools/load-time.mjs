// 첫 로딩 시간 재기: 빈 캐시로 열어서 타이틀이 뜰 때까지(window.__ready) · 받은 그림 수·용량
//  node tools/load-time.mjs [Mbps=20] [횟수=3]  (먼저 npm run build) · 네트워크는 CDP로 속도 제한 (집 와이파이·4G 정도)
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
const [mbps = '20', runs = '3'] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const srv = createServer((q, r) => {
  let p = join('dist', decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  if (!existsSync(p)) return r.writeHead(404).end();
  r.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p));
}).listen(0);
const exe = existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
const br = await chromium.launch(exe ? { executablePath: exe } : { channel: 'chrome' });
const out = [];
for (let i = 0; i < +runs; i++) {
  const ctx = await br.newContext({ viewport: { width: 844, height: 390 } });
  const p = await ctx.newPage();
  // 웹폰트(Google)는 이 환경에서 못 받으니 막고 잼 (그림·코드만 비교)
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: (+mbps * 1e6) / 8, uploadThroughput: 5e6 / 8 });
  let bytes = 0;
  let pics = 0;
  cdp.on('Network.loadingFinished', (e) => (bytes += e.encodedDataLength));
  p.on('response', (r) => /\.(png|jpg)$/.test(r.url()) && pics++);
  const t0 = Date.now();
  await p.goto(`http://localhost:${srv.address().port}/`);
  await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
  const sec = (Date.now() - t0) / 1000;
  out.push({ sec, mb: +(bytes / 1e6).toFixed(1), pics });
  await ctx.close();
}
await br.close();
srv.close();
console.log(JSON.stringify({ mbps: +mbps, runs: out, avgSec: +(out.reduce((a, b) => a + b.sec, 0) / out.length).toFixed(2) }));
