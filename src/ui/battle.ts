// 전투 화면: HUD(패널·스킬·패널별 Auto·AUTO·배속·DPS·보스·예고) + 결과(별 3개·보상·MVP·DPS 기록·레벨업·합류)
//  흐름: 행동력 → 파티를 필드에 세우고 (처음이면 대사) → 전투 → 승리 기록 → (장 클리어 대사 → 합류 연출) → 결과 → 다시 / 다음 / 반복 / 모험
import { ensureBattleArt } from './assets';
import { CONFIG } from '../config';
import { headHpPref, render, renderBg, type Art } from '../battle/render';
import { bossOf, canCast, idleStep, makeBattle, mvpOf, partyDps, relayout, requestSkill, shortNum, starsOf, step, type Battle, type Unit } from '../battle/sim';
import { raidDodge, raidSummary } from '../battle/raid';
import { combatSynth } from '../core/audio/combatSfx';
import { heroOf } from '../data/heroes';
import { descSkill } from '../data/skills';
import { SIDE } from '../data/side';
import { CHAPTERS, PROLOGUE, type Line } from '../data/story';
import { stageCost, useStamina } from '../game/account';
import { buildRun, finishRun, lockOf, MODE_NAME, triesText, useTry, type Run } from '../game/content';
import { buildStage, isBoss, recordClear, repeatBattle, unlocked, type StageId } from '../game/stage';
import { persist, S } from '../game/state';
import { applyTheme, icon, iconArt, iconText, svgIcon, T } from '../theme/tokens';
import { $, $$, esc, fmt, fullbodyUrl, fxt, go, heroPortrait, modal, playTalk, portraitUrl, register, skillIconUrl, toast, CUR_NAME } from './core';
import { getPref, setPref } from '../core/save';
import { gearArtUrl, runeArtUrl, socketRarity } from './gearui';
import { gearName } from '../game/gear';
import { accNeed } from '../game/account';
import { expNeed } from '../game/heroes';
import type { Gear, Rune } from '../game/state';
import { flag } from '../core/flags';
import { setBackdrop, view } from './view';
import { kit9, kitBar, kitPart, kitSocket, setBar, titleUrl, type Rarity } from './kit';
import { bustUrl, fullUrl } from './bust';
import { aiEmote, countdown, emote, pvpHudHtml, resetAiEmote, syncPvpHud, vsIntro } from './arena';

const C = CONFIG.story;
const UI_ART = `${import.meta.env.BASE_URL}art/ui/`;
let b: Battle | null = null;
let st: StageId = { c: 1, s: 1, d: 0 };
/** 콘텐츠 전투 (없으면 스토리) */
let run: Run | null = null;
/** 최후의 리그 3판 기록 */
let series = { wins: 0, losses: 0 };
let shown = false;
/** 전투 전 대사 중 (파티가 필드에 선 채로 · 진행 멈춤) */
let talking = false;
/** 결투장 VS 입장·카운트다운 중 (전투 멈춤) */
let intro = false;
/** 첫 진입 (프롤로그 → 1-1 → 로비) */
let firstRun = false;
/** DPS 판: 펼침(기억함) · 탭 피해·회복·받은 피해 (MOBILE_REF §3-A-4) */
// 기본 접힘 (UI_KIT_1018 §4) · 예전 설정(펼침 기억)은 새 키로 한 번 초기화
let dpsOpen = getPref('dpsOpen1018', false);
let dpsTab: 'dealt' | 'healed' | 'taken' = 'dealt';
const DPS_HEAD = { dealt: '피해량', healed: '회복량', taken: '받은 피해' } as const;
let paused = false;
/** 전투 그림(영웅 시트·컷인)을 받는 중 */
let artWait = false;
const hud = () => $('#hud');

