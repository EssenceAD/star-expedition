// 전투 화면: HUD(패널·스킬·패널별 Auto·AUTO·배속·DPS·보스·예고) + 결과(별 3개·보상·MVP·DPS 기록·레벨업·합류)
//  흐름: 행동력 → 파티를 필드에 세우고 (처음이면 대사) → 전투 → 승리 기록 → (장 클리어 대사 → 합류 연출) → 결과 → 다시 / 다음 / 반복 / 모험
import { ensureBattleArt } from './assets';
import { CONFIG } from '../config';
import { headHpPref, render, renderBg, type Art } from '../battle/render';
import { bossOf, canCast, has, idleStep, makeBattle, mvpOf, partyDps, relayout, requestSkill, shortNum, starsOf, step, type Battle, type Unit } from '../battle/sim';
import { raidDodge, raidSummary } from '../battle/raid';
import { combatSynth } from '../core/audio/combatSfx';
import { heroOf } from '../data/heroes';
import { JOBS } from '../data/jobs';
import { descSkill } from '../data/skills';
import { SIDE } from '../data/side';
import { CHAPTERS, PROLOGUE, type Line } from '../data/story';
import { TIPS } from '../data/tips';
import { stageCost, useStamina } from '../game/account';
import { buildRun, finishRun, lockOf, milesReady, MODE_NAME, nextMile, triesText, useTry, type Run } from '../game/content';
import { pushNotice } from './notice';
import { buildStage, canRepeat, isBoss, recordClear, repeatBattle, stageName, unlocked, type StageId } from '../game/stage';
import { partyIds, persist, S } from '../game/state';
import { applyTheme, icon, iconText, T } from '../theme/tokens';
import { $, $$, esc, fmt, fullbodyUrl, fxt, go, heroPortrait, modal, playTalk, portraitUrl, register, skillIconUrl, toast, CUR_NAME } from './core';
import { getPref, setPref } from '../core/save';
import { gearCell, runeCell } from './gearui';
import { flag } from '../core/flags';
import { view } from './view';
import { aiEmote, countdown, emote, pvpHudHtml, resetAiEmote, syncPvpHud, vsIntro } from './arena';

const C = CONFIG.story;
/** 승리·패배 엠블럼 (public/art/ui · 리본은 비어 있음 → 글자는 금박 글씨로 얹음) */
const UI_ART = `${import.meta.env.BASE_URL}art/ui/`;
/** 승리·패배 엠블럼 · stars를 주면 엠블럼 위로 별 3개가 하나씩 「쾅」 + 뒤에서 금빛 햇살이 돎 (MOBILE_REF §3-A-5) */
const emb = (text: string, win: boolean, stars?: number) =>
  `<div class="emb${stars !== undefined ? ' starred' : ''}" style="background-image:url(${UI_ART}${win ? 'victory' : 'defeat'}.png)">${stars !== undefined ? `<i class="rays"></i><div class="stars3">${[0, 1, 2].map((i) => `<img class="${i < stars ? 'on' : ''}" style="--i:${i}" src="${UI_ART}icons/star.png" alt="">`).join('')}</div>` : ''}${fxt(text, win ? '' : 'lose')}</div>`;
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
let dpsOpen = getPref('dpsOpen', true);
let dpsTab: 'dealt' | 'healed' | 'taken' = 'dealt';
const DPS_HEAD = { dealt: '피해량', healed: '회복량', taken: '받은 피해' } as const;
let paused = false;
/** 전투 그림(영웅 시트·컷인)을 받는 중 */
let artWait = false;
/** 전투 전 로딩 팁 화면이 떠 있음 (전투 멈춤) */
let loading = false;
const hud = () => $('#hud');

