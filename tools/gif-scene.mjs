// 연출 GIF (docs/MOBILE_REF_1017.md 확인용): CDP 화면 스트림(실제 시각) → ffmpeg 팔레트 GIF (15fps)
//  node tools/gif-scene.mjs <장면> [out.gif]  (먼저 npm run build · W=844 H=390 · ffmpeg 필요)
//  장면: win = 마지막 일격(흰 번쩍·느리게) → 승리 별 3개 「쾅」 + 금빛 햇살 · arena = 결투장 VS 입장 → 3·2·1 → 전투 시작
//   heroes = 웅스·고느끼·콩선생 걷기 → 평타 → 스킬 (1-2 · 싸움 시작 때 마나 가득 · ANIM_1017)
//  ?rec=1로 앞부분을 빨리 감고, 녹화 중에는 페이지 안에서 매 프레임 __tick(1/60)
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extname, join, dirname } from 'node:path';
const [scene = 'win', out = `out/scene_${scene}.gif`] = process.argv.slice(2);
mkdirSync(dirname(out), { recursive: true });
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
const p = await br.newPage({ viewport: size });
p.on('pageerror', (e) => console.log('pageerror', String(e)));
await p.goto(`http://localhost:${srv.address().port}/?rec=1`);
await p.waitForFunction(() => window.__ready);
const party = (ids, lv) =>
  p.evaluate(([ids, lv]) => {
    const S = window.__S();
    for (const id of ids) S.heroes[id] = { awaken: 0, star: 1, skill: [1, 1, 1], trans: [], ex: 0, gear: { weapon: null, armor: null, acc1: null, acc2: null }, ...(S.heroes[id] ?? {}), lv, exp: 0 };
    S.party = ids;
    S.sta.n = 999;
    S.prologue = true;
    for (const c of [1, 2, 3]) S.seen[`${c}:intro`] = S.seen[`${c}:preBoss`] = true;
  }, [ids, lv]);
/** 녹화 중 게임 진행: 페이지 안 rAF마다 1/60초 */
const play = () => p.evaluate(() => { const f = () => (window.__tick(1 / 60), requestAnimationFrame(f)); requestAnimationFrame(f); });
const fast = (cond, sec) =>
  p.evaluate(([cond, sec]) => {
    const f = new Function('b', `return ${cond}`);
    for (let t = 0; t < sec; t += 1 / 30) {
      window.__tick(1 / 30);
      if (f(window.__b())) return true;
    }
    return false;
  }, [cond, sec]);

