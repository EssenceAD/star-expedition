// 별의 원정대 (가제) 파일럿: 전투 한 판 — 웨이브 3 + 보스 · 패널(초상화·체력·마나·버프·스킬 3 + 쿨타임·패널 Auto) · AUTO · ×1/×1.5/×2 · DPS · 보스 예고 · 결과
import { loadSheets } from './sprite/sheet';
import { HEROES, MOBS, REWARDS, WAVES, COMBAT } from './battle/data';
import { alive, bossOf, canCast, makeBattle, requestSkill, starsOf, step, type Battle, type Unit } from './battle/sim';
import { LH, LW, render, short, type Art } from './battle/render';
import { loadFlags } from './core/flags';
import { initAudioEngine } from './core/audio/engine';
import { combatSynth } from './core/audio/combatSfx';
import { readSave, writeSave } from './core/save';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const stage = $('#stage');
const cv = $('#cv') as HTMLCanvasElement;
const ctx = cv.getContext('2d')!;
const q = new URLSearchParams(location.search);
const B = import.meta.env.BASE_URL;

function fit() {
  const k = Math.min(innerWidth / LW, innerHeight / LH);
  stage.style.transform = `translate(-50%, -50%) scale(${k})`;
  const dpr = Math.min(3, (window.devicePixelRatio || 1) * k);
  cv.width = Math.round(LW * dpr);
  cv.height = Math.round(LH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
addEventListener('resize', fit);
fit();

await loadFlags();
const img = (src: string) =>
  new Promise<HTMLImageElement>((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => no(new Error(src));
    i.src = src;
  });
// ───────── 그림 ─────────
const dirs = new Set<string>();
for (const a of [...HEROES.map((h) => h.anims), ...Object.values(MOBS).map((m) => m.anims)]) for (const d of Object.values(a)) for (const f of d!.frames) dirs.add(f.split(':')[0]);
const sheet = await loadSheets([...dirs]);
const mobImg: Record<string, HTMLImageElement> = {};
for (const k of ['slime', 'goblin', 'wolf', 'golem']) mobImg[k] = await img(`${B}art/mobs/${k}.png`).catch(() => null as never);
const bg = await img(`${B}art/bg.jpg`).catch(() => null);
const portrait: Record<string, string> = {};
const cutin: Art['cutin'] = {};
for (const h of HEROES) {
  portrait[h.id] = `${B}art/portraits/star_${h.id}.png`;
  // 컷인 일러스트가 있으면 그것, 없으면 초상화를 크게
  cutin[h.id] = await img(`${B}art/cutin/${h.id}.png`).catch(async () => {
    const p = await img(portrait[h.id]);
    const c = document.createElement('canvas');
    c.width = p.width * 4;
    c.height = p.height * 4;
    const x = c.getContext('2d')!;
    x.imageSmoothingEnabled = false;
    x.drawImage(p, 0, 0, c.width, c.height);
    return c;
  });
}
const bossPortrait = `${B}art/portraits/boss_golem.png`;
const art: Art = { sheet, mobImg, bg, cutin };

// ───────── 전투 · 화면 ─────────
let b: Battle = makeBattle();
let started = false;
let shown = false;
const bar = $('#bar');
const BUFF = (u: Unit) =>
  [u.shield > 0 && ['🛡', '보호막'], u.guard > 0 && ['✦', '피해 감소'], u.taunt > 0 && ['📯', '도발'], u.regenLeft > 0 && ['❀', '회복'], u.stun > 0 && ['💫', '기절'], u.hero?.id === 'woongs' && u.hp < u.max * 0.5 && ['🔥', '투지']].filter(Boolean) as [string, string][];
function buildBar() {
  bar.innerHTML = b.heroes
    .map(
      (u, i) => `<div class="hc" data-h="${i}"><div class="pt" style="background-image:url(${portrait[u.hero!.id]})"></div>
      <div class="nm">${u.hero!.name}<small>${u.hero!.roleName}</small></div>
      <div class="bars"><div class="hp"><i></i></div><div class="mp"><i></i></div></div>
      <div class="bf"></div>
      <div class="sk">${u.hero!.skills.map((s, k) => `<button data-s="${k}" title="${s.name} · ${s.desc} (마나 ${s.cost} · ${s.cd}초)" style="background:radial-gradient(circle at 50% 40%, ${s.color}66, #221c4a 72%)">${s.icon}<em>${s.cost}</em><b></b></button>`).join('')}<button class="au" aria-pressed="false" title="이 영웅만 자동">A</button></div></div>`,
    )
    .join('');
  bar.querySelectorAll<HTMLElement>('.hc').forEach((c) => {
    const u = b.heroes[+c.dataset.h!];
    c.querySelectorAll<HTMLButtonElement>('button[data-s]').forEach((btn) => (btn.onclick = () => requestSkill(b, u, +btn.dataset.s!)));
    const au = c.querySelector<HTMLButtonElement>('.au')!;
    au.onclick = () => {
      u.autoOn = !u.autoOn;
      au.setAttribute('aria-pressed', String(u.autoOn));
    };
  });
}
let dpsOpen = true;
$('#bDps').onclick = () => {
  dpsOpen = !dpsOpen;
  $('#dps').classList.toggle('open', dpsOpen);
  $('#bDps').textContent = dpsOpen ? 'DPS ◂' : 'DPS ▸';
};
function syncHud() {
  bar.querySelectorAll<HTMLElement>('.hc').forEach((c) => {
    const u = b.heroes[+c.dataset.h!];
    c.classList.toggle('dead', u.dead);
    (c.querySelector('.hp i') as HTMLElement).style.width = `${(u.hp / u.max) * 100}%`;
    (c.querySelector('.mp i') as HTMLElement).style.width = `${u.mana}%`;
    const bf = BUFF(u).map(([i, t]) => `<span title="${t}">${i}</span>`).join('');
    const el = c.querySelector('.bf') as HTMLElement;
    if (el.innerHTML !== bf) el.innerHTML = bf;
    c.querySelectorAll<HTMLButtonElement>('button[data-s]').forEach((btn) => {
      const i = +btn.dataset.s!;
      btn.classList.toggle('ok', canCast(b, u, i));
      const cd = u.scd[i];
      btn.classList.toggle('cd', cd > 0);
      btn.querySelector('b')!.textContent = cd > 0 ? String(Math.ceil(cd)) : '';
    });
  });
  // 상단: 웨이브 · 보스
  const boss = bossOf(b);
  const showBoss = !!boss && b.phase !== 'walk';
  $('#boss').hidden = !showBoss;
  $('#wave').hidden = showBoss;
  if (!showBoss) $('#wave').textContent = b.wave < 0 ? 'WAVE 1' : `WAVE ${Math.min(b.wave + 1 + (b.phase === 'walk' ? 1 : 0), WAVES.length - 1)} / ${WAVES.length - 1}`;
  const left = Math.max(0, COMBAT.limit - b.stats.time);
  if (showBoss) {
    $('#bName').textContent = boss!.name;
    $('#bPct').textContent = `${Math.ceil((boss!.hp / boss!.max) * 100)}%`;
    $('#bHp').style.width = `${(boss!.hp / boss!.max) * 100}%`;
    $('#bHpN').textContent = `${short(boss!.hp)} / ${short(boss!.max)}`;
    $('#bDmg').textContent = short(b.stats.bossDealt);
    $('#bTime').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
  }
  // 보스 예고 한 줄
  const w = $('#warn');
  w.hidden = !b.pat.text;
  if (b.pat.text && w.textContent !== b.pat.text) w.textContent = b.pat.text;
  // DPS 미터
  if (dpsOpen) {
    const sorted = [...b.heroes].sort((a, c) => c.dealt - a.dealt);
    const top = Math.max(1, sorted[0].dealt);
    const t = Math.max(1, b.stats.time);
    $('#dpsL').innerHTML = sorted.map((u) => `<div class="dr"><div class="t"><span>${u.hero!.name}</span><b>${short(u.dealt)}</b></div><div class="g"><i style="width:${(u.dealt / top) * 100}%;background:${u.hero!.color}"></i></div><div class="t"><small>초당 ${short(u.dealt / t)}</small></div></div>`).join('');
  }
}
const bAuto = $('#bAuto');
bAuto.onclick = () => {
  b.auto = !b.auto;
  bAuto.setAttribute('aria-pressed', String(b.auto));
};
const SPEEDS = [1, 1.5, 2];
const bSpeed = $('#bSpeed');
bSpeed.onclick = () => {
  b.speed = SPEEDS[(SPEEDS.indexOf(b.speed) + 1) % SPEEDS.length];
  bSpeed.textContent = `×${b.speed}`;
};
function start() {
  const keepAuto = b.auto || q.get('auto') === '1';
  const keepSpeed = q.get('speed') ? +q.get('speed')! : b.speed;
  b = makeBattle();
  b.auto = keepAuto;
  b.speed = keepSpeed;
  bAuto.setAttribute('aria-pressed', String(b.auto));
  bSpeed.textContent = `×${b.speed}`;
  buildBar();
  $('#title').hidden = true;
  $('#result').hidden = true;
  started = true;
  shown = false;
}
$('#bStart').onclick = () => {
  initAudioEngine();
  start();
};
(document.querySelector('#boss .bp') as HTMLElement).style.backgroundImage = `url(${bossPortrait})`;

function showResult() {
  const win = b.phase === 'win';
  const st = starsOf(b);
  if (win) {
    const save = readSave();
    save.clears++;
    save.best.pilot = Math.max(save.best.pilot ?? 0, st);
    writeSave(save);
  }
  const allUp = b.heroes.every((h) => !h.dead);
  const mvp = [...b.heroes].sort((a, c) => c.dealt - a.dealt)[0];
  const r = $('#result');
  r.innerHTML = win
    ? `<h1>승리!</h1><div class="stars">${[0, 1, 2].map((i) => `<span class="${i < st ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.25}s">★</span>`).join('')}</div>
       <p class="why">클리어 ✓ · 아무도 안 쓰러짐 ${allUp ? '✓' : '✗'} · 120초 안 ${b.stats.time <= 120 ? '✓' : '✗'}<br>시간 ${Math.floor(b.stats.time)}초 · 총 피해 ${short(b.stats.dealt)} · MVP ${mvp.hero!.name} ${short(mvp.dealt)}</p>
       <div class="rw">${REWARDS.map((x) => `<div><span>${x.icon}</span>${x.name}<b>×${x.n.toLocaleString('ko-KR')}</b></div>`).join('')}</div>
       <button id="bAgain">다시 하기</button>`
    : `<h1 class="lose">${b.why === 'time' ? '시간 초과' : '패배…'}</h1><p class="why">${b.wave >= WAVES.length - 1 ? '보스' : `웨이브 ${b.wave + 1}`}에서 멈췄어요 · 스킬을 아끼지 말아 봐요 (AUTO도 있어요)</p><button id="bAgain">다시 하기</button>`;
  r.hidden = false;
  $('#bAgain').onclick = start;
}

let last = performance.now();
// GIF 녹화: ?rec=1 이면 실시간으로 돌지 않고 __tick(초)로 한 칸씩 (프레임이 고르게)
const REC = q.get('rec') === '1';
let recT = 0;
function tick(dt: number, now: number) {
  if (started) {
    step(b, dt);
    for (const s of b.sounds) combatSynth(s, s === 'hit' ? 0.45 : 1);
    if ((b.phase === 'win' || b.phase === 'lose') && !shown) {
      shown = true;
      setTimeout(showResult, b.phase === 'win' ? 1600 : 900);
    }
    syncHud();
  } else b.scroll += 20 * dt;
  render(ctx, art, b, now);
}
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!REC) tick(dt, now / 1000);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
if (q.get('go') === '1') start();
Object.assign(window, { __tick: (dt: number) => tick(dt, (recT += dt)), __b: () => b, __start: start, __ready: true, __alive: () => alive(b.heroes).length });
