// 화면 흐름 클릭 시험: 타이틀 → 프롤로그(스킵) → 로비 → 모험 → 1-1 출발 → (대사 스킵) → 전투(AUTO ×2) → 결과 → 다음 → … → 편성 → 영웅 상세
//  node tools/e2e.mjs [out폴더]  (먼저 npm run build · dist/ 를 직접 띄움) · CHROME=<크롬 실행 파일> 로 브라우저 지정
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
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
// 웹폰트(Google Fonts): 브라우저는 프록시를 못 거치니 curl로 받아 넘김 (TLS 검사는 curl이 그대로 함)
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
// B덩어리: 상점(꾸러미·영웅·소환) → 가방(장비 상세·강화) → 영웅 정보(자동 장착·성장 탭)
await p.evaluate(() => {
  const S = window.__S();
  S.cur.stardust += 5000;
});
await click('[data-back]');
await click('[data-back]');
await p.waitForSelector('[data-screen="lobby"]');
await click('[data-go="shop"]');
await p.waitForSelector('[data-screen="shop"]');
await click('[data-pack="starter"]');
await click('[data-cat="hero"]');
await shot('shop_hero');
// 영입 무대 (recruit.jpg + 전신) → 합류 연출 (별빛 마법진 + 영웅 틀)
await click('[data-hero="hwang"]');
await p.waitForTimeout(600);
await shot('recruit_stage');
await click('.recruit [data-buy]');
await p.waitForTimeout(1800);
await shot('recruit_join');
await click('.recruit');
// 코스튬 상점 → 사기
await click('[data-cat="costume"]');
await shot('shop_costume');
await click('[data-cbuy][data-cid="woongs"]');
await p.evaluate(() => (window.__S().cur.stardust += 5000));
await click('[data-cat="summon"]');
await click('[data-sum="11"]');
// 소환 연출 (src/ui/gacha.ts): 건너뛰기 → 등급순 결과 → 확인
await click('.gacha [data-skip]');
await p.waitForTimeout(500);
await shot('shop_summon');
await click('.gacha [data-ok]');
await click('[data-back]');
await click('[data-go="bag"]');
await p.waitForSelector('[data-screen="bag"]');
await shot('bag');
await click('[data-gear]');
await shot('gear_panel');
// 강화 연출: 아이템 크게 → 망치 → 큰 +N · 능력 전→후 (구간 돌파 연출도 한 번: +9 → +10)
await p.evaluate(() => {
  const S = window.__S();
  S.cur.enh = 99999;
  S.cur.gold = 9e9;
});
await click('.gp [data-a="enh"]');
await p.waitForTimeout(1600);
await shot('enhance_fx');
await click('.enhfx');
await p.evaluate(() => {
  const g = Object.values(window.__S().items).find((x) => x.kind === 'gear' && x.enh > 0);
  g.enh = 9;
  g.pity = 1;
});
await click('.gp [data-a="close"]');
await click('[data-gear]');
await click('.gp [data-a="enh"]');
await p.waitForTimeout(1600);
await shot('enhance_break');
await click('.enhfx');
await click('.gp [data-a="close"]');
await click('[data-back]');
await click('[data-go="heroes"]');
await click('[data-h="woongs"]');
await click('[data-auto]');
await shot('hero_info');
await click('[data-tab="skill"]');
await shot('hero_skill');
// 코스튬 탭에서 입기 → 전신 그림이 코스튬으로
await click('[data-tab="costume"]');
await click('[data-wear="festival"]');
await p.waitForTimeout(300);
await shot('hero_costume');
// C덩어리: 모험 지도 → 콘텐츠(토벌·탑·레이드·월드 보스·결투장·외전·이정표) → 전투 준비 → 전투
await p.evaluate(() => {
  const S = window.__S();
  for (const id of Object.keys(S.heroes)) S.heroes[id].lv = 30;
  for (let n = 1; n <= 10; n++) S.stages[`1-${n}-0`] = { stars: 3, clears: 1, bestTime: 60, bestDps: 1, mvp: 'woongs' };
});
await click('[data-back]');
await click('[data-back]');
await p.waitForSelector('[data-screen="lobby"]');
await click('[data-go="adventure"]');
await shot('field_map');
await click('[data-portal="tower"]');
await p.waitForSelector('[data-screen="portal"]');
await shot('portal_tower');
async function content(tab, label, sel = '[data-run]') {
  await click(`[data-tab="${tab}"]`);
  await shot(`portal_${label}`);
  await click(sel);
  await p.waitForSelector('[data-screen="prep"]');
  await click('[data-runstart]');
  await p.waitForSelector('[data-screen="battle"]');
  await p.waitForTimeout(300);
  if (await p.locator('.talk').count()) await skipTalk();
  await p.evaluate(() => {
    const b = window.__b();
    b.auto = true;
    b.speed = 2;
  });
  await p.waitForTimeout(3000);
  await shot(`${label}_battle`);
  if (label === 'raid' || label === 'world') {
    // 보스 전장: 빨간 경고 → 줄 바꾸기 · 페이즈 · 그로기 다운
    await p.waitForFunction(() => window.__b()?.raid?.warnLane != null, null, { timeout: 30000 });
    await shot(`${label}_warn`);
    await click('#bDodge');
    await p.waitForTimeout(250);
    await shot(`${label}_dodge`);
    await p.waitForFunction(() => window.__b()?.raid?.phase >= 1 || window.__b()?.phase !== 'fight', null, { timeout: 90000 });
    await shot(`${label}_phase`);
  }
  await p.waitForFunction(() => !document.querySelector('#result').hidden, null, { timeout: 150000 });
  if (await p.locator('#result [data-a="leg"]').count()) return shot(`${label}_leg`);
  await shot(`${label}_result`);
  await click('#result [data-a="portal"]');
  await p.waitForSelector('[data-screen="portal"]');
}
await content('raid', 'raid');
await content('arena', 'arena');
await content('world', 'world');
await content('side', 'side');
await click('[data-tab="miles"]');
await shot('portal_miles');
// D덩어리: 미션(받기·바로가기) · 길드(가입·출석·길드 레이드) · 친구 · 랭킹 · 우편 · 채팅 · 설정
await click('[data-back]');
await p.waitForSelector('[data-screen="lobby"]');
if (await p.locator('.modal .btn.hi').count()) await click('.modal .btn.hi');
await shot('lobby_d');
await click('[data-go="mission"]');
await p.waitForSelector('[data-screen="mission"]');
await shot('mission');
if (await p.locator('[data-all]:not([disabled])').count()) await click('[data-all]');
await click('[data-tab="ach"]');
await shot('mission_ach');
await click('[data-back]');
await click('[data-go="guild"]');
await click('[data-join="ai1"]');
await click('[data-att]');
await shot('guild');
await click('[data-tab="chat"]');
await p.fill('[data-in]', '안녕하세요 원정대!');
await click('[data-send]');
await shot('guild_chat');
await click('[data-tab="raid"]');
await click('[data-graid]');
await p.waitForSelector('[data-screen="prep"]');
await click('[data-runstart]');
await p.waitForSelector('[data-screen="battle"]');
await p.evaluate(() => {
  const b = window.__b();
  b.auto = true;
  b.speed = 2;
});
await p.waitForFunction(() => !document.querySelector('#result').hidden, null, { timeout: 120000 });
await shot('graid_result');
await click('#result [data-a="lobby"]');
await p.waitForSelector('[data-screen="lobby"]');
await click('[data-go="friends"]');
await click('[data-add]');
await click('[data-gift]');
await shot('friends');
await click('[data-back]');
await click('[data-go="ranking"]');
await shot('ranking');
await click('[data-back]');
await click('#topbar [data-ic="mail"]');
await p.waitForSelector('[data-screen="mail"]');
await shot('mail');
await click('[data-all]');
await click('#ticker');
await shot('chat');
await click('.modal [data-x]');
await click('[data-back]');
await click('[data-go="settings"]');
await p.waitForTimeout(300);
await shot('settings');
// 결투장 직접 고르기: 영광의 리그 밴픽 · 최후의 리그 파티 2·3 편성
await p.evaluate(() => window.__go('prep', { run: { mode: 'arena', arg: 'glory', sub: 0 } }));
await p.waitForSelector('[data-ban]');
await click('[data-ban]');
await click('[data-swap]');
await shot('glory_banpick');
await p.evaluate(() => window.__go('prep', { run: { mode: 'arena', arg: 'last', sub: 0 } }));
await click('[data-lastform]');
await click('.lfr [data-h]');
await shot('last_form');
await click('.modal .btn.hi');
await br.close();
srv.close();
console.log(errors.length ? `오류 ${errors.length}개:\n${errors.join('\n')}` : '오류 없음', `· 사진 ${n}장 → ${out}`);
process.exit(errors.length ? 1 : 0);