let secs = 6;
if (scene === 'win') {
  await party(['woongs', 'gonu', 'ikamolly', 'walwal'], 14);
  await p.evaluate(() => { window.__go('battle', { stage: { c: 1, s: 3, d: 0 } }); window.__b().auto = true; });
  await p.waitForFunction(() => !window.__artWait(), null, { timeout: 120000 });
  // 마지막 적 하나 · 체력 조금 남을 때까지 빨리 감기
  console.log('ff', await fast("b.phase === 'fight' && b.wave === b.setup.waves.length - 1 && b.mobs.filter((m) => !m.dead).length === 1", 240));
  secs = 7;
} else if (scene === 'heroes') {
  await party(['woongs', 'gonu', 'walwal'], 20);
  await p.evaluate(() => { window.__go('battle', { stage: { c: 1, s: 2, d: 0 } }); window.__b().auto = false; });
  await p.waitForFunction(() => !window.__artWait(), null, { timeout: 120000 });
  // 싸움 시작 직전까지 빨리 감기 → 걷기부터 녹화 · 싸움이 시작되면 마나 가득 + AUTO (스킬)
  await fast("b.phase === 'walk' || b.t > 0.2", 5);
  await p.evaluate(() => {
    const iv = setInterval(() => {
      const b = window.__b();
      if (!b) return clearInterval(iv);
      if (b.phase === 'fight') {
        clearInterval(iv);
        setTimeout(() => { for (const h of b.heroes) h.mana = 100; b.auto = true; }, 1500);
      }
    }, 50);
  });
  secs = 8;
} else if (scene === 'triple') {
  // 스킬 3개가 한꺼번에 (POLISH_1017 ① 하얗게 타는지 비교) · 웅스 3번 · 콩선생 2번(보호막) · 이카몰리 3번 · 컷인 끔
  await party(['woongs', 'gonu', 'walwal', 'ikamolly'], 12);
  await p.evaluate(() => { window.__go('battle', { stage: { c: 1, s: 10, d: 0 } }); window.__b().auto = false; });
  await p.waitForFunction(() => !window.__artWait(), null, { timeout: 120000 });
  await fast("b.phase === 'fight' && b.mobs.some((m) => !m.dead && m.x <= m.tx + 1)", 40);
  await p.evaluate(() => {
    const b = window.__b();
    b.cutIns = 'off';
    const at = (id) => b.heroes.findIndex((h) => h.hero.def.id === id);
    setTimeout(() => { window.__cast(at('woongs'), 2); window.__cast(at('walwal'), 1); window.__cast(at('ikamolly'), 2); window.__cast(at('walwal'), 2); }, 300);
  });
  secs = 2.6;
} else if (scene === 'bosshud') {
  // 보스전 HUD + 컷인 (POLISH_1017 ③): 1-10 보스 앞 · 콩선생 3번 스킬 컷인
  await party(['woongs', 'gonu', 'walwal', 'ikamolly'], 14);
  await p.evaluate(() => { window.__go('battle', { stage: { c: 1, s: 10, d: 0 } }); window.__b().auto = true; });
  await p.waitForFunction(() => !window.__artWait(), null, { timeout: 120000 });
  await fast("b.mobs.some((m) => m.mob?.boss && !m.dead && m.x <= m.tx + 1)", 120);
  await p.evaluate(() => { const b = window.__b(); const wi = b.heroes.findIndex((h) => h.hero.def.id === 'walwal'); b.cutIns = 'big'; setTimeout(() => window.__cast(wi, 2), 1200); });
  secs = 3;
} else if (scene === 'shield') {
  // 콩선생 보호막: 걸림(0→1) → 유지(1↔2) → 깨짐(3)
  await party(['woongs', 'walwal'], 25);
  await p.evaluate(() => { window.__go('battle', { stage: { c: 1, s: 3, d: 0 } }); window.__b().auto = false; });
  await p.waitForFunction(() => !window.__artWait(), null, { timeout: 120000 });
  await p.waitForFunction(() => window.__fxReady?.() ?? true, null, { timeout: 30000 });
  // 몹이 영웅을 때리기 시작할 때까지 빨리 감기
  await fast("b.phase === 'fight' && b.heroes.some((h) => h.taken > 0)", 30);
  await p.evaluate(() => {
    const b = window.__b();
    const wi = b.heroes.findIndex((h) => h.hero.def.id === 'walwal');
    setTimeout(() => window.__cast(wi, 2), 400);
    // 3초 뒤 보호막을 조금만 남겨 다음 한 대에 깨지게
    setTimeout(() => b.heroes.forEach((h) => h.shield > 0 && (h.shield = 1)), 3400);
  });
  secs = 6;
} else if (scene === 'boss3') {
  // 3장 보스: 경고(준비 칸 + 떨림) → 타격 (ANIM_1017 ③)
  await party(['woongs', 'gonu', 'walwal', 'ikamolly'], 32);
  await p.evaluate(() => { window.__go('battle', { stage: { c: 3, s: 10, d: 0 } }); window.__b().auto = true; });
  await p.waitForFunction(() => !window.__artWait(), null, { timeout: 120000 });
  // 보스가 다 걸어 들어올 때까지 → 다음 패턴을 0.6초 뒤로 당김 (경고 → 타격을 바로 보려고)
  console.log('ff', await fast("b.mobs.some((m) => m.mob?.boss && !m.dead && m.x <= m.tx + 1)", 200));
  await p.evaluate(() => { const b = window.__b(); b.pat.left = 0.6; b.cutIns = 'off'; });
  secs = 5;
} else if (scene === 'forest') {
  // 숲 동굴 1-2(슬라임·고블린 · 두 웨이브) — STAGE=1-6 이면 늑대 웨이브 · 숲 배경 + 지역 몹
  const [c, st] = (process.env.STAGE ?? '1-2').split('-').map(Number);
  await party(['woongs', 'gonu', 'walwal', 'ikamolly'], Number(process.env.LV ?? 3));
  await p.evaluate(([c, st]) => { window.__go('battle', { stage: { c, s: st, d: 0 } }); window.__b().auto = true; }, [c, st]);
  await p.waitForFunction(() => !window.__artWait(), null, { timeout: 120000 });
  secs = Number(process.env.SECS ?? 12);
} else if (scene === 'raid' || scene === 'world') {
  // 레이드 「잿날개」: 대기 → 그로기 → 부위 파괴(움찔 → 부서진 대기) → 쓰러짐·무너짐·잔해 (ANIM_1017 ④) · world = 월드 보스 그림
  await party(['woongs', 'gonu', 'walwal', 'ikamolly'], 22);
  await p.evaluate((mode) => {
    const S = window.__S();
    S.stages['1-1-0'] = { stars: 3, clears: 1, bestTime: 60, bestDps: 1000, mvp: 'woongs' };
    window.__go('battle', { run: { mode, arg: 0 } });
    window.__b().auto = false;
  }, scene);
  await p.waitForFunction(() => !window.__artWait(), null, { timeout: 120000 });
  console.log('ff', await fast("b.mobs.some((m) => m.mob?.boss && !m.dead && m.x <= m.tx + 1) && b.phase === 'fight'", 60));
  await p.evaluate(() => {
    const b = window.__b();
    const boss = b.mobs.find((m) => m.mob?.boss);
    b.cutIns = 'off';
    b.raid.left = 99;
    // 녹화용: 순서대로 다 보이게 체력을 넉넉히 (그로기 → 부위 파괴 → 쓰러짐)
    boss.max *= 8;
    boss.hp = boss.max;
    setTimeout(() => (b.raid.downT = 2.2), 900);
    setTimeout(() => { const pt = b.raid.parts.find((x) => !x.broken); if (pt) ((pt.broken = true), (pt.brokenT = 0), (pt.hp = 0)); }, 3600);
    setTimeout(() => (boss.hp = 1), 5600);
  });
  secs = 8.5;
} else if (scene === 'arena') {
  await party(['woongs', 'gonu', 'ikamolly', 'walwal'], 30);
  await p.evaluate(() => window.__go('portal', { tab: 'arena' }));
  await p.evaluate(() => document.querySelectorAll('.modal').forEach((m) => m.remove()));
  await p.waitForTimeout(500);
  secs = 7.5;
}
const vid = mkdtempSync(join(tmpdir(), 'scene-'));
const cdp = await p.context().newCDPSession(p);
const frames = [];
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  frames.push([data, metadata.timestamp]);
  void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await play();