// ───────── 아래 영웅 4칸 (UI_KIT_1018 §4 · target_1018/battle.jpg) ─────────
//  칸 너비 203 · 칸 안 좌표: 상반신(틀 없음 · x+33 중심 · 아래 붙임) · nameplate x+68 y302 126×18 · HP bar y321 126×9 · MP y330 126×7 · socket 40 ×3 x+68+j·43 y339
const SLOT = 203;
function buildBar() {
  const bar = $('#bar');
  bar.innerHTML = b!.heroes
    .filter((u) => !u.ai)
    .map((u, i) => {
      const h = u.hero!.def;
      return `<div class="hc" data-h="${i}" style="left:${i * SLOT}px"><img class="bust" data-bust="${h.id}" alt="" draggable="false">
      ${kit9('nameplate', 126, 18, 9, 'np', '', `<span class="tx nm">${esc(h.name)}</span><span class="tx lv">Lv.${u.hero!.lv}</span>`)}
      ${kitBar(126, 9, u.hp / u.max, T.kit2.hp, 'bar', 'hp')}${kitBar(126, 7, u.mana / 100, T.kit2.mp, 'bar', 'mp')}
      ${h.skills.map((s, k) => `<button class="sk" data-s="${k}" style="left:${68 + k * 43}px" title="${esc(s.name)} · ${esc(descSkill(s))} (마나 ${s.cost} · ${s.cd}초)">${kitSocket(skillIconUrl(h.id, k), 40, null, '', '<b class="tx"></b>')}</button>`).join('')}</div>`;
    })
    .join('');
  $$('.hc', bar).forEach((c) => {
    const u = b!.heroes[+c.dataset.h!];
    $$<HTMLButtonElement>('button[data-s]', c).forEach((btn) => (btn.onclick = () => requestSkill(b!, u, +btn.dataset.s!)));
    const im = $<HTMLImageElement>('.bust', c);
    void bustUrl(im.dataset.bust!).then((url) => (im.src = url)).catch(() => {});
  });
}
const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
function syncHud() {
  const bb = b!;
  if ($('#bAuto').getAttribute('aria-pressed') !== String(bb.auto)) $('#bAuto').setAttribute('aria-pressed', String(bb.auto));
  if ($('#bSpeed span').textContent !== `×${bb.speed}`) speedLabel();
  $$('.hc', $('#bar')).forEach((c) => {
    const u = bb.heroes[+c.dataset.h!];
    c.classList.toggle('dead', u.dead);
    setBar($('.hp', c), u.hp / u.max);
    setBar($('.mp', c), u.mana / 100);
    $$<HTMLButtonElement>('button[data-s]', c).forEach((btn) => {
      const i = +btn.dataset.s!;
      const cd = u.scd[i];
      btn.classList.toggle('ok', canCast(bb, u, i));
      // 마나 부족 (쿨타임 아님): 채도 낮춤 · 쿨타임: 창 위 알파 0.55 검정 + 남은 초 (UI_KIT_1018 §4)
      btn.classList.toggle('nomana', cd <= 0 && u.mana < u.hero!.def.skills[i].cost);
      btn.classList.toggle('cd', cd > 0);
      const t = cd > 0 ? String(Math.ceil(cd)) : '';
      const el = btn.querySelector('b')!;
      if (el.textContent !== t) el.textContent = t;
    });
  });
  const boss = bossOf(bb);
  const showBoss = !!boss && bb.phase !== 'walk';
  $('#boss').hidden = !showBoss;
  const waves = bb.setup.waves.length;
  const wave = bb.wave < 0 ? 1 : Math.min(bb.wave + 1 + (bb.phase === 'walk' ? 1 : 0), waves);
  const left = Math.max(0, bb.setup.limit - bb.stats.time);
  // 가운데 띠: 「숲 동굴 1-2 · WAVE 1/2 · 2:41」 (30초 남으면 시간만 빨강)
  const st = `${esc(bb.setup.title)}<i>·</i>${bb.raid ? '' : `WAVE ${wave}/${waves}<i>·</i>`}<b class="${left <= CONFIG.ui.clockLowSec ? 'low' : ''}">${mmss(left)}</b>`;
  const se = $('#stripT');
  if (se.innerHTML !== st) se.innerHTML = st;
  if (showBoss) {
    $('#bName').textContent = boss!.name;
    $('#bPct').textContent = `${Math.ceil((boss!.hp / boss!.max) * 100)}%`;
    setBar($('#boss .kbar'), boss!.hp / boss!.max);
  }
  // 보스 전장은 보스가 나올 때 생김 → 그때 HUD를 바꿈
  if (!!bb.raid !== hud().classList.contains('raid')) (buildRaid(), dpsLabel());
  syncRaid(bb);
  const w = $('#warn');
  w.hidden = !bb.pat.text || bb.phase === 'win' || bb.phase === 'lose';
  const wt = `${iconText('warn')} ${bb.pat.text}`;
  if (bb.pat.text && w.textContent !== wt) w.textContent = wt;
  if (run?.mode === 'arena') syncPvpHud(bb, $('#pvpHud'));
  if (dpsOpen) {
    const sorted = [...bb.heroes].sort((a, c) => c[dpsTab] - a[dpsTab]).slice(0, bb.raid ? CONFIG.raidArena.rankShow : undefined);
    const top = Math.max(1, sorted[0][dpsTab]);
    // 한 줄 = 이름 · 값 · 아래 얇은 직업색 막대 (글씨 1종 · UI_KIT_1018 §4)
    const rows = sorted.map((u) => `<div class="dr"><span class="tx nm">${esc(u.name)}</span><span class="tx v">${shortNum(u[dpsTab])}</span><i class="g"><i style="width:${(u[dpsTab] / top) * 100}%;background-color:${T.battle.jobColor[u.hero!.def.job]}"></i></i></div>`).join('');
    const el = $('#dpsL .rows');
    if (el.innerHTML !== rows) el.innerHTML = rows;
  }
}