const BUFF = (u: Unit): [string, string][] =>
  ([
    [u.shield > 0, 'shield', '보호막'], [has(u, 'guard'), 'guard', '받는 피해 감소'], [has(u, 'taunt'), 'taunt', '도발'], [has(u, 'regen'), 'regen', '회복'], [has(u, 'atkUp'), 'atkUp', '공격력 증가'],
    [has(u, 'spdUp'), 'spdUp', '공격 속도 증가'], [has(u, 'critUp'), 'critUp', '치명타 증가'], [has(u, 'atkDown'), 'atkDown', '공격력 감소'], [has(u, 'stun'), 'stun', '기절'], [has(u, 'silence'), 'silence', '침묵'], [has(u, 'slow'), 'slow', '둔화'], [has(u, 'burn'), 'burn', '화상'],
  ] as [boolean, string, string][]).filter((x) => x[0]).map(([, k, t]) => [iconText(k), t]);

function buildBar() {
  const bar = $('#bar');
  bar.innerHTML = b!.heroes
    .filter((u) => !u.ai)
    .map((u, i) => {
      const h = u.hero!.def;
      return `<div class="hc" data-h="${i}"><div class="pt" style="background-image:url(${heroPortrait(h.id)})"></div>
      <div class="nm">${h.name}<small>${JOBS[h.job].name} Lv.${u.hero!.lv}</small></div>
      <div class="bars"><div class="hp"><i></i><s></s></div><div class="mp"><i></i></div></div>
      <div class="bf"></div>
      <div class="sk">${h.skills.map((s, k) => `<button data-s="${k}" title="${s.name} · ${descSkill(s)} (마나 ${s.cost} · ${s.cd}초)" style="background-image:url(${skillIconUrl(h.id, k)})"><em>${s.cost}</em><b></b></button>`).join('')}<button class="au" aria-pressed="false" title="이 영웅만 자동"></button></div></div>`;
    })
    .join('');
  $$('.hc', bar).forEach((c) => {
    const u = b!.heroes[+c.dataset.h!];
    $$<HTMLButtonElement>('button[data-s]', c).forEach((btn) => (btn.onclick = () => requestSkill(b!, u, +btn.dataset.s!)));
    const au = $('.au', c);
    au.onclick = () => {
      u.autoOn = !u.autoOn;
      au.setAttribute('aria-pressed', String(u.autoOn));
    };
  });
}

