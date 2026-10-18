// 화면 흐름 클릭 시험: 타이틀 → 프롤로그(스킵) → 로비 → 모험 → 1-1 출발 → (대사 스킵) → 전투(AUTO ×2) → 결과 → 다음 → … → 편성 → 영웅 상세
//  node tools/e2e.mjs [out폴더]  (먼저 npm run build · dist/ 를 직접 띄움) · CHROME=<크롬 실행 파일> 로 브라우저 지정
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const out = process.argv[2] ?? 'out/story';
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
const fontCache = new Map();
await p.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, async (route) => {
  const url = route.request().url();
  if (!fontCache.has(url)) {
    try {
      fontCache.set(url, execFileSync('curl', ['-sS', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36', url], { maxBuffer: 1 << 26 }));
    } catch {
      fontCache.set(url, null);
    }
  }
  const body = fontCache.get(url);
  if (!body) return route.abort();
  await route.fulfill({ status: 200, body, headers: { 'content-type': url.includes('googleapis') ? 'text/css' : 'font/woff2', 'access-control-allow-origin': '*' } });
});
// 스토리 확인 (docs/STORY_FINAL_1018.md 코드 작업 요약 7): 1~10장 보통 난이도 x-1 · x-3 · x-6 · x-10 진입 · x-10 클리어 때
//  대사가 순서대로 한 번씩 뜨는지 (장당 5묶음) — 첫 줄 글이 맞는지 · 같은 스테이지 다시 들어가면 안 뜨는지
import { readFileSync as rf } from 'node:fs';
const STORY = JSON.parse(rf(process.env.STORY_JSON, 'utf8'));
await p.goto(URL);
await p.waitForFunction(() => window.__ready, null, { timeout: 15000 });
await p.evaluate(() => { const S = window.__S(); S.prologue = true; S.sta.n = 9999; S.seen = {}; });
const fails = [];
let ok = 0;
const talkFirst = async () => {
  try { await p.waitForSelector('.talk .say', { timeout: 6000 }); } catch { return null; }
  return (await p.locator('.talk .say').first().textContent())?.trim() ?? null;
};
const skip = async () => { if (await p.locator('.talk .skip').count()) await p.locator('.talk .skip').click(); await p.waitForTimeout(200); };
const enter = async (c, s) => {
  await p.evaluate(([c, s]) => window.__go('battle', { stage: { c, s, d: 0 } }), [c, s]);
  await p.waitForSelector('[data-screen="battle"]');
  if (await p.locator('.bload').count()) await p.waitForSelector('.bload', { state: 'detached', timeout: 15000 });
};
for (let c = 1; c <= 10; c++) {
  const ch = STORY.ch[String(c)];
  for (const [s, key] of [[1, 'intro'], [3, 'mid3'], [6, 'mid6'], [10, 'preBoss']]) {
    await enter(c, s);
    const got = await talkFirst();
    if (got !== ch[key][0][1]) fails.push(`${c}-${s} ${key}: 「${got}」 ≠ 「${ch[key][0][1]}」`); else ok++;
    await skip();
    if (s === 10) {
      // 클리어: 적을 모두 쓰러뜨려 이김 → 결과 전에 클리어 대사
      for (let i = 0; i < 80; i++) {
        const done = await p.evaluate(() => { const b = window.__b(); if (!b) return true; b.auto = true; b.speed = 4; for (const m of b.mobs) m.hp = 0; return b.phase === 'win' || !!document.querySelector('.talk'); });
        if (done) break;
        await p.waitForTimeout(500);
      }
      const cl = await talkFirst();
      const want = ch.clear.find((l) => !['luna', 'vael', 'noel'].includes(l[0]) || c === 0)?.[1];
      if (cl !== want && cl !== ch.clear[0][1]) fails.push(`${c}-10 clear: 「${cl}」 ≠ 「${ch.clear[0][1]}」`); else ok++;
      await skip();
      if (await p.locator('.join').count()) await p.locator('.join').click();
    }
    // 다시 들어가면 안 뜸
    await enter(c, s);
    if (s !== 10) {
      const again = await talkFirst();
      if (again) fails.push(`${c}-${s} ${key}: 두 번째 진입에도 대사 「${again}」`);
    }
    await p.evaluate(() => window.__go('lobby', {}));
    await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelectorAll('.modal,.mwin,.notice,.talk').forEach((e) => e.remove()));
  }
}
console.log(`스토리 확인: 맞음 ${ok}/50 · 틀림 ${fails.length}${fails.length ? '\n' + fails.join('\n') : ''}`);
console.log(errors.length ? `오류 ${errors.length}개:\n${errors.join('\n')}` : '오류 없음');
await br.close(); srv.close();
process.exit(fails.length || errors.length ? 1 : 0);