/** 보스 전장 HUD: 부위 체력(누르면 집중) · 그로기 · 줄 바꾸기 */
function buildRaid() {
  const r = b!.raid;
  hud().classList.toggle('raid', !!r);
  $('#raidHud').hidden = !r;
  $('#bDodge').hidden = !r;
  if (!r) return;
  $('#rParts').innerHTML = r.parts.map((p, i) => `<button data-p="${i}" aria-pressed="false"><span class="tx">${esc(p.name)}</span>${kitBar(90, 8, 1, T.kit2.mobHp)}</button>`).join('');
  $('#raidHud .ggb').innerHTML = kitBar(150, 9, 0, T.kit2.mp);
  $$<HTMLButtonElement>('#rParts button').forEach((btn) => (btn.onclick = () => {
    const rr = b?.raid;
    if (!rr) return;
    const i = +btn.dataset.p!;
    rr.focus = rr.focus === i || rr.parts[i].broken ? -1 : i;
  }));
  $('#bDodge').onclick = () => b && raidDodge(b);
}
function speedLabel() {
  $('#bSpeed span').textContent = `×${b!.speed}`;
  $('#bSpeed').classList.toggle('fast', b!.speed > 1);
}
let pauseMenu: HTMLElement | null = null;
function setPaused(on: boolean) {
  paused = on;
  $('#bPause').setAttribute('aria-pressed', String(on));
  if (!on && pauseMenu) (pauseMenu.remove(), (pauseMenu = null));
}
/** 일시정지 메뉴 (팝업 1종): 계속하기 · 포기하기 (포기 버튼은 여기 안으로 · UI_KIT_1018 §4) */
function openPause() {
  if (!b || pauseMenu) return;
  const canQuit = b.phase === 'fight' || b.phase === 'walk';
  setPaused(true);
  pauseMenu = modal('일시정지', `<p>${esc(b.setup.title)} · ${mmss(b.stats.time)} 진행 중</p>${canQuit ? '<p class="dim">포기하면 이 전투는 패배로 끝나요.</p>' : ''}`, [
    ...(canQuit ? ([['포기하기', () => {
      pauseMenu = null;
      setPaused(false);
      if (b && (b.phase === 'fight' || b.phase === 'walk')) ((b.phase = 'lose'), (b.why = 'wipe'));
    }]] as [string, () => void][]) : []),
    ['계속하기', () => ((pauseMenu = null), setPaused(false)), true],
  ]);
  pauseMenu.dataset.pause = '';
}
function dpsLabel() {
  $('#dps').classList.toggle('open', dpsOpen);
  $('#bDps').title = dpsOpen ? '피해 판 접기' : '피해 판 펼치기';
  $$<HTMLButtonElement>('#dpsL [data-dt]').forEach((t) => {
    t.classList.toggle('on', t.dataset.dt === dpsTab);
    t.textContent = t.dataset.dt === 'dealt' && b?.raid ? '피해 순위' : DPS_HEAD[t.dataset.dt as typeof dpsTab].replace('량', '');
  });
}
function syncRaid(bb: Battle) {
  const r = bb.raid;
  if (!r) return;
  const auto = r.focus >= 0 ? r.focus : r.parts.findIndex((p) => !p.broken);
  $$<HTMLButtonElement>('#rParts button').forEach((btn) => {
    const p = r.parts[+btn.dataset.p!];
    btn.classList.toggle('broken', p.broken);
    btn.setAttribute('aria-pressed', String(+btn.dataset.p! === auto && !p.broken));
    setBar($('.kbar', btn), p.hp / p.max);
  });
  setBar($('#raidHud .ggb .kbar'), r.downT > 0 ? 1 : r.groggy / r.gMax);
  $('#rDown').textContent = r.downT > 0 ? `다운 ${Math.ceil(r.downT)}초` : '';
  $('#bDodge').classList.toggle('hot', r.warnLane != null);
}

// ───────── 연출 (UI_KIT_1018 §4 연출 순서): BATTLE → (보스 등장 카드) → … → VICTORY / DEFEAT → 결과 ─────────
/** 연출 타이머: 전투 화면 tick(dt)이 줄여 감 (녹화 모드에서도 장면 시간 그대로 · 화면을 떠나면 버림) */
let cueTimers: { left: number; fn: () => void }[] = [];
const after = (sec: number, fn: () => void) => cueTimers.push({ left: sec, fn });
function cueTimersTick(dt: number) {
  if (!cueTimers.length) return;
  for (const t of cueTimers) t.left -= dt;
  const due = cueTimers.filter((t) => t.left <= 0);
  cueTimers = cueTimers.filter((t) => t.left > 0);
  for (const t of due) t.fn();
}
/** 빛살 (캔버스로 한 번 그려 둠 · 16줄 · 흐림) */
let raysUrl = '';
function rays() {
  if (raysUrl) return raysUrl;
  const W = 844;
  const H = 390;
  const c = document.createElement('canvas');
  c.width = W * 2;
  c.height = H * 2;
  const x = c.getContext('2d')!;
  x.scale(2, 2);
  x.filter = 'blur(6px)';
  x.fillStyle = T.kit2.ray;
  const [cx, cy] = [422, 170];
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8;
    x.beginPath();
    x.moveTo(cx, cy);
    x.lineTo(cx + Math.cos(a - 0.07) * 900, cy + Math.sin(a - 0.07) * 900);
    x.lineTo(cx + Math.cos(a + 0.07) * 900, cy + Math.sin(a + 0.07) * 900);
    x.fill();
  }
  return (raysUrl = c.toDataURL('image/png'));
}
/** 그림 글씨 한 번 (어둡게 + 빛살 + 가운데 (422,170) · 0.15초 커짐 → 유지 → 0.15초 사라짐) */
function cueWord(name: 'word_battle' | 'word_victory' | 'word_defeat', w: number, sec: number): Promise<void> {
  const el = document.createElement('div');
  el.className = `cue word ${name}`;
  el.style.setProperty('--cue', `${sec}s`);
  el.innerHTML = `<img class="rays" src="${rays()}" alt=""><img class="wd" src="${titleUrl(`${name}.png`)}" alt="" style="width:${w}px;left:calc(50% - ${w / 2}px)">`;
  $('#cue').append(el);
  after(Math.max(0, sec - 0.15), () => el.classList.add('out'));
  return new Promise((ok) => after(sec, () => (el.remove(), ok())));
}
/** 보스 등장 카드: 검은 화면 0.6 + 보스 전신(오른쪽) + 리본 「BOSS」 + 이름 · 1.5초 · 누르면 넘김 */
let bossCard: { el: HTMLElement; end: () => void } | null = null;
function bossIntro(boss: Unit): Promise<void> {
  return new Promise((ok) => {
    const cell = boss.anims.idle!.frames[0];
    const [dir, key] = cell.split(':');
    const el = document.createElement('div');
    el.className = 'cue boss';
    el.innerHTML = `<img class="bfull" src="${import.meta.env.BASE_URL}art/${dir}/${key}.png" alt="">
      ${kit9('ribbon', 210, 40, 20, 'brib', '', '<span class="th">BOSS</span>')}<b class="th bname">${esc(boss.name)}</b><span class="tx bskip">눌러서 넘기기</span>`;
    $('#cue').append(el);
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      bossCard = null;
      el.classList.add('out');
      after(0.2, () => (el.remove(), ok()));
    };
    bossCard = { el, end };
    el.onclick = end;
    after(1.5, end);
  });
}
/** 연출이 화면을 잡고 있는 동안 전투 진행 멈춤 */
let cueBattle = false;
let cueBossWave = -1;
function cueTick(bb: Battle) {
  if (!cueBattle && !talking && !intro && !artWait) {
    cueBattle = true;
    void cueWord('word_battle', 360, 0.9);
  }
  const bw = bb.wave;
  if (bw >= 0 && bw !== cueBossWave && bb.phase === 'fight' && run?.mode !== 'arena') {
    cueBossWave = bw;
    const boss = bb.mobs.find((m) => m.mob?.boss);
    if (boss) {
      void bossIntro(boss);
    }
  }
}

