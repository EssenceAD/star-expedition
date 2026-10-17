// 모바일 확인 (docs/MOBILE_REF_1017.md 확인): 폰 흉내(터치·isMobile)로 4가지 상태 + 키보드 열린 채팅
//  node tools/shot-mobile.mjs [out폴더]  (먼저 npm run build)
//  1 세로로 연 화면(게임이 90° 돌아 있음 · 버튼 터치가 제자리에 먹는지 탭으로 확인) 2 가로 3 안드로이드 전체 화면 4 홈 화면 실행(display-mode 흉내) 5 채팅 + 키보드(visualViewport 줄임)
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const [out = 'out/mobile'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const srv = createServer((q, r) => {
  let p = join('dist', decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith('/')) p += 'index.html';
  if (!existsSync(p)) return r.writeHead(404).end();
  r.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p));
}).listen(0);
const URL = `http://localhost:${srv.address().port}/`;
const exe = process.env.CHROME ?? (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const br = await chromium.launch(exe ? { executablePath: exe } : { channel: 'chrome' });
const fails = [];
const check = (ok, what) => (console.log(ok ? 'ok  ' : 'FAIL', what), ok || fails.push(what));
/** 폰 하나 (아이폰 13 크기 · 터치) */
const phone = async (w, h, setup) => {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('pageerror', String(e)));
  if (setup) await setup(p);
  await p.goto(URL);
  await p.waitForFunction(() => window.__ready);
  await p.waitForTimeout(500);
  return p;
};
const progressed = (p) =>
  p.evaluate(() => {
    const S = window.__S();
    S.prologue = true;
    for (const c of [1, 2, 3]) S.seen[`${c}:intro`] = S.seen[`${c}:preBoss`] = true;
  });

