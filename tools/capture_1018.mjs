// UI_KIT_1018 확인 캡처: 정답 화면(docs/captures/target_1018)과 같은 장면을 844×390 @2로 찍어 docs/captures/impl_1018/<화면>.jpg
//  node tools/capture_1018.mjs [장면…]   (먼저 npm run build · dist/ 를 직접 띄움)
//  장면: title lobby battle_start battle victory result heroes popup busts safe (기본: 전부)
//  비교 그림(<화면>_cmp.jpg · 위 정답 / 아래 구현)은 python3 tools/cmp_1018.py
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const OUT = 'docs/captures/impl_1018';
mkdirSync(OUT, { recursive: true });
const ALL = ['title', 'lobby', 'battle_start', 'battle', 'victory', 'result', 'heroes', 'popup', 'busts', 'safe'];
const want = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const srv = createServer((q, r) => {
  let p = join('dist', decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  if (!existsSync(p)) return r.writeHead(404).end();
  r.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p));
}).listen(0);
const URL = `http://localhost:${srv.address().port}/`;
const exe = process.env.CHROME ?? (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const br = await chromium.launch(exe ? { executablePath: exe } : { channel: 'chrome' });
const fontCache = new Map();
const errors = [];
async function page(w = 844, h = 390, query = '') {
  const p = await br.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
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
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text()));
  // 저장 상태: 프롤로그 끝 · 1장 몇 판 깬 원정대 (매번 같은 장면)
  await p.addInitScript(() => {
    Math.random = (() => {
      let s = 7;
      return () => ((s = (s * 16807) % 2147483647) / 2147483647);
    })();
  });
  await p.goto(`${URL}?${query}`);
  await p.waitForFunction(() => window.__ready, null, { timeout: 20000 });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => {
    const S = window.__S();
    S.prologue = true;
    S.acc.name = '형철';
    S.acc.lv = 4;
    S.acc.exp = Math.round(S.acc.exp);
    S.cur.gold = 12480;
    S.cur.stardust = 340;
    for (const k of ['1:intro', '1:preBoss', '1:clear']) S.seen[k] = true;
    S.idle && (S.idle.at = Date.now());
  });
  return p;
}
const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 90 });
const closeModals = (p) => p.evaluate(() => document.querySelectorAll('.modal, .kpop').forEach((m) => m.remove()));
/** 녹화 모드(?rec=1)에서 게임 시간 n초 진행 */
const tick = (p, sec, dt = 1 / 30) => p.evaluate(([sec, dt]) => { for (let t = 0; t < sec; t += dt) window.__tick(dt); }, [sec, dt]);

async function battleScene(p, stopAt) {
  // 1-2: 웅스·고느끼·이카몰리·왈왈콩선생 (정답 화면과 같은 파티)
  await p.evaluate(() => {
    const S = window.__S();
    S.party = ['woongs', 'gonu', 'ikamolly', 'walwal'];
    for (const id of S.party) if (S.heroes[id]) S.heroes[id].lv = 5;
    window.__go('battle', { stage: { c: 1, s: 2, d: 0 } });
  });
  await p.waitForFunction(() => !window.__artWait(), null, { timeout: 20000 });
  await tick(p, 0.05);
  await p.waitForTimeout(350);
  return stopAt(p);
}

