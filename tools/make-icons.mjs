// 홈 화면 아이콘 (MOBILE_REF §1-3): 타이틀 그림 + 「별의 원정대」 로고 글씨 → public/icons/ 192 · 512 · apple-touch-icon 180
//  node tools/make-icons.mjs  (먼저 npm run build · 게임 폰트·로고 스타일 그대로 쓰려고 빌드한 페이지 안에서 그림)
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const srv = createServer((q, r) => {
  let p = join('dist', decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  if (!existsSync(p)) return r.writeHead(404).end();
  r.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p));
}).listen(0);
const exe = process.env.CHROME ?? (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const br = await chromium.launch(exe ? { executablePath: exe } : { channel: 'chrome' });
mkdirSync('public/icons', { recursive: true });
for (const [size, name] of [[512, 'icon-512'], [192, 'icon-192'], [180, 'apple-touch-icon']]) {
  const p = await br.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: size / 512 });
  await p.goto(`http://localhost:${srv.address().port}/`);
  await p.waitForFunction(() => window.__ready);
  await p.evaluate(() => {
    const d = document.createElement('div');
    d.id = 'ico';
    // 하늘·빛나는 별 쪽을 크게 (타이틀 그림 위쪽 가운데) + 어둡게 깔고 로고 두 줄
    d.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 45%,transparent 30%,var(--c-veil)),url(art/screens/title.jpg) 72% 8%/auto 1150px';
    d.innerHTML = '<div class="logo" style="transform:scale(2.1);line-height:1"><b><span class="fxt" data-t="별의"><span>별의</span></span></b><b><span class="fxt" data-t="원정대"><span>원정대</span></span></b></div>';
    document.body.append(d);
  });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `public/icons/${name}.png`, clip: { x: 0, y: 0, width: 512, height: 512 } });
  await p.close();
}
await br.close();
srv.close();
console.log('saved public/icons');
