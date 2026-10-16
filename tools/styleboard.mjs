// 2단계 스타일 보드 시안 3종 (STAR_PLAN_v2 §5) — docs/style/board_<A|B|C>.html + .png
//  node tools/styleboard.mjs            → HTML 만들기 + 쓰인 글자만 담은 웹폰트(Google Fonts OFL · text= 부분 글꼴) 받기 + PNG 찍기
//  게임(src/theme/tokens.ts)에는 아직 안 들어감 — 형철 승인 뒤 고른 시안의 TOKENS를 옮긴다
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'docs/style';
mkdirSync(`${OUT}/fonts`, { recursive: true });

/** 시안: 이름 · 한 줄 콘셉트 · 팔레트 · 등급 6색 · 폰트 3종 · 문양 */
const V = {
  A: {
    name: '별빛 금박',
    concept: 'STAR_PLAN_v2 §5 그대로의 정석 — 밤하늘 남색 바탕에 별빛 금 테두리, 정보는 양피지 패널. 킹스레이드처럼 화려하지만 문양은 별자리 선·별 가시.',
    c: { bg: '#0f1630', bg2: '#18224a', panel: '#1d2a58', edge: '#e8c56a', edge2: '#9c7a3a', parch: '#efe2c0', parchInk: '#3b2a14', text: '#f4ecd6', dim: '#a9b0d0', btn: '#4fb3ff', btn2: '#2a7fd0', btnInk: '#06203a', special: '#ff9a3c', alert: '#ff4d5a', good: '#7fe08a', glow: 'rgba(232,197,106,0.55)' },
    grade: ['#c8c8d8', '#7ee08a', '#58b8ff', '#c79bff', '#ffb347', '#ff6a52'],
    font: { title: ['Gowun Batang', 700], body: ['Noto Sans KR', 400], bodyB: ['Noto Sans KR', 900], num: ['Cinzel', 900] },
    motif: 'constellation',
  },
  B: {
    name: '양피지 원정 지도',
    concept: '「원정대」 느낌을 앞에 — 패널 대부분이 낡은 지도 양피지, 테두리는 세피아 금, 별은 나침반·초승달 문양. 따뜻하고 손때 묻은 모험 일지.',
    c: { bg: '#1b1a2e', bg2: '#262338', panel: '#2e2a40', edge: '#d9b77a', edge2: '#8a6a3c', parch: '#ead8b0', parchInk: '#41301a', text: '#f6ead2', dim: '#bfae94', btn: '#3fb6c8', btn2: '#23808f', btnInk: '#062428', special: '#e8873a', alert: '#e0484f', good: '#8fd27a', glow: 'rgba(217,183,122,0.5)' },
    grade: ['#cfc6b4', '#8fcf7a', '#5fb0e0', '#b98ae8', '#f0a840', '#e85a44'],
    font: { title: ['Song Myung', 400], body: ['Gowun Dodum', 400], bodyB: ['Gowun Dodum', 400], num: ['Marcellus', 400] },
    motif: 'compass',
  },
  C: {
    name: '심연 은하',
    concept: '꺼진 별·심연 이야기를 앞에 — 더 어두운 보랏빛 우주, 은청색 테두리에 금은 포인트만. 유리 패널과 궤도 곡선, 또렷하고 현대적인 숫자.',
    c: { bg: '#0b0820', bg2: '#151036', panel: '#1a1440', edge: '#a9c4ff', edge2: '#5a6aa8', parch: '#e6e9f8', parchInk: '#1d2140', text: '#eef1ff', dim: '#9aa3d4', btn: '#56d0ff', btn2: '#2b8fd8', btnInk: '#04182c', special: '#ffb04a', alert: '#ff4f7a', good: '#6ff0b0', glow: 'rgba(169,196,255,0.5)' },
    grade: ['#c4c8dc', '#6fe0a0', '#56b4ff', '#b48cff', '#ffc24a', '#ff5f6a'],
    font: { title: ['Black Han Sans', 400], body: ['IBM Plex Sans KR', 400], bodyB: ['IBM Plex Sans KR', 700], num: ['Oxanium', 800] },
    motif: 'orbit',
  },
};
const GRADE = ['일반', '고급', '희귀', '영웅', '전설', '고대'];
const JOBS = [['knight', '기사'], ['warrior', '전사'], ['fighter', '격투가'], ['assassin', '암살자'], ['archer', '궁수'], ['engineer', '기계공학자'], ['mage', '마법사'], ['priest', '사제'], ['druid', '드루이드']];
const ART = '../../public/art';