for (const name of want) {
  if (name === 'title') {
    const p = await page();
    await p.evaluate(() => window.__go('title', {}, false));
    await p.waitForTimeout(900);
    await shot(p, 'title');
    await p.close();
  } else if (name === 'lobby') {
    const p = await page();
    await p.evaluate(() => window.__go('lobby', {}, false));
    await p.waitForTimeout(600);
    await closeModals(p);
    await p.waitForTimeout(2500);
    await shot(p, 'lobby');
    await p.close();
  } else if (name === 'heroes') {
    const p = await page();
    await p.evaluate(() => {
      const S = window.__S();
      for (const id of ['woongs', 'gonu', 'ikamolly', 'walwal', 'grom', 'bube', 'aria', 'ayla']) S.heroes[id] ??= { lv: 1, exp: 0, awaken: 0, star: 1, skill: [1, 1, 1], trans: [], ex: 0, gear: { weapon: null, armor: null, acc1: null, acc2: null } };
      window.__go('heroes', {}, false);
    });
    await p.waitForTimeout(1200);
    await closeModals(p);
    await shot(p, 'heroes');
    await p.close();
  } else if (name === 'popup') {
    const p = await page();
    await p.evaluate(() => window.__go('lobby', {}, false));
    await p.waitForTimeout(500);
    await closeModals(p);
    await p.evaluate(() => window.__popupDemo());
    await p.waitForTimeout(700);
    await shot(p, 'popup');
    await p.close();
  } else if (['battle_start', 'battle', 'victory', 'result'].includes(name)) {
    const p = await page(844, 390, 'rec=1');
    await battleScene(p, async (p) => {
      if (name === 'battle_start') {
        await tick(p, 0.3);
        await p.waitForTimeout(300);
        return shot(p, name);
      }
      await p.evaluate(() => (window.__b().auto = true));
      if (name === 'battle') {
        // 첫 웨이브 몹이 다 들어오고 싸우는 중 · 스킬 하나는 쿨타임
        await tick(p, 3.2);
        await p.evaluate(() => window.__cast(1, 1));
        await tick(p, 1.2);
        await p.waitForTimeout(400);
        return shot(p, name);
      }
      await p.evaluate(() => { const b = window.__b(); for (const h of b.heroes) (h.atk *= 30); });
      for (let i = 0; i < 900 && (await p.evaluate(() => window.__b().phase)) !== 'win'; i++) await tick(p, 0.5);
      if (name === 'victory') {
        // 승리 → resultDelayWin 뒤 VICTORY 글씨 (실시간 타이머) → 글씨가 뜰 때 찍음
        await p.evaluate(() => { for (let i = 0; i < 300 && !document.querySelector('#cue .word_victory'); i++) window.__tick(1 / 30); });
        await tick(p, 0.4);
        await p.waitForTimeout(500);
        return shot(p, name);
      }
      for (let i = 0; i < 40 && (await p.evaluate(() => document.querySelector('#result').hidden)); i++) {
        await tick(p, 0.25);
        await p.waitForTimeout(120);
      }
      await tick(p, 3);
      await p.waitForTimeout(1500);
      return shot(p, name);
    });
    await p.close();
  } else if (name === 'boss_intro' || name === 'pause') {
    // (확인용) 보스 등장 카드 · 일시정지 메뉴
    const p = await page(844, 390, 'rec=1');
    await p.evaluate((pause) => {
      const S = window.__S();
      S.party = ['woongs', 'gonu', 'ikamolly', 'walwal'];
      window.__go('battle', { stage: { c: 1, s: pause ? 2 : 10, d: 0 } });
    }, name === 'pause');
    await p.waitForFunction(() => !window.__artWait(), null, { timeout: 20000 });
    if (name === 'pause') {
      await tick(p, 4);
      await p.click('#bPause');
      await p.waitForTimeout(400);
      await shot(p, 'pause');
    } else {
      await p.evaluate(() => { const b = window.__b(); b.auto = true; for (const h of b.heroes) (h.atk *= 40); });
      await p.evaluate(() => { for (let i = 0; i < 1200 && !document.querySelector('#cue .boss'); i++) window.__tick(1 / 30); });
      await tick(p, 0.4);
      await p.waitForTimeout(600);
      if (process.env.DBG) console.log(await p.evaluate(() => { const c = document.querySelector('.cue.boss'); return [c.className, c.getAnimations().map((a) => a.animationName + ':' + a.playState + ':' + a.currentTime), document.timeline.currentTime, c && getComputedStyle(c).opacity, c && getComputedStyle(c).display, c && JSON.stringify(c.getBoundingClientRect()), getComputedStyle(document.querySelector('#cue')).display]; }));
      await shot(p, 'boss_intro');
    }
    await p.close();
  } else if (name === 'busts') {
    const p = await page(1360, 900);
    const data = await p.evaluate(() => window.__bustSheet());
    writeFileSync(`${OUT}/busts.jpg`, Buffer.from(data.split(',')[1], 'base64'));
    await p.close();
  } else if (name === 'safe') {
    for (const [w, h] of [[844, 390], [932, 430], [667, 375], [1180, 820], [1920, 1040]]) {
      const p = await page(w, h, 'rec=1');
      await battleScene(p, async (p) => {
        await p.evaluate(() => (window.__b().auto = true));
        await tick(p, 4);
        await p.waitForTimeout(400);
        await p.screenshot({ path: `${OUT}/safe_${w}x${h}.jpg`, type: 'jpeg', quality: 85 });
      });
      await p.close();
    }
  }
  console.log('·', name);
}
await br.close();
srv.close();
console.log(errors.length ? `오류 ${errors.length}개:\n${errors.join('\n')}` : '오류 없음');
