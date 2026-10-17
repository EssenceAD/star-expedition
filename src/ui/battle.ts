// 전투 화면: HUD(패널·스킬·패널별 Auto·AUTO·배속·DPS·보스·예고) + 결과(별 3개·보상·MVP·DPS 기록·레벨업·합류)
//  흐름: 행동력 → 파티를 필드에 세우고 (처음이면 대사) → 전투 → 승리 기록 → (장 클리어 대사 → 합류 연출) → 결과 → 다시 / 다음 / 반복 / 모험
import { CONFIG } from '../config';
import { render, renderBg, type Art } from '../battle/render';
import { bossOf, canCast, has, idleStep, makeBattle, mvpOf, partyDps, relayout, requestSkill, shortNum, starsOf, step, type Battle, type Unit } from '../battle/sim';
import { raidDodge, raidSummary } from '../battle/raid';
import { combatSynth } from '../core/audio/combatSfx';
import { heroOf } from '../data/heroes';
import { JOBS } from '../data/jobs';
import { descSkill } from '../data/skills';
import { SIDE } from '../data/side';
import { CHAPTERS, PROLOGUE, type Line } from '../data/story';
import { stageCost, useStamina } from '../game/account';
import { buildRun, finishRun, lockOf, MODE_NAME, triesText, useTry, type Run } from '../game/content';
import { buildStage, canRepeat, isBoss, recordClear, repeatBattle, unlocked, type StageId } from '../game/stage';
import { persist, S } from '../game/state';
import { applyTheme, elemColor, icon, iconText } from '../theme/tokens';
import { $, $$, esc, fmt, fullbodyUrl, fxt, go, heroPortrait, modal, playTalk, portraitUrl, register, toast, CUR_NAME } from './core';
import { getPref, setPref } from '../core/save';
import { gearCell, runeCell } from './gearui';
import { flag } from '../core/flags';
import { view } from './view';