function syncHud() {
  const bb = b!;
  $$('.hc', $('#bar')).forEach((c) => {
    const u = bb.heroes[+c.dataset.h!];
    c.classList.toggle('dead', u.dead);
    $('.hp i', c).style.width = `${(u.hp / u.max) * 100}%`;
    $('.hp s', c).style.width = `${Math.min(100, (u.shield / u.max) * 100)}%`;
    $('.mp i', c).style.width = `${u.mana}%`;
    const bf = BUFF(u).map(([i, t]) => `<span title="${t}">${i}</span>`).join('');
    const el = $('.bf', c);
    if (el.innerHTML !== bf) el.innerHTML = bf;
    $$<HTMLButtonElement>('button[data-s]', c).forEach((btn) => {
      const i = +btn.dataset.s!;
      btn.classList.toggle('ok', canCast(bb, u, i));
      // 마나 부족 (쿨타임 아님): 채도 30% + 파란 자물쇠 점 (PLAYTEST §2)
      btn.classList.toggle('nomana', u.scd[i] <= 0 && u.mana < u.hero!.def.skills[i].cost);
      const cd = u.scd[i];
      btn.classList.toggle('cd', cd > 0);
      // 쿨타임 남은 비율 → 남색 원을 시계방향으로 걷어냄 (BATTLE_HUD §5)
      btn.style.setProperty('--cd', cd > 0 ? String(cd / u.hero!.def.skills[i].cd) : '0');
      btn.querySelector('b')!.textContent = cd > 0 ? String(Math.ceil(cd)) : '';
    });
  });
  const boss = bossOf(bb);
  const showBoss = !!boss && bb.phase !== 'walk';
  $('#boss').hidden = !showBoss;
  $('#wave').hidden = showBoss;
  const waves = bb.setup.waves.length;
  const waveT = bb.wave < 0 ? `WAVE 1 / ${waves}` : `WAVE ${Math.min(bb.wave + 1 + (bb.phase === 'walk' ? 1 : 0), waves)} / ${waves}`;
  // 웨이브가 바뀌면 판이 위에서 내려옴
  if (!showBoss && $('#wave').textContent !== waveT) {
    const el = $('#wave');
    el.textContent = waveT;
    el.classList.remove('drop');
    void el.offsetWidth;
    el.classList.add('drop');
  }
  const left = Math.max(0, bb.setup.limit - bb.stats.time);
  if (showBoss) {
    $('#bName').textContent = boss!.name;
    $('#bPct').textContent = `${Math.ceil((boss!.hp / boss!.max) * 100)}%`;
    $('#bHp').style.width = `${(boss!.hp / boss!.max) * 100}%`;
    $('#bHpN').textContent = `${shortNum(boss!.hp)} / ${shortNum(boss!.max)}`;
    $('#bDmg').textContent = shortNum(bb.stats.bossDealt);
    $('#bTime').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
  }
  // 보스 전장은 보스가 나올 때 생김 → 그때 HUD를 바꿈
  if (!!bb.raid !== hud().classList.contains('raid')) (buildRaid(), dpsLabel());
  syncRaid(bb);
  const w = $('#warn');
  w.hidden = !bb.pat.text || bb.phase === 'win' || bb.phase === 'lose';
  const wt = `${iconText('warn')} ${bb.pat.text}`;
  if (bb.pat.text && w.textContent !== wt) w.textContent = wt;
  if (run?.mode === 'arena') syncPvpHud(bb, $('#pvpHud'));
  // 남은 시간 (WAVE 판 옆 · 30초 남으면 빨강 · 보스 HUD가 뜨면 그쪽에 있음)
  const ck = $('#clock');
  ck.hidden = showBoss || !!bb.raid;
  const ct = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
  if (ck.textContent !== ct) ck.textContent = ct;
  ck.classList.toggle('low', left <= CONFIG.ui.clockLowSec);
  if (dpsOpen) {
    const sorted = [...bb.heroes].sort((a, c) => c[dpsTab] - a[dpsTab]).slice(0, bb.raid ? CONFIG.raidArena.rankShow : undefined);
    const top = Math.max(1, sorted[0][dpsTab]);
    const t = Math.max(1, bb.stats.time);
    // 한 줄 = 초상화 · 이름 · 직업색 막대 + 초당 · 값 (BATTLE_HUD §3)
    const rows = sorted.map((u) => `<div class="dr"><i class="pt" style="background-image:url(${heroPortrait(u.hero!.def.id)})"></i><span class="nm">${u.name}</span><b>${shortNum(u[dpsTab])}</b><div class="g"><i style="width:${(u[dpsTab] / top) * 100}%;background:${T.battle.jobColor[u.hero!.def.job]}"></i><small>${shortNum(u[dpsTab] / t)}/초</small></div></div>`).join('');
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
  $('#rParts').innerHTML = r.parts.map((p, i) => `<button data-p="${i}" aria-pressed="false"><span>${esc(p.name)}</span><div class="bh"><i></i></div></button>`).join('');
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
function setPaused(on: boolean) {
  paused = on;
  $('#bPause').setAttribute('aria-pressed', String(on));
  $('#pausedTag').hidden = !on;
}
function dpsLabel() {
  $('#dps').classList.toggle('open', dpsOpen);
  $('#bDps').textContent = iconText(dpsOpen ? 'fold' : 'open');
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
    $('i', btn).style.width = `${(p.hp / p.max) * 100}%`;
  });
  $('#rGg').style.width = `${r.downT > 0 ? 100 : (r.groggy / r.gMax) * 100}%`;
  $('#rDown').textContent = r.downT > 0 ? `다운 ${Math.ceil(r.downT)}초` : '';
  $('#bDodge').classList.toggle('hot', r.warnLane != null);
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
  $('#stg').textContent = b.setup.title;
  // 스테이지 이름은 시작할 때 다시 보여 줌 (보스 전장에선 2초 뒤 사라짐)
  $('#stg').classList.remove('show');
  void $('#stg').offsetWidth;
  $('#stg').classList.add('show');
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
  if (boss?.portrait) $('#boss .bp').style.backgroundImage = `url(${portraitUrl(boss.portrait)})`;
}

