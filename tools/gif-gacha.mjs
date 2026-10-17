// 장비 소환 연출 GIF (docs/PLAYTEST_1017.md §11 확인용): 상점 소환 탭 위에서 __gachaDemo(등급들) 실시간 녹화 → gifenc
//  node tools/gif-gacha.mjs [out.gif] [등급=1,2,0,3,1,4,2,1,0,2] [초=8]  (먼저 npm run build · W=844 H=390 · ffmpeg 필요)
//  CDP 화면 스트림(jpeg 프레임 · 실제 시각) → ffmpeg 팔레트 GIF (15fps)
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
const [out = 'out/gacha.gif', grades = '1,2,0,3,1,4,2,1,0,2', secs = '8'] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const srv = createServer((q, r) => {
  let p = join('dist', decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  if (!existsSync(p)) return r.writeHead(404).end();
  r.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p));
}).listen(0);
const exe = process.env.CHROME ?? (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const br = await chromium.launch(exe ? { executablePath: exe } : { channel: 'chrome' });
const size = { width: Number(process.env.W ?? 844), height: Number(process.env.H ?? 390) };
const vid = mkdtempSync(join(tmpdir(), 'gacha-'));
const p = await br.newPage({ viewport: size });
p.on('pageerror', (e) => console.log('pageerror', String(e)));
await p.goto(`http://localhost:${srv.address().port}/`);
await p.waitForFunction(() => window.__ready);
await p.evaluate(() => {
  const S = window.__S();
  S.prologue = true;
  window.__go('shop', { cat: 'summon' });
  document.querySelectorAll('.modal').forEach((m) => m.remove());
});
// 연출 그림 미리 받아 두기 (첫 프레임부터 그림이 보이게)
await p.evaluate(async () => {
  const names = ['circle', 'orb', 'card_back', 'ribbon', 'beam_legend', 'sparkle', ...['common', 'uncommon', 'rare', 'epic', 'legend'].map((k) => `burst_${k}`)];
  await Promise.all(names.map((n) => new Promise((ok) => { const i = new Image(); i.onload = i.onerror = ok; i.src = `art/ui/gacha/${n}.png`; })));
});
await p.waitForTimeout(600);
const cdp = await p.context().newCDPSession(p);
const frames = [];
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  frames.push([data, metadata.timestamp]);
  void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: size.width, maxHeight: size.height });
await p.evaluate((g) => window.__gachaDemo(g.split(',').map(Number)), grades);
await p.waitForTimeout(+secs * 1000);
await cdp.send('Page.stopScreencast');
// 프레임마다 실제 걸린 시간 그대로 (ffmpeg concat duration)
let list = '';
frames.forEach(([data, ts], i) => {
  writeFileSync(join(vid, `${i}.jpg`), Buffer.from(data, 'base64'));
  list += `file '${i}.jpg'\nduration ${Math.max(0.01, (frames[i + 1]?.[1] ?? ts + 1) - ts).toFixed(3)}\n`;
});
writeFileSync(join(vid, 'list.txt'), list + `file '${frames.length - 1}.jpg'\n`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(vid, 'list.txt'), '-vf', 'fps=15,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', out]);
console.log(frames.length, 'frames');
rmSync(vid, { recursive: true, force: true });
console.log('saved', out, (statSync(out).size / 1e6).toFixed(1) + 'MB');
await br.close();
srv.close();