// 1 세로로 연 화면: 돌려 그림 + 「원정 출발」·로비 메뉴를 실제 터치로
{
  const p = await phone(390, 844);
  await progressed(p);
  check(await p.evaluate(() => document.documentElement.classList.contains('rot')), '세로 → 게임 90° 돌림');
  await p.screenshot({ path: `${out}/1_portrait_title.png` });
  await p.tap('#title [data-go]');
  await p.waitForSelector('[data-screen="lobby"]', { timeout: 8000 }).catch(() => {});
  check(await p.evaluate(() => !!document.querySelector('[data-screen="lobby"]')), '세로: 「원정 출발」 터치 → 로비');
  await p.evaluate(() => document.querySelectorAll('.modal').forEach((m) => m.remove()));
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/1_portrait_lobby.png` });
  await p.tap('[data-go="shop"]');
  await p.waitForSelector('[data-screen="shop"]', { timeout: 8000 }).catch(() => {});
  check(await p.evaluate(() => !!document.querySelector('[data-screen="shop"]')), '세로: 로비 「상점」 터치 → 상점');
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/1_portrait_shop.png` });
  // 폰을 실제로 가로로 돌림 → 회전 풀고 그대로
  await p.setViewportSize({ width: 844, height: 390 });
  await p.waitForTimeout(400);
  check(await p.evaluate(() => !document.documentElement.classList.contains('rot')), '세로 → 가로로 돌리면 회전 풂');
  await p.context().close();
}
// 2 가로 (주소창 있는 브라우저 · 아이폰 사파리 가로 ≈ 844×340)
{
  const p = await phone(844, 340);
  await progressed(p);
  await p.screenshot({ path: `${out}/2_landscape_browser.png` });
  await p.context().close();
}
// 3 안드로이드 전체 화면: 「원정 출발」 터치 → requestFullscreen (+ 가로 잠금 시도) · 주소창 없는 844×390
{
  const p = await phone(844, 390);
  await progressed(p);
  await p.tap('#title [data-go]');
  await p.waitForTimeout(800);
  check(await p.evaluate(() => !!document.fullscreenElement), '안드로이드: 첫 터치 → 전체 화면');
  await p.evaluate(() => document.querySelectorAll('.modal').forEach((m) => m.remove()));
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/3_android_fullscreen.png` });
  await p.context().close();
}
// 4 홈 화면 실행 (아이폰 홈 화면 아이콘 실행 = navigator.standalone 흉내 · 주소창 없는 844×390 · 안내 띠 안 뜸)
//  (이 크롬은 display-mode 흉내를 못 해서 standalone 쪽으로 · 실제 기기 확인은 형철 님 폰에서)
{
  const p = await phone(844, 390, (pg) => pg.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true })));
  check(await p.evaluate(() => navigator.standalone === true), '홈 화면 실행 흉내 (navigator.standalone)');
  check(await p.evaluate(() => !document.querySelector('.a2hs')), '홈 화면 실행: 「홈 화면에 추가」 띠 안 뜸');
  await p.screenshot({ path: `${out}/4_homescreen.png` });
  await p.context().close();
}
// 0 처음 들어온 브라우저: 「홈 화면에 추가」 띠 · 닫으면 다시 안 뜸
{
  const p = await phone(844, 390);
  check(await p.evaluate(() => !!document.querySelector('.a2hs')), '처음: 「홈 화면에 추가」 띠');
  await p.screenshot({ path: `${out}/0_a2hs.png` });
  await p.tap('.a2hs [data-x]');
  await p.reload();
  await p.waitForFunction(() => window.__ready);
  check(await p.evaluate(() => !document.querySelector('.a2hs')), '띠 닫으면 다시 안 뜸');
  await p.context().close();
}
// 5 채팅 + 키보드 (가로 844×390 · 키보드가 아래 220px 덮는다고 visualViewport 흉내 · 회색 칸 = 키보드 자리)
{
  const p = await phone(844, 390);
  await progressed(p);
  await p.evaluate(() => {
    const S = window.__S();
    const say = [['별 사냥꾼', '방패장인 별가루 모아서 영웅 사야지'], ['탑 정복자', '여관단골 어려움 난이도 열렸다!'], ['결투의 별', '새벽등불 DPS 미터 보니까 MVP가 사제임 ㄷㄷ'], ['칼바람', '월드 보스 같이 가실 분'], ['심연낚시', '오늘 요일 던전 재료 뭐예요?']];
    for (const [title, text] of say) S.chat.push({ ch: 'world', name: '원정대원', title, text, at: Date.now() });
    window.__go('lobby');
  });
  await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelectorAll('.modal').forEach((m) => m.remove()));
  await p.tap('#ticker');
  await p.waitForSelector('.chatp');
  await p.screenshot({ path: `${out}/5_chat_open.png` });
  const KB = 220;
  await p.evaluate((kb) => {
    const vv = window.visualViewport;
    Object.defineProperty(vv, 'height', { get: () => innerHeight - kb, configurable: true });
    Object.defineProperty(vv, 'offsetTop', { get: () => 0, configurable: true });
  }, KB);
  await p.tap('.chatp [data-in]');
  await p.evaluate(() => window.visualViewport.dispatchEvent(new Event('resize')));
  await p.waitForTimeout(300);
  const box = await p.evaluate(() => {
    const r = document.querySelector('.chatp .chatrow').getBoundingClientRect();
    return { bottom: r.bottom, vis: visualViewport.height };
  });
  check(box.bottom <= box.vis + 1 && box.bottom > box.vis - 40, `채팅: 입력줄이 키보드 바로 위 (입력줄 아래 ${Math.round(box.bottom)} · 보이는 높이 ${box.vis})`);
  // 키보드 자리 표시 (캡처용)
  await p.evaluate((kb) => {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;left:0;right:0;bottom:0;height:${kb}px;z-index:99999;background:#3a3a3e;color:#ddd;display:flex;align-items:center;justify-content:center;font:16px sans-serif`;
    d.textContent = '키보드 자리 (흉내)';
    document.body.append(d);
  }, KB);
  await p.screenshot({ path: `${out}/5_chat_keyboard.png` });
  await p.tap('.chatp [data-quick]');
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/5_chat_keyboard_quick.png` });
  const n0 = await p.evaluate(() => window.__S().chat.length);
  await p.tap('.qpop [data-q]');
  await p.waitForTimeout(200);
  check((await p.evaluate(() => window.__S().chat.length)) > n0, '빠른 채팅: 한 번 누르면 바로 보냄');
  await p.context().close();
}
await br.close();
srv.close();
console.log(fails.length ? `실패 ${fails.length}` : '모두 통과', '→', out);
process.exit(fails.length ? 1 : 0);