function setup() {
  headHpPref.always = getPref('hpAlways', false);
  const keepAuto = b?.auto ?? getPref('auto', false);
  const keepSpeed = b?.speed ?? 1;
  b = makeBattle(run ? buildRun(run) : buildStage(st), { w: view.w });
  // 이 전투 영웅 시트·컷인을 아직 안 받았으면 받을 때까지 전투를 멈춤 (SPRITE_RES §C)
  const wait = ensureBattleArt(b.setup);
  artWait = !!wait;
  if (wait) void wait.then(() => (artWait = false));
  b.auto = keepAuto;
  b.speed = keepSpeed;
  b.cutIns = flag('cutIn') && !getPref('cutOff', false) ? 'big' : 'off';
  $('#bAuto').setAttribute('aria-pressed', String(b.auto));
  speedLabel();
  setPaused(false);
  setBackdrop(`${import.meta.env.BASE_URL}art/${b.setup.bg ? `bgs/${b.setup.bg}` : 'bg'}.jpg`);
  cueBattle = false;
  bossCard = null;
  cueBossWave = -1;
  cueTimers = [];
  $('#cue').innerHTML = '';
  buildBar();
  buildRaid();
  dpsLabel();
  // 결투장: 팀 전체 체력 줄 · 감정 표현 버튼 (MOBILE_REF §3-B)
  const pvp = run?.mode === 'arena';
  hud().classList.toggle('pvp', pvp);
  $('#pvpHud').hidden = !pvp;
  $('#bEmote').hidden = !pvp;
  $('#emoPop').hidden = true;
  if (pvp) {
    $('#pvpHud').innerHTML = pvpHudHtml(b, run!);
    syncPvpHud(b, $('#pvpHud'));
  }
  resetAiEmote();
  $('#result').hidden = true;
  shown = false;
  const boss = b.setup.waves.flat().find((m) => m.boss);
  $('#boss').innerHTML = `${boss?.portrait ? kitSocket(portraitUrl(boss.portrait), 30, null, 'bp') : ''}<span class="tx bn" id="bName">보스</span><span class="tx bpct" id="bPct">100%</span>${kitBar(300, 14, 1, T.kit2.mobHp, 'bar_thick')}`;
}

// ───────── 결과 화면 1종 (UI_KIT_1018 §5 · target_1018/result.jpg) — 스토리·콘텐츠·레이드·결투장 같은 화면 ─────────
//  배경 = 전투 배경 흐림 6px + 어둡게 0.68 · 위 strip 「원정대 레벨」 + bar_thick · 영웅 전신 4명(높이 190, 발 y 256, x = 257 + i·110) + LEVEL UP 그림
//  · 영웅 아래 Lv / EXP +n / bar_thick 96×12 + % · 전리품 loot_band(122,306,600×62) + 등급 받침 42 하나씩 반짝 · 오른쪽 medal 56 ×3 · 왼쪽 아래 medal 48 「통계」
interface ResultView {
  win: boolean;
  heroes: { id: string; gain: number; up: boolean }[];
  loot: { url: string; rarity: Rarity; n: string; title: string }[];
  /** 전리품이 없을 때 띠 안 한 줄 */
  hint?: string;
  stats: [string, string][];
  lines?: string[];
  /** 오른쪽 medal 3개: [글, data-a, 아이콘, 못 누름] */
  buttons: [string, string, string, boolean?][];
}
const medalBtn = (size: number, label: string, a: string, ic: string, off = false) =>
  `<button class="rmed" data-a="${a}" ${off ? 'disabled' : ''} style="width:${size}px;height:${size}px">${kitPart('medal', size, size)}<i class="ric">${svgIcon(ic)}</i><span class="tx">${label}</span></button>`;