// ───────── 벡터 아이콘 (이모지 대신 · 한 색 실루엣 + 테두리) ─────────
const P = {
  knight: 'M12 2 20 5v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z',
  warrior: 'M4 20 16 8l1-4 4-1-1 4-4 1L4 20zm0-4 4 4-2 2-4-4z',
  fighter: 'M6 10V6a2 2 0 0 1 4 0v3-4a2 2 0 0 1 4 0v4-3a2 2 0 0 1 4 0v8c0 4-3 7-7 7s-7-3-7-7v-3a2 2 0 0 1 2-1z',
  assassin: 'M12 2l3 10-3 10-3-10zM7 12h10',
  archer: 'M5 3c8 3 8 15 0 18M5 3v18M3 12h16l-3-3m3 3-3 3',
  engineer: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-1-6h2l1 3 3-1 1 2-2 2 1 3h-2l-1 3h-2l-1-3H7l1-3-2-2 1-2 3 1z',
  mage: 'M12 2l2 5 5 .5-4 3.5 1.5 5L12 13l-4.5 3 1.5-5-4-3.5L10 7zM12 13v9',
  priest: 'M10 2h4v6h6v4h-6v10h-4V12H4V8h6z',
  druid: 'M12 22V10m0 0C7 10 4 7 4 2c5 0 8 3 8 8zm0 4c5 0 8-3 8-8-5 0-8 3-8 8z',
  gold: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v10m-3-7h5a2 2 0 0 1 0 4H9',
  dust: 'M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z',
  stamina: 'M13 2 4 14h7l-1 8 9-12h-7z',
  enh: 'M12 2 20 8 12 22 4 8z M4 8h16',
  inn: 'M3 11 12 4l9 7v9H3zM9 20v-5h6v5',
  hero: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4 4-7 8-7s8 3 8 7',
  bag: 'M6 8h12l1 13H5zM9 8V6a3 3 0 0 1 6 0v2',
  shop: 'M4 9h16l-1-5H5zM5 9v11h14V9M10 20v-6h4v6',
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  guild: 'M5 3h14v10l-7 8-7-8zM12 7l1.5 3 3 .5-2.2 2 .6 3L12 14l-2.9 1.5.6-3-2.2-2 3-.5z',
};
/** 선으로 그리는 아이콘 (나머지는 채움) */
const LINE = new Set(['warrior', 'assassin', 'archer', 'druid', 'map']);
const svg = (k, color, stroke = LINE.has(k) ? color : 'none', sz = 24) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24"><path d="${P[k]}" fill="${stroke === 'none' ? color : 'none'}" stroke="${stroke === 'none' ? 'none' : color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

// ───────── 문양 (패널 모서리 · 탭 · 카드) — 킹스레이드 넝쿨 대신 우리 것 ─────────
function corner(v) {
  const e = v.c.edge;
  if (v.motif === 'constellation')
    return `<svg width="46" height="46" viewBox="0 0 46 46"><path d="M3 30 L3 3 L30 3" fill="none" stroke="${e}" stroke-width="2"/><path d="M8 22 L14 14 L22 9" fill="none" stroke="${e}" stroke-width="1" opacity=".7"/><circle cx="8" cy="22" r="1.8" fill="${e}"/><circle cx="14" cy="14" r="2.4" fill="${e}"/><circle cx="22" cy="9" r="1.6" fill="${e}"/><path d="M3 3 l4 -2 -2 4 -2 -2z" fill="${e}"/><path d="M14 14 l0 -6 m0 12 l0 -6 m-6 0 l12 0" stroke="${e}" stroke-width=".8" opacity=".8"/></svg>`;
  if (v.motif === 'compass')
    return `<svg width="46" height="46" viewBox="0 0 46 46"><path d="M3 34 L3 3 L34 3" fill="none" stroke="${e}" stroke-width="2.4"/><path d="M7 30 L7 7 L30 7" fill="none" stroke="${e}" stroke-width="1" stroke-dasharray="3 3"/><path d="M16 4 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" fill="${e}"/><path d="M34 4 a5 5 0 1 0 0 0.1" fill="none"/><path d="M38 6 a6 6 0 1 1 -6 -3 a4.5 4.5 0 1 0 6 3z" fill="${e}" transform="translate(-6 0)"/></svg>`;
  return `<svg width="46" height="46" viewBox="0 0 46 46"><path d="M3 30 Q3 3 30 3" fill="none" stroke="${e}" stroke-width="2"/><path d="M9 34 Q9 9 34 9" fill="none" stroke="${e}" stroke-width="1" opacity=".6"/><circle cx="30" cy="3" r="2.5" fill="${v.c.special}"/><circle cx="12" cy="12" r="1.8" fill="${e}"/><circle cx="9" cy="34" r="1.4" fill="${e}"/></svg>`;
}
const corners = (v) => ['', 'scale(-1,1)', 'scale(1,-1)', 'scale(-1,-1)'].map((t, i) => `<i class="cn c${i}" style="transform:${t}">${corner(v)}</i>`).join('');

// ───────── 보드 HTML ─────────
function board(key) {
  const v = V[key];
  const c = v.c;
  const ff = (f) => `'${f[0]}'`;
  const portraits = ['star_woongs', 'star_ikamolly', 'star_gonu', 'star_walwal', 'star_warmnight'];
  const lobbyIcons = [['inn', '여관'], ['hero', '영웅'], ['bag', '가방'], ['shop', '상점'], ['map', '모험'], ['guild', '길드']];
  const tokens = { color: c, grade: Object.fromEntries(['common', 'uncommon', 'rare', 'epic', 'legend', 'ancient'].map((k, i) => [k, v.grade[i]])), font: { title: v.font.title[0], body: v.font.body[0], num: v.font.num[0] }, motif: v.motif };
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>스타일 보드 ${key} ${v.name}</title>
<link rel="stylesheet" href="fonts/fonts_${key}.css">
<style>
:root{--bg:${c.bg};--bg2:${c.bg2};--panel:${c.panel};--edge:${c.edge};--edge2:${c.edge2};--parch:${c.parch};--ink:${c.parchInk};--text:${c.text};--dim:${c.dim};--btn:${c.btn};--btn2:${c.btn2};--btnInk:${c.btnInk};--sp:${c.special};--al:${c.alert};--good:${c.good};--glow:${c.glow};
--ft:${ff(v.font.title)},serif;--fb:${ff(v.font.body)},sans-serif;--fn:${ff(v.font.num)},serif}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(1200px 600px at 70% -10%,var(--bg2),var(--bg) 60%);color:var(--text);font-family:var(--fb);width:1600px;padding:28px}
h1,h2,h3{font-family:var(--ft);margin:0}h1{font-size:44px;color:var(--edge);text-shadow:0 3px 0 rgba(0,0,0,.6),0 0 24px var(--glow);-webkit-text-stroke:1px rgba(0,0,0,.4)}
h2{font-size:22px;color:var(--edge);margin:26px 0 10px;display:flex;align-items:center;gap:10px}h2::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--edge2),transparent)}
.sub{color:var(--dim);font-size:15px;margin-top:6px;max-width:1100px}
.row{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}.col{display:flex;flex-direction:column;gap:8px}
.sw{width:120px}.sw i{display:block;height:64px;border-radius:8px;border:1px solid rgba(255,255,255,.15)}.sw b{display:block;font-size:13px;margin-top:4px}.sw span{font-size:12px;color:var(--dim);font-family:monospace}
.panel{position:relative;background:linear-gradient(160deg,var(--panel),var(--bg2));border:2px solid var(--edge2);border-radius:6px;padding:16px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05),0 6px 18px rgba(0,0,0,.45)}
.panel.parch{background:linear-gradient(170deg,var(--parch),color-mix(in srgb,var(--parch) 80%,#000));color:var(--ink);border-color:var(--edge)}
.cn{position:absolute;width:46px;height:46px;pointer-events:none}.c0{left:-4px;top:-4px}.c1{right:-4px;top:-4px}.c2{left:-4px;bottom:-4px}.c3{right:-4px;bottom:-4px}
.btn{font-family:var(--fb);font-weight:900;font-size:16px;padding:10px 22px;border-radius:8px;border:2px solid color-mix(in srgb,var(--btn) 60%,#fff);background:linear-gradient(var(--btn),var(--btn2));color:var(--btnInk);box-shadow:0 3px 0 rgba(0,0,0,.5)}
.btn.sp{background:linear-gradient(var(--sp),color-mix(in srgb,var(--sp) 70%,#000));border-color:color-mix(in srgb,var(--sp) 60%,#fff)}.btn.ghost{background:transparent;color:var(--text);border-color:var(--edge2)}
.fontbox{width:500px}.fontbox .t{font-family:var(--ft);font-size:40px;color:var(--edge)}.fontbox .b{font-size:16px;line-height:1.6}.fontbox .n{font-family:var(--fn);font-size:46px;background:linear-gradient(#fff,var(--edge) 55%,var(--edge2));-webkit-background-clip:text;background-clip:text;color:transparent}
.lic{font-size:12px;color:var(--dim)}
.ring{width:76px;height:76px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 40% 35%,var(--bg2),var(--bg));border:3px solid var(--edge);box-shadow:0 0 0 3px var(--edge2),0 0 14px var(--glow),inset 0 0 10px rgba(0,0,0,.7)}
.ic{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:13px;font-weight:700}
.crest{width:64px;height:72px;display:flex;align-items:center;justify-content:center;clip-path:polygon(50% 0,100% 18%,100% 70%,50% 100%,0 70%,0 18%);background:linear-gradient(var(--edge),var(--edge2))}.crest>div{width:58px;height:66px;clip-path:inherit;background:var(--panel);display:flex;align-items:center;justify-content:center}
.sk{width:64px;height:64px;border-radius:10px;border:2px solid var(--edge);background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--sp) 50%,transparent),var(--panel) 70%);display:flex;align-items:center;justify-content:center;position:relative}.sk .mp{position:absolute;bottom:-7px;display:flex;gap:3px}.sk .mp i{width:8px;height:8px;border-radius:50%;background:var(--btn);box-shadow:0 0 4px var(--btn)}.sk .mp i.off{background:#334}
.gf{width:62px;height:62px;border-radius:8px;border:3px solid;display:flex;align-items:flex-end;justify-content:center;font-size:12px;font-weight:700;padding-bottom:3px;background:var(--bg2)}
.topbar{display:flex;align-items:center;gap:10px;height:46px;padding:0 12px;background:linear-gradient(var(--bg2),var(--bg));border-bottom:2px solid var(--edge2);width:760px;border-radius:6px 6px 0 0}.topbar h3{font-size:18px;color:var(--edge);flex:1}
.cur{display:flex;align-items:center;gap:4px;padding:3px 10px 3px 6px;border-radius:20px;background:rgba(0,0,0,.4);border:1px solid var(--edge2);font-family:var(--fn);font-size:15px}
.tabs{display:flex;gap:2px}.tab{padding:8px 18px;font-weight:700;border:2px solid var(--edge2);border-bottom:none;border-radius:8px 8px 0 0;background:var(--bg2);color:var(--dim)}.tab.on{background:linear-gradient(var(--edge),var(--edge2));color:var(--ink)}
.cards{display:grid;grid-template-columns:repeat(4,140px);gap:10px}.card{border:2px solid var(--edge2);border-radius:8px;overflow:hidden;background:var(--panel);text-align:center;font-size:13px;padding-bottom:6px}.card .pt{height:110px;background:center 20%/cover;image-rendering:pixelated}.card b{display:block;margin:4px 0 2px;font-size:15px}
.list .li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid color-mix(in srgb,var(--edge2) 50%,transparent)}.list .li .grow{flex:1}.bar{height:8px;border-radius:4px;background:rgba(0,0,0,.4);overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,var(--btn2),var(--btn))}
.emb{font-family:var(--fn);font-size:60px;letter-spacing:6px;text-align:center;background:linear-gradient(#fff,var(--edge) 50%,var(--edge2));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 rgba(0,0,0,.6)) drop-shadow(0 0 18px var(--glow))}
.emb.lose{background:linear-gradient(#ccd,#667);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 4px 0 rgba(0,0,0,.6))}
.hud{position:relative;width:760px;height:352px;border-radius:8px;overflow:hidden;background:url(${ART}/bg.jpg) center/cover;border:2px solid var(--edge2)}
.hud .hc{position:absolute;bottom:8px;width:176px;height:74px;border:2px solid var(--edge2);border-radius:10px 3px 10px 3px;background:linear-gradient(160deg,var(--panel),var(--bg));overflow:visible}
.hud .hc .up{position:absolute;left:-6px;bottom:6px;width:86px;height:104px;background:center bottom/contain no-repeat;image-rendering:pixelated;filter:drop-shadow(0 2px 2px #000)}
.hud .hc .nm{position:absolute;left:82px;top:6px;font-weight:900;font-size:14px}.hud .hc .hp{position:absolute;left:82px;right:8px;top:28px;height:5px;background:#300;border-radius:3px}.hud .hc .hp i{display:block;height:100%;width:72%;background:linear-gradient(90deg,#3c3,#9f6)}
.hud .hc .sks{position:absolute;left:82px;top:40px;display:flex;gap:4px}.hud .hc .sks span{width:26px;height:26px;border-radius:6px;border:1.5px solid var(--edge);background:var(--bg2);display:flex;align-items:center;justify-content:center}
.hud .boss{position:absolute;left:50%;top:8px;transform:translateX(-50%);width:360px}.hud .boss .bar{height:12px}.hud .boss .bar i{background:linear-gradient(90deg,var(--al),var(--sp));width:64%}.hud .boss b{font-family:var(--ft);font-size:16px;color:var(--edge)}
.hud .dps{position:absolute;left:8px;top:58px;width:138px;padding:6px;font-size:12px;background:rgba(0,0,0,.45);border:1px solid var(--edge2);border-radius:0 8px 8px 0}
.tok{font-family:monospace;font-size:12px;white-space:pre;background:rgba(0,0,0,.35);border:1px solid var(--edge2);border-radius:6px;padding:10px;max-height:260px;overflow:hidden;color:var(--dim)}
.load{width:520px;height:292px;border-radius:8px;overflow:hidden;position:relative;background:radial-gradient(circle at 70% 40%,var(--bg2),var(--bg));border:2px solid var(--edge2)}
.load .pt{position:absolute;right:10px;bottom:0;width:240px;height:280px;background:center bottom/contain no-repeat;image-rendering:pixelated}
.load .t{position:absolute;left:22px;top:24px;font-family:var(--ft);font-size:30px;color:var(--edge)}.load .tip{position:absolute;left:22px;bottom:40px;right:260px;font-size:14px;color:var(--dim)}.load .bar{position:absolute;left:22px;right:22px;bottom:16px}
.stars{position:absolute;inset:0;background-image:radial-gradient(1.5px 1.5px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 60% 20%,#fff,transparent),radial-gradient(1.2px 1.2px at 40% 70%,#fff,transparent),radial-gradient(1px 1px at 80% 60%,#fff,transparent),radial-gradient(1.4px 1.4px at 10% 80%,#fff,transparent);opacity:.7}
</style></head><body>
<div class="row" style="justify-content:space-between;align-items:flex-end"><div><h1>별의 원정대 · 스타일 보드 시안 ${key}</h1><div style="font-family:var(--ft);font-size:26px;margin-top:6px">「${v.name}」</div><div class="sub">${v.concept}</div></div>
<div class="col" style="align-items:flex-end"><div class="lic">2단계 시안 · 게임에는 아직 안 들어감 (형철 승인 뒤 tokens.ts로) · 그림은 기존 초상화를 자리로 씀</div></div></div>

<h2>팔레트</h2><div class="row">${[['바탕 밤하늘', c.bg], ['바탕 2', c.bg2], ['패널', c.panel], ['테두리 별빛', c.edge], ['테두리 2', c.edge2], ['양피지 패널', c.parch], ['주 버튼', c.btn], ['특수', c.special], ['알림', c.alert], ['좋음', c.good], ['글자', c.text], ['흐린 글자', c.dim]].map(([n, h]) => `<div class="sw"><i style="background:${h}"></i><b>${n}</b><span>${h}</span></div>`).join('')}</div>
<div class="row" style="margin-top:10px">${v.grade.map((g, i) => `<div class="gf" style="border-color:${g};box-shadow:0 0 ${4 + i * 3}px ${g}">${GRADE[i]}</div>`).join('')}<span class="lic" style="align-self:center">등급 6단계 (일반 → 고대 · 빛이 한 단계씩 강해짐)</span></div>

<h2>폰트 3종 (모두 OFL · 상업 무료 · 쓰는 글자만 담아 가볍게)</h2><div class="row">
<div class="panel fontbox">${corners(v)}<div class="lic">제목 · ${v.font.title[0]}</div><div class="t">별의 원정대 · 승리!</div><div class="lic" style="margin-top:8px">본문 · ${v.font.body[0]}</div><div class="b">「계산은 끝났어. 3초 뒤에 쓰러진다.」 — 세르미뉴<br>강화석 12개와 금화 4,500으로 +10에 도전할 수 있어요.</div><div class="lic" style="margin-top:8px">숫자·영문 · ${v.font.num[0]}</div><div class="n">+50 · 1,234,567</div></div>
<div class="panel parch fontbox">${corners(v)}<h3 style="font-size:26px">원정 일지 — 양피지 정보 패널</h3><p style="line-height:1.7;margin:8px 0 0">숲 동굴의 골렘이 쓰러지자 첫째 별이 다시 켜졌다. 루나가 원정대에 합류했다.<br><b>공격력 1,978 · 체력 23,922 · 치명타 21.4%</b></p></div></div>

<h2>장식 문양 (패널 모서리 · 탭 · 카드 테두리)</h2><div class="row">
<div class="panel" style="width:300px;height:150px">${corners(v)}<b>패널 모서리</b><div class="lic">${v.motif === 'constellation' ? '별자리 선 + 별 가시' : v.motif === 'compass' ? '나침반 별 + 초승달 + 지도 점선' : '궤도 곡선 + 별 무리'}</div></div>
<div class="col"><div class="tabs"><span class="tab on">전체</span><span class="tab">전방</span><span class="tab">중앙</span><span class="tab">후방</span></div><div class="panel" style="width:330px;border-radius:0 6px 6px 6px">탭 · 고른 탭은 금박</div></div>
<div class="row" style="gap:12px">${['common', 'rare', 'legend'].map((g, i) => `<div class="card" style="width:120px;border-color:${v.grade[[0, 2, 4][i]]};box-shadow:0 0 ${[0, 8, 16][i]}px ${v.grade[[0, 2, 4][i]]}"><div class="pt" style="height:90px;background-image:url(${ART}/portraits/${portraits[i]}.png)"></div><b>${GRADE[[0, 2, 4][i]]} 카드</b></div>`).join('')}</div></div>

<h2>아이콘 세트 (이모지 전부 교체 · 벡터 한 벌)</h2><div class="row" style="gap:28px">
<div class="col"><div class="lic">로비 원형 아이콘 (금속 링)</div><div class="row">${lobbyIcons.map(([k, n]) => `<div class="ic"><div class="ring">${svg(k, c.edge, undefined, 34)}</div>${n}</div>`).join('')}</div></div>
<div class="col"><div class="lic">스킬 아이콘 (그림 자리 + 마나 점)</div><div class="row">${['mage', 'warrior', 'priest'].map((k, i) => `<div class="sk">${svg(k, c.text, undefined, 34)}<div class="mp">${[0, 1, 2].map((j) => `<i class="${j <= i ? '' : 'off'}"></i>`).join('')}</div></div>`).join('')}</div></div>
<div class="col"><div class="lic">재화</div><div class="row">${[['gold', '#ffd36b', '금화'], ['dust', c.edge, '별가루'], ['stamina', c.btn, '행동력'], ['enh', '#7fd8ff', '강화석']].map(([k, col, n]) => `<div class="cur">${svg(k, col, undefined, 20)}${n}</div>`).join('')}</div></div>
</div>
<div class="col" style="margin-top:12px"><div class="lic">직업 문장 9종</div><div class="row">${JOBS.map(([k, n]) => `<div class="ic"><div class="crest"><div>${svg(k, c.edge, undefined, 30)}</div></div>${n}</div>`).join('')}</div></div>

<h2>화면 템플릿 7종 (모든 화면을 이 틀로 조립)</h2><div class="row">
<div class="col"><div class="topbar"><span class="btn ghost" style="padding:4px 10px">◀</span><h3>① 상단 공통 바 · 영웅</h3><span class="cur">${svg('stamina', c.btn, 'none', 18)}48/60</span><span class="cur">${svg('gold', '#ffd36b', 'none', 18)}65,955</span><span class="cur">${svg('dust', c.edge, 'none', 18)}4,850</span></div>
<div class="panel" style="width:760px;border-radius:0 0 6px 6px">${corners(v)}<div class="tabs" style="margin-bottom:-2px"><span class="tab on">② 탭</span><span class="tab">전방</span><span class="tab">중앙</span></div>
<div class="cards" style="margin-top:10px">${portraits.slice(0, 4).map((p, i) => `<div class="card"><div class="pt" style="background-image:url(${ART}/portraits/${p}.png)"></div><b>③ 카드 격자</b><span class="lic">${['전방 · 전사', '후방 · 마법사', '중앙 · 암살자', '후방 · 사제'][i]}</span><div style="margin-top:6px"><span class="btn" style="padding:4px 12px;font-size:13px">4,000</span></div></div>`).join('')}</div></div></div>
<div class="col" style="gap:14px">
<div class="panel list" style="width:380px">${corners(v)}<b>④ 목록</b>${[['일일 미션 · 스테이지 5판', 80], ['주간 · 결투장 15판', 40], ['업적 · 강화 20번', 100]].map(([t, p]) => `<div class="li"><span class="grow">${t}<div class="bar"><i style="width:${p}%"></i></div></span><span class="btn" style="padding:4px 12px;font-size:13px">${p === 100 ? '받기' : '가기'}</span></div>`).join('')}</div>
<div class="panel parch" style="width:380px">${corners(v)}<b>⑤ 팝업 (정보)</b><p style="margin:6px 0">영웅 장신구 +10 · 체력 2,225 · 공격력 222<br>부옵션: 스킬 피해 +4.3% · 치명타 +2.4%</p></div>
<div class="panel" style="width:380px;text-align:center">${corners(v)}<b>⑥ 확인창</b><p style="margin:8px 0">별가루 4,000으로 세르미뉴를 영입할까요?</p><div class="row" style="justify-content:center"><span class="btn ghost">그만두기</span><span class="btn">영입</span></div></div></div>
<div class="panel" style="width:360px;text-align:center">${corners(v)}<b>⑦ 보상창</b><div class="emb" style="font-size:44px;margin:8px 0">VICTORY</div><div class="row" style="justify-content:center">${v.grade.slice(2, 5).map((g, i) => `<div class="gf" style="border-color:${g};box-shadow:0 0 10px ${g};align-items:center">${svg(['dust', 'enh', 'gold'][i], g, 'none', 30)}</div>`).join('')}</div><div style="margin-top:12px"><span class="btn sp">다음 ▶</span></div></div>
</div>

<h2>엠블럼 · 연출 시안</h2><div class="row" style="gap:40px;align-items:center"><div class="emb">VICTORY</div><div class="emb lose">DEFEAT</div><div class="emb" style="font-size:40px">LEVEL UP</div><div style="font-family:var(--ft);font-size:42px;color:var(--edge);text-shadow:0 0 20px var(--glow)">합류!</div><div class="emb" style="font-size:52px">+10</div></div>

<h2>전투 HUD (0-5: 상반신이 튀어나오는 패널 · 그림 스킬 아이콘 · 피해 순위) · 로딩 화면</h2><div class="row">
<div class="hud"><div class="boss"><b>심연 드래곤 「잿날개」</b><div class="bar"><i></i></div></div>
<div class="dps"><b>피해 순위</b>${[['닉스', 90], ['유월', 76], ['웅스', 60]].map(([n, p]) => `<div>${n}<div class="bar" style="height:4px"><i style="width:${p}%"></i></div></div>`).join('')}</div>
${portraits.slice(0, 4).map((p, i) => `<div class="hc" style="left:${8 + i * 188}px"><div class="up" style="background-image:url(${ART}/portraits/${p}.png)"></div><div class="nm">${['웅스', '이카몰리', '고느끼', '왈왈콩선생'][i]}</div><div class="hp"><i></i></div><div class="sks">${['warrior', 'mage', 'assassin', 'priest'].slice(0, 3).map((k) => `<span>${svg(k, c.edge, undefined, 16)}</span>`).join('')}</div></div>`).join('')}</div>
<div class="load"><div class="stars"></div><div class="pt" style="background-image:url(${ART}/portraits/star_warmnight.png)"></div><div class="t">지도 끝의 등불</div><div style="position:absolute;left:22px;top:68px;font-size:14px;color:var(--dim)">따뜻한밤 · 「체크인」 다섯 별</div><div class="tip">팁: 보스가 팔을 들면 빨간 줄을 피해 「줄 바꾸기」! 직접 피하면 그로기가 더 깎여요.</div><div class="bar"><i style="width:62%"></i></div></div>
</div>

<h2>토큰 초안 (승인되면 src/theme/tokens.ts 로)</h2><div class="tok">${JSON.stringify(tokens, null, 2)}</div>
</body></html>`;
}

// ───────── 폰트: 쓰는 글자만 (Google Fonts css2 text=) ─────────
function fetchFonts(key, html) {
  const v = V[key];
  const chars = [...new Set(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ''))].join('') + '0123456789+-.,:%!?·「」()ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
  let css = '';
  const seen = new Set();
  for (const [fam, w] of Object.values(v.font)) {
    const id = `${fam.replace(/ /g, '')}-${w}-${key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam)}:wght@${w}&text=${encodeURIComponent(chars)}`;
    const got = execFileSync('curl', ['-sS', '-A', UA, url]).toString();
    const src = got.match(/url\((https:[^)]+)\)/)?.[1];
    if (!src) throw new Error(`글꼴 못 받음: ${fam} ${w}`);
    execFileSync('curl', ['-sS', '-o', `${OUT}/fonts/${id}.woff2`, src]);
    css += `@font-face{font-family:'${fam}';font-weight:${w};font-style:normal;src:url(${id}.woff2) format('woff2')}\n`;
  }
  writeFileSync(`${OUT}/fonts/fonts_${key}.css`, `/* ${Object.values(v.font).map((f) => f[0]).join(' · ')} — Google Fonts · SIL Open Font License 1.1 · 보드에 쓰인 글자만 */\n${css}`);
}

const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(V);
for (const k of keys) {
  const html = board(k);
  writeFileSync(`${OUT}/board_${k}.html`, html);
  fetchFonts(k, html);
}
// PNG (playwright-core · 로컬 파일)
const { chromium } = await import('playwright-core');
const exe = process.env.CHROME ?? (existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome') ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined);
const br = await chromium.launch(exe ? { executablePath: exe } : { channel: 'chrome' });
const p = await br.newPage({ viewport: { width: 1600, height: 900 } });
for (const k of keys) {
  await p.goto(`file://${process.cwd()}/${OUT}/board_${k}.html`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/board_${k}.png`, fullPage: true });
}
await br.close();
console.log(`스타일 보드 ${keys.join(' · ')} → ${OUT}/board_*.html · .png`);
