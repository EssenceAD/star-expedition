// 화면 흐름 클릭 시험: 타이틀 → 프롤로그(스킵) → 로비 → 모험 → 1-1 출발 → (대사 스킵) → 전투(AUTO ×2) → 결과 → 다음 → … → 편성 → 영웅 상세
//  node tools/e2e.mjs [out폴더]  (먼저 npm run build · dist/ 를 직접 띄움) · CHROME=<크롬 실행 파일> 로 브라우저 지정
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const out = process.argv[2] ?? 'out/e2e';
mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const srv = createServer((q, r) => {
  let p = join('dist', decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  if (!existsSync(p)) return r.writeHead(404).end();
  r.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream', date: new Date().toUTCString() }).end(readFileSync(p));
}).listen(0);
const URL = `http://localhost:${srv.address().port}/`;
const exe = process.env.CHROME ?? (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const br = await chromium.launch(exe ? { executablePath: exe } : { channel: 'chrome' });
const p = await br.newPage({ viewport: { width: Number(process.env.W ?? 900), height: Number(process.env.H ?? 412) } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text()));
p.on('response', (r) => r.status() >= 400 && !r.url().endsWith('/favicon.ico') && errors.push(`${r.status()} ${r.url()}`));
p.on('requestfailed', (r) => errors.push(`실패 ${r.url()}`));
let n = 0;
const shot = async (name) => p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}_${name}.png` });
const click = async (sel) => p.locator(sel).first().click();
const skipTalk = async () => {
  if (await p.locator('.talk .skip').count()) await click('.talk .skip');
};
await p.goto(URL);
await p.waitForFunction(() => window.__ready, null, { timeout: 15000 });
await p.waitForTimeout(300);
await shot('title');
// 첫 진입: 원정 출발 → 1-1 필드에서 프롤로그 → 전투 → 승리 → 원정대 여관
await click('[data-go]');
async function playStage(label) {
  await p.waitForSelector('[data-screen="battle"]');
  await p.waitForTimeout(300);
  if (await p.locator('.talk').count()) {
    await shot(`${label}_talk`);
    await skipTalk();
  }
  await p.evaluate(() => {
    const b = window.__b();
    b.auto = true;
    b.speed = 2;
  });
  await p.waitForTimeout(2500);
  await shot(`${label}_battle`);
  await p.waitForFunction(() => !document.querySelector('#result').hidden || document.querySelector('.talk') || document.querySelector('.join'), null, { timeout: 120000 });
  if (await p.locator('.talk').count()) {
    await shot(`${label}_clear_talk`);
    await skipTalk();
  }
  if (await p.locator('.join').count()) {
    await shot(`${label}_join`);
    await click('.join');
  }
  await p.waitForFunction(() => !document.querySelector('#result').hidden, null, { timeout: 5000 });
  await shot(`${label}_result`);
}
await playStage('1-1');
await click('#result [data-a="lobby"]');
await p.waitForSelector('[data-screen="lobby"]');
await p.waitForTimeout(400);
if (await p.locator('.modal').count()) await click('.modal .btn.hi');
await shot('lobby');
await click('[data-go="adventure"]');
await p.waitForSelector('[data-screen="adventure"]');
await shot('adventure');
await click('[data-prep]');
await p.waitForSelector('[data-screen="prep"]');
await shot('prep');
await click('[data-start]');
await playStage('1-2');
for (let i = 3; i <= Number(process.env.STAGES ?? 3); i++) {
  await click('#result [data-a="next"]');
  await playStage(`1-${i}`);
}
await click('#result [data-a="lobby"]');
await p.waitForSelector('[data-screen="lobby"]');
await click('[data-go="prep"]');
await p.waitForSelector('[data-screen="prep"]');
await click('[data-tab="back"]');
await click('[data-h="warmnight"]');
await shot('formation_back_tab');
await click('[data-back]');
await click('[data-go="heroes"]');
await p.waitForSelector('[data-screen="heroes"]');
await click('[data-tab="none"]');
await shot('heroes_unowned');
await click('[data-h="hwang"]');
await shot('hero_hwang');
await br.close();
srv.close();
console.log(errors.length ? `오류 ${errors.length}개:\n${errors.join('\n')}` : '오류 없음', `· 사진 ${n}장 → ${out}`);
process.exit(errors.length ? 1 : 0);
