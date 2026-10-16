// 글씨 시안 보드 (형철 10/17: 「좀 기깔난 폰트 · 메뉴·영웅 이름·숫자가 단순하고 단촐」) — docs/style/type_board.html · .png
//  스타일 D(밝은 원정) 위에 글씨 조합 4개 × (제목 · 메뉴 버튼 · 영웅 이름표 · 피해 숫자 · 재화 · 강화 +N · 승리)
//  글씨 자체 + 꾸밈(금 그라데이션 · 남색 외곽선 · 그림자 · 이름 리본)을 같이 보여 줌 — 꾸밈은 캔버스(전투 숫자)·CSS 모두 가능한 것만
//  폰트: Google Fonts(OFL)에서 쓰인 글자만 받음 · 본문은 IBM Plex Sans KR 고정(읽기용)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'docs/style';
mkdirSync(`${OUT}/fonts`, { recursive: true });
const ART = '../../public/art';
/** 조합: 제목 · 메뉴 · 이름 · 숫자 */
const SETS = [
  { key: 'T1', name: '판타지 각인', note: '각진 판타지 글자 + 고전 숫자 — 킹스레이드 쪽 정통 RPG 느낌', title: ['Gugi', 400], menu: ['Gugi', 400], hero: ['Gugi', 400], num: ['Cinzel Decorative', 900] },
  { key: 'T2', name: '쫀득 모바일', note: '통통한 글자 + 둥근 숫자 — 귀엽고 손에 붙는 모바일 RPG 느낌', title: ['Bagel Fat One', 400], menu: ['Jua', 400], hero: ['Jua', 400], num: ['Lilita One', 400] },
  { key: 'T3', name: '묵직 전투 (C 강화판)', note: 'C의 Black Han Sans를 이름에 두고 제목은 더 굵게, 숫자는 만화풍 — 타격감', title: ['Gasoek One', 400], menu: ['Do Hyeon', 400], hero: ['Black Han Sans', 400], num: ['Luckiest Guy', 400] },
  { key: 'T4', name: '붓으로 쓴 전설', note: '먹 글씨 제목 + 명조 이름 + 중세 숫자 — 동양 판타지·서사 느낌', title: ['East Sea Dokdo', 400], menu: ['Song Myung', 400], hero: ['Song Myung', 400], num: ['MedievalSharp', 400] },
];
const BODY = ['IBM Plex Sans KR', 500];
const C = { bg: '#f6eedb', ivory: '#fffaf0', parch: '#ead8b0', gold: '#c9a14a', gold2: '#a8822e', navy: '#1d2a58', navy2: '#2b3a6b', sky: '#4fb3ff', sky2: '#2a7fd0', orange: '#ff9a3c', red: '#e8414f', green: '#2f9a4a' };
const HEROES = [['star_woongs', '웅스', '첫 번째 칼날', '전사'], ['star_ikamolly', '이카몰리', '바람의 마법사', '마법사'], ['legend_luna', '루나', '은늑대', '암살자']];
const MENUS = ['모험', '영웅', '상점', '결투장', '레이드'];
/** 외곽선 글자: 뒤 겹(굵은 남색 선 + 그림자) + 앞 겹(그라데이션 채움) — 캔버스는 strokeText → fillText 로 같은 모양 */
const fx = (t, cls) => `<span class="fx ${cls}" data-t="${t}"><span>${t}</span></span>`;