function resultScreen(v: ResultView, onAct: (a: string) => void) {
  const r = $('#result');
  const acc = Math.min(1, S.acc.exp / accNeed(S.acc.lv));
  const hs = v.heroes.slice(0, 4);
  const cx = (i: number) => 422 + (i - (hs.length - 1) / 2) * 110;
  const n = v.loot.length;
  const step = Math.min(50, 236 / Math.max(1, n));
  const sz = Math.min(42, step - 4);
  r.innerHTML = `<div class="rin">
    ${kit9('strip', 320, 30, 15, 'rtop', '', `<span class="tx">원정대 레벨 ${S.acc.lv}</span>`)}${kitBar(180, 14, acc, T.kit2.party, 'bar_thick', 'racc')}
    ${hs.map((h, i) => {
      const hv = S.heroes[h.id];
      const ratio = hv ? Math.min(1, hv.exp / expNeed(hv.lv)) : 0;
      return `<div class="rh" style="left:${cx(i)}px"><img class="rfb" data-full="${h.id}" alt="">${h.up ? `<img class="rlu" src="${titleUrl('word_levelup.png')}" alt="LEVEL UP" style="--i:${i}">` : ''}
        <span class="tx rlv">Lv.${hv?.lv ?? 1}</span>${h.gain ? `<span class="tx rex">EXP +${fmt(h.gain)}</span>` : ''}${kitBar(96, 12, ratio, T.kit2.exp, 'bar_thick', 'rxb', `<b class="tx">${Math.floor(ratio * 100)}%</b>`)}</div>`;
    }).join('')}
    <div class="rloot">${kitPart('loot_band', 600, 62)}<span class="tx rlt">전리품</span>
      ${n ? v.loot.map((it, j) => `<div class="rit" style="left:${300 - (n * step) / 2 + j * step + (step - sz) / 2}px;--i:${j}" title="${esc(it.title)}">${kitSocket(it.url, sz, it.rarity, '', it.n ? `<b class="tx">${it.n}</b>` : '')}</div>`).join('') : `<span class="tx rnone">${esc(v.hint || '전리품 없음')}</span>`}</div>
  </div>
  <div class="rbtns">${v.buttons.map(([l, a, ic, off]) => medalBtn(56, l, a, ic, off)).join('')}</div>
  <div class="rstat">${medalBtn(48, '통계', 'stats', 'stats')}</div>`;
  r.hidden = false;
  r.classList.toggle('lose', !v.win);
  $$<HTMLImageElement>('img[data-full]', r).forEach((im) => void fullUrl(im.dataset.full!, 190).then((u) => (im.src = u)).catch(() => {}));
  $$<HTMLButtonElement>('#result [data-a]').forEach((btn) => {
    btn.onclick = () => {
      if (btn.dataset.a === 'stats') return void modal('통계', `<div class="kvs">${v.stats.map(([k, x]) => `<div class="kv"><span>${k}</span><b>${x}</b></div>`).join('')}${(v.lines ?? []).map((l) => `<p class="xs">${esc(l)}</p>`).join('')}</div>`, [['닫기', null, true]]);
      onAct(btn.dataset.a!);
    };
  });
}
/** 영웅 칸 (내 파티만 · AI 동료 빼고) */
const partyView = (bb: Battle, gain = 0, ups: string[] = []) => bb.heroes.filter((u) => !u.ai).map((u) => ({ id: u.hero!.def.id, gain, up: ups.includes(u.hero!.def.id) }));
/** 재화·장비·룬 → 전리품 받침 */
function lootOf(items: [string, number][], gear: Gear[], runes: Rune[]): ResultView['loot'] {
  const cur = items.filter(([, v]) => v > 0).map(([k, v]) => ({ url: iconArt(k) ?? `${UI_ART}icons/star.png`, rarity: (k === 'stardust' ? 'epic' : k === 'enh' ? 'rare' : 'common') as Rarity, n: `+${shortNum(v)}`, title: `${CUR_NAME[k] ?? k} +${fmt(v)}` }));
  return [...gear.map((g) => ({ url: gearArtUrl(g), rarity: socketRarity(g.grade), n: '', title: gearName(g) })), ...runes.map((x) => ({ url: runeArtUrl(x), rarity: socketRarity(x.grade), n: '', title: '룬' })), ...cur];
}
/** 콘텐츠 결과 (토벌·던전·탑·요일·레이드·월드 보스·결투장·외전) — 같은 결과 화면 */
function showRunResult() {
  const bb = b!;
  const r = run!;
  let win = bb.phase === 'win';
  const go2 = (a: string) => {
    if (a === 'portal') (r.mode === 'graid' ? go('guild', { tab: 'raid' }, false) : go('portal', { tab: r.mode }, false));
    else if (a === 'again') beginRun(r);
    else if (a === 'nextrun' && nextFloor) beginRun(nextFloor);
  };
  // 최후의 리그: 3판 중 2판 — 아직 안 끝났으면 다음 판
  if (r.mode === 'arena' && r.arg === 'last') {
    series[win ? 'wins' : 'losses']++;
    if (series.wins < 2 && series.losses < 2) {
      const leg = (r.leg ?? 0) + 1;
      resultScreen({ win, heroes: partyView(bb), loot: [], hint: `최후의 리그 ${series.wins}승 ${series.losses}패 · 다음은 파티 ${leg + 1}`, stats: [['이번 판', win ? '승리' : '패배'], ['시간', `${Math.floor(bb.stats.time)}초`]], buttons: [['다음 판', 'leg', 'next'], ['다시하기', 'again', 'repeat', true], ['나가기', 'portal', 'back']] }, (a) => {
        if (a === 'leg') {
          run = { ...r, leg };
          $('#result').hidden = true;
          b = null;
          setup();
          intro = true;
          countdown(() => (intro = false));
        } else go2(a);
      });
      return;
    }
    win = series.wins >= 2;
  }
  const scoreRun = r.mode === 'world' || r.mode === 'graid';
  const o = finishRun(r, { win: win && !scoreRun, dealt: scoreRun ? bb.stats.bossDealt : bb.stats.dealt, heroes: bb.heroes.filter((u) => !u.ai).map((u) => u.hero!.def.id) });
  persist();
  const mvp = mvpOf(bb);
  const nextFloor: Run | null = r.mode === 'tower' && win ? { ...r, arg: +r.arg + 1 } : r.mode === 'side' && win && (r.sub ?? 0) < CONFIG.content.side.acts ? { ...r, sub: (r.sub ?? 1) + 1 } : null;
  const left = triesText(r);
  const rs = raidSummary(bb);
  const stats: [string, string][] = [['콘텐츠', MODE_NAME[r.mode]], ['결과', scoreRun ? '기록' : win ? '승리' : bb.why === 'time' ? '시간 초과' : '패배'], ['시간', `${Math.floor(bb.stats.time)}초`], ['총 피해', shortNum(bb.stats.dealt)], ['초당', shortNum(partyDps(bb))], ['MVP', esc(mvp.name)]];
  if (rs) {
    stats.push(['페이즈', `${rs.phase}페이즈까지`], ['회피', `직접 ${rs.dodges.manual} · 자동 ${rs.dodges.auto} · 맞음 ${rs.dodges.hit}`]);
    for (const p of rs.parts) stats.push([esc(p.name), p.broken ? `파괴 · ${esc(p.top)}` : '남음']);
  }
  if (left) stats.push(['남은 도전', left]);
  resultScreen({ win: win || scoreRun, heroes: partyView(bb), loot: lootOf(o.items, o.gear, o.runes), hint: o.lines[0] || (win ? '전리품 없음' : '이번엔 보상이 없어요'), stats, lines: o.lines,
    buttons: [[nextFloor ? (r.mode === 'tower' ? `${+r.arg + 1}층` : '다음 막') : '다음 전투', 'nextrun', 'next', !nextFloor], [`다시하기${left ? ` (${left})` : ''}`, 'again', 'repeat', !!lockOf(r)], ['나가기', 'portal', 'back']] }, go2);
}
/** 콘텐츠 전투 시작: 도전 수 쓰고 → 파티를 세우고 → (외전 대사) → 전투 */
function beginRun(r: Run) {
  const lock = lockOf(r);
  if (lock || !useTry(r)) {
    modal(`${icon('lock')} ${MODE_NAME[r.mode]}`, `<p class="dim">${esc(lock ?? '지금은 못 들어가요')}</p>`, [['확인', null, true]]);
    return;
  }
  persist();
  run = { ...r, leg: 0 };
  series = { wins: 0, losses: 0 };
  $('#result').hidden = true;
  b = null;
  setup();
  if (r.mode === 'arena') {
    intro = true;
    vsIntro(b!, r, () => countdown(() => (intro = false)));
  }
  if (r.mode === 'side') {
    const id = String(r.arg);
    const h = heroOf(id);
    const act = r.sub ?? 1;
    const own = SIDE[id];
    const lines: Line[] = own ? [...(act === 1 ? [['narr', `${h.name} 외전 — 「${own.title}」`] as Line] : []), ...own.acts[act - 1]] : act === 1 ? [['narr', `${h.name} 외전 — 「${h.title}」`], [id, `${h.concept.split('.')[0]}… 그 이야기를 들려줄게.`]] : act === CONFIG.content.side.acts ? [[id, '여기가 마지막이야. 같이 끝내자.']] : [[id, '조금만 더 가 보자.']];
    talking = true;
    playTalk(lines, () => (talking = false));
  }
}