await p.waitForTimeout(150);
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: size.width, maxHeight: size.height });
if (scene === 'arena') {
  // 결투장 승리의 리그 첫 상대 → VS 입장 → 3·2·1 → 전투 · 중간에 😊 감정 표현
  await p.evaluate(() => window.__go('battle', { run: { mode: 'arena', arg: 'victory', sub: 0 } }));
  await p.waitForTimeout(4700);
  await p.click('#bEmote');
  await p.waitForTimeout(250);
  await p.click('#emoPop [data-emo="emo_smile"]');
  await p.waitForTimeout(secs * 1000 - 4950);
} else await p.waitForTimeout(secs * 1000);
await cdp.send('Page.stopScreencast');
let list = '';
frames.forEach(([data, ts], i) => {
  writeFileSync(join(vid, `${i}.jpg`), Buffer.from(data, 'base64'));
  list += `file '${i}.jpg'\nduration ${Math.max(0.01, (frames[i + 1]?.[1] ?? ts + 1) - ts).toFixed(3)}\n`;
});
writeFileSync(join(vid, 'list.txt'), list + `file '${frames.length - 1}.jpg'\n`);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(vid, 'list.txt'), '-vf', 'fps=15,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', out]);
rmSync(vid, { recursive: true, force: true });
console.log('saved', out, frames.length, 'frames', (statSync(out).size / 1e6).toFixed(1) + 'MB');
await br.close();
srv.close();
