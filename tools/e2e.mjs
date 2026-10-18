// 화면 흐름 클릭 시험: 타이틀 → 프롤로그(스킵) → 로비 → 모험 → 1-1 출발 → (대사 스킵) → 전투(AUTO ×2) → 결과 → 다음 → … → 편성 → 영웅 상세
//  node tools/e2e.mjs [out폴더]  (먼저 npm run build · dist/ 를 직접 띄움) · CHROME=<크롬 실행 파일> 로 브라우저 지정
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
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
p.on('requestfailed', (r) => !(/\.mp3(\?|$)/.test(r.url()) && /ABORTED/.test(r.failure()?.errorText ?? '')) && errors.push(`실패 ${r.url()} ${r.failure()?.errorText ?? ''}`)); // 곡이 바뀌어 끊긴 음악 받기는 정상
let n = 0;
// FINAL_1018 §7 자동 시험: 화면을 찍을 때마다 그 화면에서 어긋난 요소 수를 셈 → out/tests.json
//  T1 틀 밖 튀어나옴: .framed-in 자식이 그 창 사각형 밖으로 나감
//  T2 글꼴: 보이는 글씨 요소의 글꼴 첫 이름이 UI 글꼴(갈무리 11 도트)이 아님
//  T3 의도치 않은 넘침: 스크롤 목록(.scroll)·끌어서 보는 지도(.pan)가 아닌 상자(overflow ≠ visible)에서 scroll > client (글씨 요소는 T4)
//  T4 잘린 글씨: 글씨를 가진 요소의 scrollWidth > clientWidth
//  T5 화면 밖: 보이는 요소(잘라 내는 조상 안쪽 부분)가 화면 사각형 밖으로 나감
const UI_FONT = 'Galmuri11';
const report = [];
const measure = () =>
  p.evaluate((UI_FONT) => {
    const vis = (e) => {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      for (let x = e; x; x = x.parentElement) {
        const c = getComputedStyle(x);
        if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false;
      }
      return true;
    };
    const name = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''}`;
    const t1 = [], t2 = [], t3 = [], t4 = [], t5 = [];
    const W = innerWidth, H = innerHeight, E = 1.5;
    for (const e of document.querySelectorAll('body *')) {
      if (!(e instanceof HTMLElement) || !vis(e)) continue;
      const c = getComputedStyle(e);
      const own = [...e.childNodes].some((k) => k.nodeType === 3 && k.textContent.trim());
      if (own && c.fontFamily.split(',')[0].replace(/["']/g, '').trim() !== UI_FONT) t2.push(`${name(e)} ${c.fontFamily.split(',')[0]}`);
      // T5: 잘라 내는 조상과 겹치는 부분만 · 그 부분이 화면 밖으로
      let r = e.getBoundingClientRect();
      let [x0, y0, x1, y1] = [r.left, r.top, r.right, r.bottom];
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const ac = getComputedStyle(a);
        if (ac.overflowX !== 'visible' || ac.overflowY !== 'visible') {
          const ar = a.getBoundingClientRect();
          ((x0 = Math.max(x0, ar.left)), (y0 = Math.max(y0, ar.top)), (x1 = Math.min(x1, ar.right)), (y1 = Math.min(y1, ar.bottom)));
        }
      }
      if (x1 - x0 > E && y1 - y0 > E && (x0 < -E || y0 < -E || x1 > W + E || y1 > H + E)) t5.push(`${name(e)} ${Math.round(x0)},${Math.round(y0)}~${Math.round(x1)},${Math.round(y1)}`);
      if (e.classList.contains('framed-in')) {
        const fr = e.getBoundingClientRect();
        for (const k of e.children) {
          const kr = k.getBoundingClientRect();
          if (kr.width && (kr.left < fr.left - E || kr.top < fr.top - E || kr.right > fr.right + E || kr.bottom > fr.bottom + E)) t1.push(`${name(e.parentElement)} > ${name(k)}`);
        }
      }
      if (c.display === 'inline' || c.display === 'contents' || e.tagName === 'CANVAS') continue;
      if (own) {
        if (e.scrollWidth > e.clientWidth + 1) t4.push(`${name(e)} 「${e.textContent.trim().slice(0, 16)}」 ${e.scrollWidth}>${e.clientWidth}`);
      } else if (!e.classList.contains('scroll') && !e.classList.contains('pan')) {
        const ox = c.overflowX !== 'visible' && e.scrollWidth > e.clientWidth + 1;
        const oy = c.overflowY !== 'visible' && e.scrollHeight > e.clientHeight + 1;
        if (ox || oy) t3.push(`${name(e)}${ox ? ` 가로 ${e.scrollWidth}>${e.clientWidth}` : ''}${oy ? ` 세로 ${e.scrollHeight}>${e.clientHeight}` : ''}`);
      }
    }
    return { t1, t2, t3, t4, t5 };
  }, UI_FONT);
const shot = async (name) => {
  const file = `${String(++n).padStart(2, '0')}_${name}`;
  await p.screenshot({ path: `${out}/${file}.png` });
  report.push({ file, ...(await measure()) });
  // 중간에 멈춰도 결과가 남게 매번 씀
  writeFileSync(`${out}/tests.json`, JSON.stringify(report, null, 1));
};
const click = async (sel) => p.locator(sel).first().click();
const skipTalk = async () => {
  if (await p.locator('.talk .skip').count()) await click('.talk .skip');
};
await p.goto(URL);
await p.waitForFunction(() => window.__ready, null, { timeout: 15000 });
// 화면을 넘겨 버리는 안내(마지막에 버튼을 대신 눌러 줌)는 미리 본 걸로 · 첫 로비·첫 전투 안내는 그대로
await p.evaluate(() => ['hero', 'shop', 'portal', 'auto', 'world', 'capital'].forEach((k) => (window.__S().seen[`tut:${k}`] = true)));
// 튜토리얼 손가락 안내 · 전투 시작 컷씬 · 튜토리얼 보상 합류 무대(v0.16): 사람처럼 1.2초 보고 눌러 넘김
await p.evaluate(() => setInterval(() => ['.coach', '.bstart', '.recruit.gift', '.mwin [data-x]'].forEach((s) => {
  const el = document.querySelector(s);
  if (!el) return;
  el.dataset.seenAt ??= String(Date.now());
  if (Date.now() - Number(el.dataset.seenAt) > 1200) el.click();
}), 300));
await p.waitForTimeout(300);
await shot('title');
// 첫 진입: 원정 출발 → 1-1 필드에서 프롤로그 → 전투 → 승리 → 메인(모험 지도)
await click('[data-go]');
/** 메인 지도 도착: 처음 뜨는 이정표 창(S5)은 찍고 닫고 · 알림 카드(S4)는 걷어 냄 */
let milesShot = false;
async function toLobby() {
  await p.waitForSelector('[data-screen="lobby"]');
  await p.waitForTimeout(300);
  if (await p.locator('.mwin').count()) {
    if (!milesShot) ((milesShot = true), await shot('milestones'));
    await click('.mwin [data-x]');
  }
  await p.evaluate(() => document.querySelectorAll('.notice').forEach((n) => n.remove()));
}
async function playStage(label) {
  await p.waitForSelector('[data-screen="battle"]');
  // 전투 전 로딩 팁 화면 (프롤로그 첫 전투엔 없음)
  if (await p.locator('.bload').count()) {
    await shot(`${label}_loading`);
    await p.waitForSelector('.bload', { state: 'detached' });
  }
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
await p.waitForTimeout(200);
await toLobby();
await p.waitForTimeout(400);
if (await p.locator('.modal').count()) await click('.modal .btn.hi');
// 창이 닫히면 알림 카드(S4)가 차례로
await p.waitForTimeout(500);
if (await p.locator('.notice').count()) await shot('notice');
await p.evaluate(() => document.querySelectorAll('.notice').forEach((n) => n.remove()));
await shot('lobby');
// 메인 지도 노드 → 스테이지 정보 창 (S3)
await click('.mnode.now');
await p.waitForSelector('.stagewin');
await shot('stage_info');
await p.evaluate(() => document.querySelector('.stagewin')?.remove());
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
await toLobby();
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
await toLobby();
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
await click('[data-tab="info"]');
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
await toLobby();
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
  // PC 1920은 그리기가 느려 실제 시간이 더 걸림
  await p.waitForFunction(() => !document.querySelector('#result').hidden, null, { timeout: 400000 });
  if (await p.locator('#result [data-a="leg"]').count()) return shot(`${label}_leg`);
  await shot(`${label}_result`);
  await click('#result [data-a="portal"]');
  await p.waitForSelector('[data-screen="portal"]');
}
await content('raid', 'raid');
await content('arena', 'arena');
await content('world', 'world');
await content('side', 'side');
// 이정표 탭 → 장별 사슬 창 (S5): 칸 눌러 설명 · 닫기
await click('[data-tab="miles"]');
await p.waitForSelector('.mwin');
await click('.mwin .mcell.ready, .mwin .mcell.todo');
await shot('portal_miles');
if (await p.locator('.mwin [data-all]:not([disabled])').count()) await click('.mwin [data-all]');
await shot('miles_claimed');
await click('.mwin [data-x]');
// D덩어리: 미션(받기·바로가기) · 길드(가입·출석·길드 레이드) · 친구 · 랭킹 · 우편 · 채팅 · 설정
await click('[data-back]');
await toLobby();
if (await p.locator('.modal .btn.hi').count()) await click('.modal .btn.hi');
await shot('lobby_d');
await click('[data-go="mission"]');
await p.waitForSelector('[data-screen="mission"]');
await shot('mission');
// 모두 받기 → 보상 창(아이콘·수량 크게)을 찍고 닫음
if (await p.locator('[data-all]:not([disabled])').count()) {
  await click('[data-all]');
  await shot('mission_reward');
  await click('.modal .btn.hi');
}
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
// PC 1920은 그리기가 느려 실제 시간이 더 걸림
await p.waitForFunction(() => !document.querySelector('#result').hidden, null, { timeout: 400000 });
await shot('graid_result');
await click('#result [data-a="lobby"]');
await toLobby();
await click('[data-go="friends"]');
await click('[data-add]');
await click('[data-gift]');
await shot('friends');
await click('[data-back]');
// 메인 지도: 랭킹·설정은 상단 바 ≡ 메뉴 안
await click('#topbar [data-menu]');
await click('[data-go="ranking"]');
await shot('ranking');
await click('[data-back]');
await click('#topbar [data-ic="mail"]');
await p.waitForSelector('[data-screen="mail"]');
await shot('mail');
await click('[data-all]');
await click('#topbar [data-ic="chat"]');
await shot('chat');
await click('.modal [data-x]');
await click('[data-back]');
await click('#topbar [data-menu]');
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
writeFileSync(`${out}/tests.json`, JSON.stringify(report, null, 1));
const sum = (k) => report.reduce((a, r) => a + r[k].length, 0);
const bad = (k) => report.filter((r) => r[k].length).length;
console.log(['t1', 't2', 't3', 't4', 't5'].map((k) => `${k.toUpperCase()} ${sum(k)}개 (${bad(k)}/${report.length}화면)`).join(' · '));
await br.close();
srv.close();
console.log(errors.length ? `오류 ${errors.length}개:\n${errors.join('\n')}` : '오류 없음', `· 사진 ${n}장 → ${out}`);
process.exit(errors.length ? 1 : 0);