function showResult() {
  // 외전 마지막 막을 이기면 끝 대사 → 결과
  const sideEnd = run?.mode === 'side' && b!.phase === 'win' && (run.sub ?? 1) === CONFIG.content.side.acts ? SIDE[String(run.arg)]?.clear : undefined;
  if (sideEnd) return playTalk(sideEnd, showRunResult);
  if (run) return showRunResult();
  const bb = b!;
  const win = bb.phase === 'win';
  const mvp = mvpOf(bb);
  const next: StageId = st.s < C.stages ? { ...st, s: st.s + 1 } : { c: st.c + 1, s: 1, d: st.d };
  // 다음 스테이지가 열렸는지는 이번 판 기록(recordClear) 뒤에 봄
  const hasNext = () => st.c <= C.chapters && next.c <= C.chapters && unlocked(next);
  const act = (a: string) => {
    if (a === 'again') begin(st);
    else if (a === 'next' && hasNext()) begin(next);
    else if (a === 'exit') go('adventure', { c: st.c, d: st.d, s: st.s }, false);
    else if (a === 'lobby') go('lobby', {}, false);
    else if (a === 'form') go('prep', { stage: st }, false);
  };
  if (!win) {
    resultScreen({ win, heroes: partyView(bb), loot: [], hint: `${bb.wave >= bb.setup.waves.length - 1 && bossOf(bb) ? '보스' : `웨이브 ${bb.wave + 1}`}에서 멈췄어요 · 레벨을 올리거나 편성을 바꿔 봐요`,
      stats: [['결과', bb.why === 'time' ? '시간 초과' : '패배'], ['시간', `${Math.floor(bb.stats.time)}초`], ['총 피해', shortNum(bb.stats.dealt)], ['MVP', esc(mvp.name)], ['추천', '반복 전투·방치 보상으로 경험치 모으기']],
      buttons: [['편성', 'form', 'formation'], [`다시하기 ${stageCost(st.d)}`, 'again', 'repeat'], firstRun ? ['나가기', 'lobby', 'back'] : ['나가기', 'exit', 'back']] }, act);
    return;
  }
  const stars = starsOf(bb);
  const dps = partyDps(bb);
  const res = recordClear(st, { stars, time: bb.stats.time, dps, mvp: mvp.hero!.def.id });
  persist();
  const allUp = bb.heroes.every((h) => !h.dead);
  const items: [string, number][] = [['gold', res.got.gold], ['exp', res.got.exp], ['stardust', res.got.stardust], ['enh', res.got.enh]];
  const ok = (x: boolean) => (x ? '달성' : '-');
  const show = () =>
    resultScreen({ win, heroes: partyView(bb, res.got.exp, res.got.ups), loot: lootOf(items, res.got.gear, res.got.runes),
      stats: [['별', `${iconText('star').repeat(stars)}${iconText('starOff').repeat(3 - stars)}`], ['클리어', ok(true)], ['아무도 안 쓰러짐', ok(allUp)], [`${bb.setup.starTime}초 안`, ok(bb.stats.time <= bb.setup.starTime)], ['시간', `${Math.floor(bb.stats.time)}초`], ['총 피해', shortNum(bb.stats.dealt)], ['초당', `${shortNum(dps)}${res.newBest ? ' (최고 기록!)' : ''}`], ['MVP', `${esc(mvp.name)} ${shortNum(mvp.dealt)}`]],
      lines: [...(res.got.chest ? ['따뜻한밤이 숨은 상자를 찾았어요 (금화 더)'] : []), ...(res.joined ? [`${heroOf(res.joined).name} 합류!`] : [])],
      buttons: firstRun ? [['다음 전투', 'lobby', 'next'], ['다시하기', 'again', 'repeat'], ['나가기', 'lobby', 'back']] : [['다음 전투', 'next', 'next', !hasNext()], [`다시하기 ${stageCost(st.d)}`, 'again', 'repeat'], ['나가기', 'exit', 'back']] }, act);
  const joined = () => (res.joined ? joinShow(res.joined, show) : show());
  if (firstRun) {
    S.prologue = true;
    persist();
  }
  if (res.first && isBoss(st) && st.d === 0 && !S.seen[`${st.c}:clear`]) {
    S.seen[`${st.c}:clear`] = true;
    persist();
    playTalk(CHAPTERS[st.c - 1].clear!.filter(([who]) => who !== res.joined), joined);
  } else joined();
}
/** 합류 연출 (STAR_PLAN_v2 §1-9): 큰 초상 + 대사 + 「합류!」 */
function joinShow(id: string, done: () => void) {
  const h = heroOf(id);
  const line = CHAPTERS.flatMap((c) => c.clear ?? []).find(([who]) => who === id)?.[1] ?? h.concept;
  const el = document.createElement('div');
  el.className = 'join';
  el.innerHTML = `<div class="jframe" style="background-image:url(${UI_ART}hero_frame.png)"><div class="jface" style="background-image:url(${heroPortrait(id)})"></div></div><div class="jfb" style="background-image:url(${fullbodyUrl(id)})"></div><div class="col"><small>${esc(h.title)}</small><b>${fxt(h.name)}</b><p>「${esc(line)}」</p><em>${icon('join')} 합류!</em><span class="xs mute">눌러서 계속</span></div>`;
  $('#stage').append(el);
  el.onclick = () => {
    el.remove();
    done();
  };
}
export const repeatText = (h: NonNullable<ReturnType<typeof repeatBattle>>) =>
  `반복 전투 ${h.runs}판: 금화 +${fmt(h.gold)} · 경험치 +${fmt(h.exp)}${h.enh ? ` · 강화석 +${h.enh}` : ''}${h.gear ? ` · 장비 ${h.gear}개` : ''}${h.ups.length ? ` · 레벨 업 ${h.ups.map((id) => heroOf(id).name).join('·')}` : ''}${h.accUp ? ' · 원정대 레벨 업!' : ''}`;