/** 콘텐츠 결과 (토벌·던전·탑·요일·레이드·월드 보스·결투장·외전) */
function showRunResult() {
  const bb = b!;
  const r = run!;
  let win = bb.phase === 'win';
  // 최후의 리그: 3판 중 2판 — 아직 안 끝났으면 다음 판
  if (r.mode === 'arena' && r.arg === 'last') {
    series[win ? 'wins' : 'losses']++;
    if (series.wins < 2 && series.losses < 2) {
      const leg = (r.leg ?? 0) + 1;
      $('#result').innerHTML = `${emb(win ? '이번 판 승리' : '이번 판 패배', win)}<p class="why">최후의 리그 ${series.wins}승 ${series.losses}패 · 다음은 파티 ${leg + 1}</p><div class="row"><button class="btn hi" data-a="leg">다음 판 ${icon('next')}</button></div>`;
      $('#result').hidden = false;
      $('#result [data-a="leg"]').onclick = () => {
        run = { ...r, leg };
        $('#result').hidden = true;
        b = null;
        setup();
        intro = true;
        countdown(() => (intro = false));
      };
      return;
    }
    win = series.wins >= 2;
  }
  const scoreRun = r.mode === 'world' || r.mode === 'graid';
  const o = finishRun(r, { win: win && !scoreRun, dealt: scoreRun ? bb.stats.bossDealt : bb.stats.dealt, heroes: bb.heroes.filter((u) => !u.ai).map((u) => u.hero!.def.id) });
  persist();
  const mvp = mvpOf(bb);
  const head = scoreRun ? '결과' : win ? '승리!' : bb.why === 'time' ? '시간 초과' : '패배…';
  const nextFloor = r.mode === 'tower' && win ? { ...r, arg: +r.arg + 1 } : r.mode === 'side' && win && (r.sub ?? 0) < CONFIG.content.side.acts ? { ...r, sub: (r.sub ?? 1) + 1 } : null;
  const left = triesText(r);
  const rs = raidSummary(bb);
  // 결과 표 (남색 판 안 항목: 값 2열 · PLAYTEST §3·§4) — 부위는 아이콘 + ✓/✕
  const rows: [string, string][] = [['콘텐츠', MODE_NAME[r.mode]], ['시간', `${Math.floor(bb.stats.time)}초`], ['총 피해', shortNum(bb.stats.dealt)], ['초당', shortNum(partyDps(bb))], ['MVP', `<b class="hn">${esc(mvp.name)}</b>`]];
  if (rs) {
    rows.push(['페이즈', `${rs.phase}페이즈까지`], ['회피', `직접 ${rs.dodges.manual} · 자동 ${rs.dodges.auto} · 맞음 ${rs.dodges.hit}`]);
    for (const p of rs.parts) rows.push([`${icon('target')} ${esc(p.name)}`, p.broken ? `${ck(true)} ${esc(p.top)}` : ck(false)]);
  }
  const table = `<div class="rtable">${rows.map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')}${o.lines.map((l) => `<em>${esc(l)}</em>`).join('')}</div>`;
  $('#result').innerHTML = `${emb(head, win || scoreRun)}<div class="rcol">
    ${table}
    <div class="rw">${o.items.map(([k, v]) => `<div class="rwc ${k}"><span>${icon(k)}</span>${CUR_NAME[k] ?? k}<b>+${fmt(v)}</b></div>`).join('')}${o.gear.map((g) => gearCell(g)).join('')}${o.runes.map((x) => runeCell(x)).join('')}</div>
    <div class="row"><button class="btn" data-a="lobby">로비</button><button class="btn" data-a="portal">${icon('content')} 콘텐츠</button><button class="btn" data-a="again" ${lockOf(r) ? 'disabled' : ''}>다시${left ? ` (${left})` : ''}</button>${nextFloor ? `<button class="btn hi" data-a="nextrun">${r.mode === 'tower' ? `${+r.arg + 1}층` : '다음 막'} ${icon('next')}</button>` : ''}</div></div>`;
  $('#result').hidden = false;
  $$('#result [data-a]').forEach(
    (btn) =>
      (btn.onclick = () => {
        const a = btn.dataset.a;
        if (a === 'lobby') go('lobby', {}, false);
        else if (a === 'portal') (r.mode === 'graid' ? go('guild', { tab: 'raid' }, false) : go('portal', { tab: r.mode }, false));
        else if (a === 'again') beginRun(r);
        else if (a === 'nextrun' && nextFloor) beginRun(nextFloor);
      }),
  );
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

/** 결과 조건 표시: 됨 = 금색 체크 · 안 됨 = 흐린 X */
const ck = (ok: boolean) => `<i class="ck${ok ? ' on' : ''}">${icon(ok ? 'check' : 'cross')}</i>`;
function showResult() {
  // 외전 마지막 막을 이기면 끝 대사 → 결과
  const sideEnd = run?.mode === 'side' && b!.phase === 'win' && (run.sub ?? 1) === CONFIG.content.side.acts ? SIDE[String(run.arg)]?.clear : undefined;
  if (sideEnd) return playTalk(sideEnd, showRunResult);
  if (run) return showRunResult();
  const bb = b!;
  const win = bb.phase === 'win';
  const r = $('#result');
  const mvp = mvpOf(bb);
  if (!win) {
    r.innerHTML = `${emb(bb.why === 'time' ? '시간 초과' : '패배…', false)}<p class="why">${bb.wave >= bb.setup.waves.length - 1 && bossOf(bb) ? '보스' : `웨이브 ${bb.wave + 1}`}에서 멈췄어요 · 영웅 레벨을 올리거나 편성을 바꿔 봐요<br>추천: 반복 전투·방치 보상으로 경험치 모으기</p>
      <div class="row"><button class="btn" data-a="form">${icon('formation')} 편성</button><button class="btn hi" data-a="again">다시 하기 ${icon('stamina')}${stageCost(st.d)}</button>${firstRun ? '' : `<button class="btn" data-a="adv">${icon('adventure')} 모험</button>`}</div>`;
    r.hidden = false;
    wire();
    return;
  }
  const stars = starsOf(bb);
  const dps = partyDps(bb);
  const before = new Set(milesReady().map((m) => m.id));
  const res = recordClear(st, { stars, time: bb.stats.time, dps, mvp: mvp.hero!.def.id });
  persist();
  // 지도로 돌아가면 뜰 알림 카드 (S4): 첫 클리어 · 퍼펙트 · 이정표 달성 → 다음 이정표 · 장 개방
  if (!run) {
    const chStars = Array.from({ length: C.stages }, (_, i) => S.stages[`${st.c}-${i + 1}-${st.d}`]?.stars ?? 0).reduce((a, b) => a + b, 0);
    if (res.first) pushNotice({ head: `스토리 · ${CHAPTERS[st.c - 1].name}`, text: `${stageName(st)} 클리어`, ic: 'adventure' });
    if (res.firstThree) pushNotice({ head: '퍼펙트 클리어', text: `${st.c}장 별 ${chStars}/${C.stages * 3}`, ic: 'star' });
    const done = milesReady().filter((m) => !before.has(m.id));
    for (const m of done) pushNotice({ head: '이정표 달성', text: m.name, ic: 'mission' });
    const nm = nextMile();
    if (done.length && nm && !nm.done(S)) pushNotice({ head: '새 이정표가 열렸어요', text: nm.name, ic: 'mission' });
    if (res.first && isBoss(st) && st.d === 0 && st.c < C.chapters) pushNotice({ head: CHAPTERS[st.c].name, text: `${st.c + 1}장 개방`, kind: 'chapter' });
  }
  const allUp = bb.heroes.every((h) => !h.dead);
  const items: [string, string, number][] = [['gold', CUR_NAME.gold, res.got.gold], ['exp', '영웅 경험치', res.got.exp]];
  if (res.got.stardust) items.push(['stardust', CUR_NAME.stardust, res.got.stardust]);
  if (res.got.enh) items.push(['enh', CUR_NAME.enh, res.got.enh]);
  const next: StageId = st.s < C.stages ? { ...st, s: st.s + 1 } : { c: st.c + 1, s: 1, d: st.d };
  const hasNext = st.c <= C.chapters && next.c <= C.chapters && unlocked(next);
  const show = () => {
    r.innerHTML = `${emb('승리!', true, stars)}<div class="rcol"><p class="why band">클리어 ${ck(true)} · 아무도 안 쓰러짐 ${ck(allUp)} · ${bb.setup.starTime}초 안 ${ck(bb.stats.time <= bb.setup.starTime)}<br>
      시간 ${Math.floor(bb.stats.time)}초 · 총 피해 ${shortNum(bb.stats.dealt)} · 초당 ${shortNum(dps)}${res.newBest ? ' <b class="gold">최고 기록!</b>' : ''} · MVP <b class="hn">${mvp.name}</b> ${shortNum(mvp.dealt)}
      ${res.got.chest ? `<br>${icon('chest')} 따뜻한밤이 숨은 상자를 찾았어요 (금화 더)` : ''}${res.got.ups.length ? `<br><span class="emb lv inl" style="background-image:url(${UI_ART}levelup.png)">${fxt('레벨 업!')}</span> ${res.got.ups.map((id) => heroOf(id).name).join(' · ')}` : ''}${res.joined ? `<br><b class="gold">${heroOf(res.joined).name} 합류!</b>` : ''}</p>
      <div class="rw">${items.map(([k, n, v]) => `<div class="rwc ${k}"><span>${icon(k)}</span>${n}<b>+${fmt(v)}</b></div>`).join('')}${res.got.gear.map((g) => gearCell(g)).join('')}${res.got.runes.map((r) => runeCell(r)).join('')}</div>
      ${firstRun ? `<div class="row"><button class="btn hi big" data-a="lobby">원정대 여관으로 ${icon('next')}</button></div>` : `<div class="row"><button class="btn" data-a="lobby">로비</button><button class="btn" data-a="adv">${icon('adventure')} 모험</button><button class="btn" data-a="again">다시 ${icon('stamina')}${stageCost(st.d)}</button>${canRepeat(st) ? `<button class="btn" data-a="repeat">${icon('repeat')} 반복 ×${REPEAT_N}</button>` : ''}${hasNext ? `<button class="btn hi" data-a="next">다음 ${icon('next')}</button>` : ''}</div>`}</div>`;
    r.hidden = false;
    // 별이 박힐 때마다 「쾅」
    for (let i = 0; i < stars; i++) setTimeout(() => combatSynth('block', 0.8 + i * 0.2), (CONFIG.ui.winStars.delay + i * CONFIG.ui.winStars.gap) * 1000 + 250);
    wire(next);
  };
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
const REPEAT_N = 10;
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
function wire(next?: StageId) {
  $$('#result [data-a]').forEach((btn) => {
    btn.onclick = () => {
      const a = btn.dataset.a;
      if (a === 'again') begin(st);
      else if (a === 'next' && next) begin(next);
      else if (a === 'adv') go('adventure', { c: st.c, d: st.d, s: st.s }, false);
      else if (a === 'lobby') go('lobby', {}, false);
      else if (a === 'form') go('prep', { stage: st }, false);
      else if (a === 'repeat') {
        const h = repeatBattle(st, REPEAT_N);
        if (!h) return toast('행동력이 모자라요');
        persist();
        toast(repeatText(h));
      }
    };
  });
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
  const talk = () => {
    if (!lines.length) return;
    talking = true;
    playTalk(lines, () => (talking = false));
  };
  // 프롤로그 첫 전투 말고는 로딩 화면(전신 그림 + 한 줄 팁) 뒤에 대사 · 전투 (RECOVER_1018 S3)
  if (firstRun) talk();
  else loadTip(s, talk);
}
/** 전투 전 로딩 화면: 편성 영웅 하나 전신 + 장·스테이지 이름 + 한 줄 팁 · loadTipSec 동안(누르면 넘김) 전투는 멈춤 */
function loadTip(s: StageId, done: () => void) {
  const ids = partyIds();
  const id = ids[Math.floor(Math.random() * ids.length)] ?? 'woongs';
  const el = document.createElement('div');
  el.className = 'bload';
  el.innerHTML = `<div class="bl-fb" style="background-image:url(${fullbodyUrl(id)})"></div><div class="bl-tx"><small>${s.c}장 · ${esc(CHAPTERS[s.c - 1].name)}</small><b>${stageName(s)}</b><p><em>TIP</em>${esc(TIPS[Math.floor(Math.random() * TIPS.length)])}</p><div class="ld-bar"><i></i></div></div>`;
  $('#stage').append(el);
  loading = true;
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    loading = false;
    el.remove();
    done();
  };
  el.onclick = end;
  setTimeout(end, CONFIG.ui.loadTipSec * 1000);
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
    $('#bPause').onclick = () => setPaused(!paused);
    $('#bDps').onclick = () => {
      dpsOpen = !dpsOpen;
      setPref('dpsOpen', dpsOpen);
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
    // 포기: 멈추고 확인 창 (양피지 패널)
    $('#bQuit').onclick = () => {
      if (!b || (b.phase !== 'fight' && b.phase !== 'walk')) return;
      const was = paused;
      setPaused(true);
      modal(`${icon('warn')} 전투를 포기할까요?`, '<p class="dim">이 전투는 패배로 끝나요.</p>', [
        ['계속 싸우기', () => setPaused(was)],
        ['포기하기', () => {
          setPaused(false);
          if (b && (b.phase === 'fight' || b.phase === 'walk')) ((b.phase = 'lose'), (b.why = 'wipe'));
        }, true],
      ]);
    };
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
    loading = false;
    document.querySelector('#stage > .bload')?.remove();
    $('#cv').onpointerdown = null;
    $('#result').hidden = true;
    b = null;
    view.onResize = view.onResize.filter((f) => f !== onResize);
  },
  tick(dt) {
    const ctx = view.ctx;
    if (!b) return void renderIdle(ctx, view.art, dt);
    if (talking || intro) {
      idleStep(b, dt);
      return render(ctx, view.art, b, performance.now() / 1000);
    }
    if (paused || artWait || loading) return void render(ctx, view.art, b, performance.now() / 1000);
    step(b, dt);
    if (run?.mode === 'arena') aiEmote(b, dt);
    for (const s of b.sounds) combatSynth(s, s === 'hit' ? 0.45 : 1);
    if ((b.phase === 'win' || b.phase === 'lose') && !shown) {
      shown = true;
      setTimeout(showResult, (b.phase === 'win' ? CONFIG.ui.resultDelayWin : CONFIG.ui.resultDelayLose) * 1000);
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
export const battleArtWait = () => artWait || intro || loading;