function set(s) {
  const f = (x) => `'${x[0]}'`;
  return `<section class="set" style="--ft:${f(s.title)};--fm:${f(s.menu)};--fh:${f(s.hero)};--fn:${f(s.num)}">
  <div class="head"><b>${s.key} 「${s.name}」</b><span>${s.note}</span><em>제목 ${s.title[0]} · 메뉴 ${s.menu[0]} · 이름 ${s.hero[0]} · 숫자 ${s.num[0]}</em></div>
  <div class="grid">
    <div class="cell logo">${fx('별의 원정대', 'ttl')}<div class="sub">${fx('STAR EXPEDITION', 'num small')}</div></div>
    <div class="cell menus">${MENUS.map((m, i) => `<div class="mb${i === 0 ? ' hi' : i === 4 ? ' sp' : ''}">${fx(m, 'menu')}</div>`).join('')}</div>
    <div class="cell heroes">${HEROES.map(([p, n, t, j]) => `<div class="hp"><div class="pt" style="background-image:url(${ART}/portraits/${p}.png)"></div><div class="rib">${fx(n, 'hero')}</div><small>${t} · ${j}</small></div>`).join('')}</div>
    <div class="cell nums" style="background:url(${ART}/bg.jpg) center/cover">${fx('12,480', 'dmg')}${fx('치명타!', 'crit-l')}${fx('48,920', 'crit')}${fx('+3,210', 'heal')}</div>
    <div class="cell curs"><span class="cur">${fx('65,955', 'cn')}</span><span class="cur">${fx('4,850', 'cn')}</span><span class="cur">${fx('Lv.30', 'cn')}</span><span class="pw">전투력 ${fx('431,096', 'pwn')}</span></div>
    <div class="cell wins">${fx('+10', 'enh')}${fx('승리!', 'vic')}${fx('VICTORY', 'vicE')}</div>
  </div></section>`;
}
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>글씨 시안 보드</title><link rel="stylesheet" href="fonts/fonts_type.css"><style>
*{box-sizing:border-box}body{margin:0;width:1600px;padding:26px;background:radial-gradient(1200px 700px at 75% -10%,#fffdf6,${C.bg} 65%);color:${C.navy};font-family:'${BODY[0]}',sans-serif}
h1{margin:0;font-family:'Gasoek One';font-size:40px;color:${C.gold2}}p.lead{margin:6px 0 14px;font-size:15px;color:#3b4672;max-width:1300px;line-height:1.6}
.set{border:2px solid ${C.gold};border-radius:12px;background:linear-gradient(170deg,${C.ivory},#fbf3e0 60%,${C.parch});padding:14px 16px;margin-bottom:18px;box-shadow:0 0 0 1px rgba(43,58,107,.15),0 6px 16px rgba(80,60,20,.15)}
.head{display:flex;gap:14px;align-items:baseline;margin-bottom:10px}.head b{font-size:22px}.head span{font-size:14px;color:#3b4672}.head em{margin-left:auto;font-style:normal;font-size:12px;color:#6b7396}
.grid{display:grid;grid-template-columns:330px 300px 430px 1fr;grid-template-areas:'logo menus heroes nums' 'curs wins heroes nums';gap:12px}.logo{grid-area:logo}.menus{grid-area:menus}.heroes{grid-area:heroes}.nums{grid-area:nums}.curs{grid-area:curs}.wins{grid-area:wins}
.cell{border:1.5px solid rgba(201,161,74,.7);border-radius:10px;background:rgba(255,250,240,.7);padding:10px;display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap}
/* 외곽선 글자 */
.fx{position:relative;display:inline-block;line-height:1.05;white-space:nowrap}
.fx::before{content:attr(data-t);position:absolute;left:0;top:0;-webkit-text-stroke:var(--sw,6px) var(--sc,${C.navy});color:var(--sc,${C.navy});text-shadow:0 var(--sd,4px) 0 var(--sc,${C.navy}),0 6px 10px rgba(30,20,0,.35)}
.fx>span{position:relative;background:var(--fill);-webkit-background-clip:text;background-clip:text;color:transparent}
.ttl{font-family:var(--ft);font-size:58px;--fill:linear-gradient(#fffbe6,#ffe08a 42%,#e8a93a 60%,#b8741a);--sw:9px;--sd:5px}
.num{font-family:var(--fn)}.small{font-size:18px;letter-spacing:4px;--fill:linear-gradient(#fff,#d8e9ff);--sw:5px;--sd:2px}
.logo{flex-direction:column;background:linear-gradient(rgba(255,255,255,.2),rgba(255,255,255,.2)),url(${ART}/bg.jpg) center/cover}
.menus{flex-direction:column;align-items:stretch;gap:7px}
.mb{height:44px;border-radius:12px 4px 12px 4px;border:2px solid ${C.gold};background:linear-gradient(${C.ivory},#f1e2bd);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 2px rgba(255,255,255,.8),0 3px 0 rgba(60,45,20,.25)}
.mb.hi{background:linear-gradient(#8fd2ff,${C.sky} 50%,${C.sky2});border-color:#e8f6ff}.mb.sp{background:linear-gradient(#ffc27a,${C.orange} 50%,#e07a1c);border-color:#fff0d8}
.menu{font-family:var(--fm);font-size:24px;--fill:linear-gradient(#fff,#fff3d0);--sw:6px;--sd:3px}
.mb:not(.hi):not(.sp) .menu{--fill:linear-gradient(${C.navy2},${C.navy});--sc:#fffaf0;--sw:5px;--sd:0px}
.heroes{gap:14px}.hp{width:126px;display:flex;flex-direction:column;align-items:center}
.hp .pt{width:110px;height:110px;border-radius:10px;border:3px solid ${C.gold};background:center 20%/cover;image-rendering:pixelated;box-shadow:0 0 10px rgba(255,180,71,.6)}
.rib{margin-top:-14px;padding:4px 14px 6px;background:linear-gradient(${C.navy2},${C.navy});border:2px solid ${C.gold};clip-path:polygon(0 0,100% 0,92% 50%,100% 100%,0 100%,8% 50%);min-width:120px;text-align:center}
.hero{font-family:var(--fh);font-size:22px;--fill:linear-gradient(#fffbe6,#ffd36b 60%,#e0a030);--sc:#0d1530;--sw:4px;--sd:2px}
.hp small{margin-top:4px;font-size:12px;color:#3b4672}
.nums{flex-direction:column;gap:2px;min-height:220px}
.dmg{font-family:var(--fn);font-size:40px;--fill:linear-gradient(#fff,#ffe9b0);--sw:7px;--sd:3px;--sc:#3a1a00}
.crit-l{font-family:var(--fm);font-size:20px;--fill:linear-gradient(#fff3c4,#ffb400);--sc:#5a0010;--sw:5px;--sd:2px}
.crit{font-family:var(--fn);font-size:58px;--fill:linear-gradient(#fffbe6,#ffd23f 40%,#ff7a1c 75%,#e8414f);--sc:#3a0000;--sw:9px;--sd:5px}
.heal{font-family:var(--fn);font-size:32px;--fill:linear-gradient(#eaffef,#6fe08a);--sc:#0d3a1a;--sw:6px;--sd:3px}
.curs{flex-direction:column;align-items:flex-start}.cur{padding:4px 14px;border-radius:20px;background:rgba(255,250,240,.95);border:1.5px solid ${C.gold}}
.cn{font-family:var(--fn);font-size:24px;--fill:linear-gradient(${C.navy2},${C.navy});--sc:#fffaf0;--sw:4px;--sd:0px}
.pw{font-size:13px;font-weight:700}.pwn{font-family:var(--fn);font-size:28px;--fill:linear-gradient(#fffbe6,#ffd36b 50%,#c98a1e);--sw:6px;--sd:3px}
.wins{gap:22px}.enh{font-family:var(--fn);font-size:64px;--fill:linear-gradient(#fffbe6,#ffd36b 45%,#c98a1e);--sw:9px;--sd:5px}
.vic{font-family:var(--ft);font-size:56px;--fill:linear-gradient(#fffbe6,#ffe08a 42%,#e8a93a 60%,#b8741a);--sw:9px;--sd:5px}
.vicE{font-family:var(--fn);font-size:44px;letter-spacing:3px;--fill:linear-gradient(#fff,#bfe6ff 50%,${C.sky2});--sw:8px;--sd:4px}
.foot{font-size:13px;color:#3b4672;line-height:1.7}
</style></head><body>
<h1>글씨 시안 — 스타일 D 위에서</h1>
<p class="lead">글씨체만 바꾸면 여전히 밋밋해서, <b>금 그라데이션 채움 + 굵은 남색 외곽선 + 아래 그림자 + 이름 리본</b>까지 같이 넣은 모양이에요. 전투 숫자는 캔버스에서 같은 방식(외곽선 → 채움)으로 그릴 수 있어요. 본문 글씨는 읽기 편하게 IBM Plex Sans KR 그대로예요. 모두 Google Fonts의 무료(OFL) 글씨예요.</p>
${SETS.map(set).join('\n')}
<div class="foot"><b>이 보드에 못 넣은 후보 (이 세션은 네트워크가 막혀 못 받음 · 형철 PC에서 확인 가능)</b><br>
· 넥슨 「메이플스토리체」 · 「마비노기 클래식체」 · 「카트라이더체」, 네오플 「던파 연단된 칼날체」 · 「던파 비트비트체」 — 게임 회사가 무료로 푸는 게임용 글씨 (배포처 약관 확인 후 사용) · 고르시면 같은 꾸밈으로 다시 보드를 만들어요.</div>
</body></html>`;

// 폰트: 쓰는 글자만
const chars = [...new Set(html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ').replace(/data-t="([^"]*)"/g, '$1').replace(/\s+/g, ''))].join('') + '0123456789+-.,:%!?·ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const fams = new Map();
for (const s of SETS) for (const k of ['title', 'menu', 'hero', 'num']) fams.set(`${s[k][0]}|${s[k][1]}`, s[k]);
fams.set(`${BODY[0]}|${BODY[1]}`, BODY);
fams.set('Gasoek One|400', ['Gasoek One', 400]);
let css = '';
for (const [fam, w] of fams.values()) {
  const id = `${fam.replace(/ /g, '')}-${w}-type`;
  const got = execFileSync('curl', ['-sS', '-A', UA, `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam)}:wght@${w}&text=${encodeURIComponent(chars)}`]).toString();
  const src = got.match(/url\((https:[^)]+)\)/)?.[1];
  if (!src) throw new Error(`글꼴 못 받음: ${fam}`);
  execFileSync('curl', ['-sS', '-o', `${OUT}/fonts/${id}.woff2`, src]);
  css += `@font-face{font-family:'${fam}';font-weight:${w};src:url(${id}.woff2) format('woff2')}\n`;
}
writeFileSync(`${OUT}/fonts/fonts_type.css`, `/* 글씨 시안 — Google Fonts · SIL Open Font License 1.1 · 보드에 쓰인 글자만 */\n${css}`);
writeFileSync(`${OUT}/type_board.html`, html);

const { chromium } = await import('playwright-core');
const exe = process.env.CHROME ?? (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const br = await chromium.launch(exe ? { executablePath: exe } : { channel: 'chrome' });
const p = await br.newPage({ viewport: { width: 1600, height: 900 } });
await p.goto(`file://${process.cwd()}/${OUT}/type_board.html`);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/type_board.png`, fullPage: true });
await br.close();
console.log(`글씨 시안 → ${OUT}/type_board.html · .png`);