/** 행동력 쓰고 → 파티를 필드에 세우고 → 대사(있으면) → 전투 시작 */
function begin(s: StageId) {
  run = null;
  const cost = firstRun ? 0 : stageCost(s.d);
  const use = useStamina(cost);
  if (!use.ok) {
    modal(`${icon('stamina')} 행동력이 모자라요`, `<p class="dim">이 스테이지는 행동력 ${cost}이 필요해요. 시간이 지나면 차거나, 상단 바 [+]로 채울 수 있어요.</p>`, [['확인', null, true]]);
    return;
  }
  if (use.up) toast('원정대 레벨 업! 행동력이 가득 찼어요');
  persist();
  st = s;
  $('#result').hidden = true;
  b = null;
  setup();
  const ch = CHAPTERS[s.c - 1];
  let lines: Line[] = [];
  if (firstRun) {
    lines = PROLOGUE;
    S.seen[`${s.c}:intro`] = true;
  } else {
    const key = s.d === 0 && s.s === 1 ? `${s.c}:intro` : s.d === 0 && isBoss(s) ? `${s.c}:preBoss` : '';
    const ls = key === `${s.c}:intro` ? ch.intro : ch.preBoss;
    if (key && ls && !S.seen[key]) {
      S.seen[key] = true;
      lines = ls;
    }
  }
  persist();
  if (!lines.length) return;
  talking = true;
  playTalk(lines, () => (talking = false));
}