const C = CONFIG.story;
/** 승리·패배 엠블럼 (public/art/ui · 리본은 비어 있음 → 글자는 금박 글씨로 얹음) */
const UI_ART = `${import.meta.env.BASE_URL}art/ui/`;
const emb = (text: string, win: boolean) => `<div class="emb" style="background-image:url(${UI_ART}${win ? 'victory' : 'defeat'}.png)">${fxt(text, win ? '' : 'lose')}</div>`;
let b: Battle | null = null;
let st: StageId = { c: 1, s: 1, d: 0 };
/** 콘텐츠 전투 (없으면 스토리) */
let run: Run | null = null;
/** 최후의 리그 3판 기록 */
let series = { wins: 0, losses: 0 };
let shown = false;
/** 전투 전 대사 중 (파티가 필드에 선 채로 · 진행 멈춤) */
let talking = false;
/** 첫 진입 (프롤로그 → 1-1 → 로비) */
let firstRun = false;
let dpsOpen = true;
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
      <div class="sk">${h.skills.map((s, k) => `<button data-s="${k}" title="${s.name} · ${descSkill(s)} (마나 ${s.cost} · ${s.cd}초)" style="background:radial-gradient(circle at 50% 40%, color-mix(in srgb, ${elemColor(s.elem)} 40%, transparent), var(--c-btn) 72%)">${icon(s.icon)}<em>${s.cost}</em><b></b></button>`).join('')}<button class="au" aria-pressed="false" title="이 영웅만 자동">A</button></div></div>`;
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
      const cd = u.scd[i];
      btn.classList.toggle('cd', cd > 0);
      btn.querySelector('b')!.textContent = cd > 0 ? String(Math.ceil(cd)) : '';
    });
  });
  const boss = bossOf(bb);
  const showBoss = !!boss && bb.phase !== 'walk';
  $('#boss').hidden = !showBoss;
  $('#wave').hidden = showBoss;
  const waves = bb.setup.waves.length;
  if (!showBoss) $('#wave').textContent = bb.wave < 0 ? `WAVE 1 / ${waves}` : `WAVE ${Math.min(bb.wave + 1 + (bb.phase === 'walk' ? 1 : 0), waves)} / ${waves}`;
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
  if (dpsOpen) {
    const sorted = [...bb.heroes].sort((a, c) => c.dealt - a.dealt).slice(0, bb.raid ? CONFIG.raidArena.rankShow : undefined);
    const top = Math.max(1, sorted[0].dealt);
    const t = Math.max(1, bb.stats.time);
    $('#dpsL').innerHTML = sorted.map((u) => `<div class="dr"><div class="t"><span>${u.name}</span><b>${shortNum(u.dealt)}</b></div><div class="g"><i style="width:${(u.dealt / top) * 100}%;background:${elemColor(u.hero!.def.elem)}"></i></div><div class="t"><small>초당 ${shortNum(u.dealt / t)}</small></div></div>`).join('');
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
function dpsLabel() {
  $('#dps').classList.toggle('open', dpsOpen);
  $('#bDps').innerHTML = `${b?.raid ? '피해 순위' : 'DPS'} ${icon(dpsOpen ? 'fold' : 'open')}`;
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
  const keepAuto = b?.auto ?? getPref('auto', false);
  const keepSpeed = b?.speed ?? 1;
  b = makeBattle(run ? buildRun(run) : buildStage(st), { w: view.w });
  b.auto = keepAuto;
  b.speed = keepSpeed;
  b.cutIns = flag('cutIn') && !getPref('cutOff', false) ? 'big' : 'off';
  $('#bAuto').setAttribute('aria-pressed', String(b.auto));
  $('#bAuto i').textContent = iconText('auto');
  $('#bSpeed').textContent = `×${b.speed}`;
  $('#stg').textContent = b.setup.title;
  buildBar();
  buildRaid();
  dpsLabel();
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
  const raidLines = rs ? `<br>${rs.phase}페이즈까지 · 회피 직접 ${rs.dodges.manual} · 자동 ${rs.dodges.auto} · 맞음 ${rs.dodges.hit}<br>부위 파괴 1등: ${rs.parts.map((p) => `${esc(p.name)} ${p.broken ? esc(p.top) : '못 부숨'}`).join(' · ')}` : '';
  $('#result').innerHTML = `${emb(head, win || scoreRun)}
    <p class="why">${MODE_NAME[r.mode]} · 시간 ${Math.floor(bb.stats.time)}초 · 총 피해 ${shortNum(bb.stats.dealt)} · 초당 ${shortNum(partyDps(bb))} · MVP ${mvp.name}${raidLines}${o.lines.map((l) => `<br>${esc(l)}`).join('')}</p>
    <div class="rw">${o.items.map(([k, v]) => `<div><span>${icon(k)}</span>${CUR_NAME[k] ?? k}<b>+${fmt(v)}</b></div>`).join('')}${o.gear.map((g) => gearCell(g)).join('')}${o.runes.map((x) => runeCell(x)).join('')}</div>
    <div class="row"><button class="btn" data-a="lobby">로비</button><button class="btn" data-a="portal">${icon('content')} 콘텐츠</button><button class="btn" data-a="again" ${lockOf(r) ? 'disabled' : ''}>다시${left ? ` (${left})` : ''}</button>${nextFloor ? `<button class="btn hi" data-a="nextrun">${r.mode === 'tower' ? `${+r.arg + 1}층` : '다음 막'} ${icon('next')}</button>` : ''}</div>`;
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
  const res = recordClear(st, { stars, time: bb.stats.time, dps, mvp: mvp.hero!.def.id });
  persist();
  const allUp = bb.heroes.every((h) => !h.dead);
  const items: [string, string, number][] = [['gold', CUR_NAME.gold, res.got.gold], ['exp', '영웅 경험치', res.got.exp]];
  if (res.got.stardust) items.push(['stardust', CUR_NAME.stardust, res.got.stardust]);
  if (res.got.enh) items.push(['enh', CUR_NAME.enh, res.got.enh]);
  const next: StageId = st.s < C.stages ? { ...st, s: st.s + 1 } : { c: st.c + 1, s: 1, d: st.d };
  const hasNext = st.c <= C.chapters && next.c <= C.chapters && unlocked(next);
  const show = () => {
    r.innerHTML = `${emb('승리!', true)}<div class="rstars">${[0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}" style="animation-delay:${0.2 + i * 0.25}s">${iconText('star')}</span>`).join('')}</div>
      <p class="why">클리어 ${iconText('check')} · 아무도 안 쓰러짐 ${allUp ? iconText('check') : iconText('cross')} · ${bb.setup.starTime}초 안 ${bb.stats.time <= bb.setup.starTime ? iconText('check') : iconText('cross')}<br>
      시간 ${Math.floor(bb.stats.time)}초 · 총 피해 ${shortNum(bb.stats.dealt)} · 초당 ${shortNum(dps)}${res.newBest ? ' <b class="gold">최고 기록!</b>' : ''} · MVP ${mvp.name} ${shortNum(mvp.dealt)}
      ${res.got.chest ? `<br>${icon('chest')} 따뜻한밤이 숨은 상자를 찾았어요 (금화 더)` : ''}${res.got.ups.length ? `<br><span class="emb lv inl" style="background-image:url(${UI_ART}levelup.png)">${fxt('레벨 업!')}</span> ${res.got.ups.map((id) => heroOf(id).name).join(' · ')}` : ''}${res.joined ? `<br><b class="gold">${heroOf(res.joined).name} 합류!</b>` : ''}</p>
      <div class="rw">${items.map(([k, n, v]) => `<div><span>${icon(k)}</span>${n}<b>+${fmt(v)}</b></div>`).join('')}${res.got.gear.map((g) => gearCell(g)).join('')}${res.got.runes.map((r) => runeCell(r)).join('')}</div>
      ${firstRun ? `<div class="row"><button class="btn hi big" data-a="lobby">원정대 여관으로 ${icon('next')}</button></div>` : `<div class="row"><button class="btn" data-a="lobby">로비</button><button class="btn" data-a="adv">${icon('adventure')} 모험</button><button class="btn" data-a="again">다시 ${icon('stamina')}${stageCost(st.d)}</button>${canRepeat(st) ? `<button class="btn" data-a="repeat">${icon('repeat')} 반복 ×${REPEAT_N}</button>` : ''}${hasNext ? `<button class="btn hi" data-a="next">다음 ${icon('next')}</button>` : ''}</div>`}`;
    r.hidden = false;
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
  if (!lines.length) return;
  talking = true;
  playTalk(lines, () => (talking = false));
}

register('battle', {
  canvas: true,
  enter(_root, p) {
    hud().hidden = false;
    applyTheme(p.run && CONFIG.ui.darkModes.includes((p.run as Run).mode) ? 'dark' : 'light');
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
      $('#bSpeed').textContent = `×${b.speed}`;
    };
    $('#bDps').onclick = () => {
      dpsOpen = !dpsOpen;
      dpsLabel();
    };
    $('#cv').onpointerdown = () => b?.raid && b.phase === 'fight' && raidDodge(b);
    $('#bQuit').onclick = () => {
      if (b && (b.phase === 'fight' || b.phase === 'walk')) {
        b.phase = 'lose';
        b.why = 'wipe';
      }
    };
    view.onResize.push(onResize);
    firstRun = !!p.first;
    talking = false;
    if (p.run) beginRun(p.run as Run);
    else begin(p.stage as StageId);
  },
  leave() {
    applyTheme('light');
    hud().hidden = true;
    hud().classList.remove('raid');
    $('#cv').onpointerdown = null;
    $('#result').hidden = true;
    b = null;
    view.onResize = view.onResize.filter((f) => f !== onResize);
  },
  tick(dt) {
    const ctx = view.ctx;
    if (!b) return void renderIdle(ctx, view.art, dt);
    if (talking) {
      idleStep(b, dt);
      return render(ctx, view.art, b, performance.now() / 1000);
    }
    step(b, dt);
    for (const s of b.sounds) combatSynth(s, s === 'hit' ? 0.45 : 1);
    if ((b.phase === 'win' || b.phase === 'lose') && !shown) {
      shown = true;
      setTimeout(showResult, (b.phase === 'win' ? CONFIG.ui.resultDelayWin : CONFIG.ui.resultDelayLose) * 1000);
    }
    syncHud();
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