register('battle', {
  canvas: true,
  enter(_root, p) {
    hud().hidden = false;
    applyTheme(p.run && CONFIG.ui.darkModes.includes((p.run as Run).mode) ? 'dark' : 'glass');
    $('#bAuto').onclick = () => {
      if (!b) return;
      b.auto = !b.auto;
      setPref('auto', b.auto);
      $('#bAuto').setAttribute('aria-pressed', String(b.auto));
    };
    $('#bSpeed').onclick = () => {
      if (!b) return;
      const sp = CONFIG.ui.speeds as readonly number[];
      b.speed = sp[(sp.indexOf(b.speed) + 1) % sp.length];
      speedLabel();
    };
    $('#bPause').onclick = () => (paused ? setPaused(false) : openPause());
    $('#bDps').onclick = () => {
      dpsOpen = !dpsOpen;
      setPref('dpsOpen1018', dpsOpen);
      dpsLabel();
    };
    $$<HTMLButtonElement>('#dpsL [data-dt]').forEach((t) => (t.onclick = () => ((dpsTab = t.dataset.dt as typeof dpsTab), dpsLabel())));
    $('#cv').onpointerdown = () => b?.raid && b.phase === 'fight' && raidDodge(b);
    // 😊 감정 표현 (결투장 · 빠른 채팅과 같은 묶음 4개)
    $('#bEmote').textContent = iconText('emote');
    $('#emoPop').innerHTML = CONFIG.social.quick.emotes.map((k) => `<button data-emo="${k}">${icon(k)}</button>`).join('');
    $('#bEmote').onclick = () => ($('#emoPop').hidden = !$('#emoPop').hidden);
    $$<HTMLButtonElement>('#emoPop [data-emo]').forEach((x) => (x.onclick = () => {
      if (b) emote(b, 'hero', x.dataset.emo!);
      $('#emoPop').hidden = true;
    }));
    view.onResize.push(onResize);
    firstRun = !!p.first;
    talking = false;
    if (p.run) beginRun(p.run as Run);
    else begin(p.stage as StageId);
  },
  leave() {
    applyTheme('glass');
    hud().hidden = true;
    hud().classList.remove('raid', 'pvp');
    document.querySelectorAll('#stage > .vs, #stage > .cdown').forEach((e) => e.remove());
    intro = false;
    setPaused(false);
    bossCard?.end();
    cueTimers = [];
    $('#cue').innerHTML = '';
    $('#cv').onpointerdown = null;
    $('#result').hidden = true;
    b = null;
    view.onResize = view.onResize.filter((f) => f !== onResize);
  },
  tick(dt) {
    const ctx = view.ctx;
    cueTimersTick(dt);
    if (!b) return void renderIdle(ctx, view.art, dt);
    // 결과 화면 뒤는 전투 배경만 (흐림·어둡게는 #result가 · UI_KIT_1018 §5)
    if (!$('#result').hidden) return void renderBg(ctx, view.art, b.scroll, b.w, b.setup.region, b.setup.bg);
    if (talking || intro) {
      idleStep(b, dt);
      return render(ctx, view.art, b, performance.now() / 1000);
    }
    cueTick(b);
    if (paused || artWait || bossCard) return void render(ctx, view.art, b, performance.now() / 1000);
    step(b, dt);
    if (run?.mode === 'arena') aiEmote(b, dt);
    for (const s of b.sounds) combatSynth(s, s === 'hit' ? 0.45 : 1);
    // 끝: 마지막 일격 슬로우 뒤 VICTORY(가로 470) / DEFEAT 그림 글씨 + 빛살 1.2초 → 결과 화면 (UI_KIT_1018 §4-5)
    if ((b.phase === 'win' || b.phase === 'lose') && !shown) {
      shown = true;
      const me = b;
      const win = b.phase === 'win';
      after(win ? CONFIG.ui.resultDelayWin : CONFIG.ui.resultDelayLose, () => {
        if (b !== me) return;
        void cueWord(win ? 'word_victory' : 'word_defeat', 470, 1.2).then(() => b === me && showResult());
      });
    }
    syncHud();
    // 컷인 동안엔 HUD를 내려 컷인이 맨 위로 (보스 체력 바는 남김 · POLISH_1017 ③-2)
    hud().classList.toggle('cutin', !!b.cut);
    render(ctx, view.art, b, performance.now() / 1000);
  },
});
const onResize = (w: number) => b && relayout(b, w);
let idleScroll = 0;
function renderIdle(ctx: CanvasRenderingContext2D, art: Art, dt: number) {
  idleScroll += 20 * dt;
  renderBg(ctx, art, idleScroll, view.w, (st.c - 1) % 10);
}
/** 시험·녹화용 */
export const battleNow = () => b;
/** 이 전투 그림을 아직 받는 중인지 (캡처 도구가 기다림) */
export const battleArtWait = () => artWait || intro;
