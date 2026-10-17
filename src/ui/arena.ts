// 결투장 연출 (docs/MOBILE_REF_1017.md §3-B): VS 입장(양쪽 카드 4장이 미끄러져 들어옴 · 가운데 금빛 VS · 누르면 건너뜀) → 3·2·1
//  팀 전체 체력 줄 · 😊 감정 표현(빠른 채팅과 같은 묶음 · 상대 AI도 가끔)
import { CONFIG } from '../config';
import type { HeroSpec } from '../battle/setup';
import type { Battle, Unit } from '../battle/sim';
import { combatSynth } from '../core/audio/combatSfx';
import { arenaOpps, tierOf, type Run } from '../game/content';
import { S } from '../game/state';
import { iconText, T } from '../theme/tokens';
import { kitBar, kitSocket, setBar } from './kit';
import { $, esc, fxt, heroPortrait } from './core';

const A = CONFIG.ui.arenaShow;
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
/** 이름판: 이름 · 리그 · 점수 · 승률 (상대는 AI라 이름으로 정해지는 값) */
export function plates(r: Run) {
  const opp = arenaOpps(S)[r.sub ?? 0];
  const games = S.arena.win + S.arena.lose;
  const h = hash(opp.name);
  return {
    me: { name: S.acc.name, score: S.arena.score, tier: tierOf(S.arena.score), rate: games ? Math.round((S.arena.win / games) * 100) : null, rank: null as number | null },
    op: { name: opp.name, score: opp.score, tier: tierOf(opp.score), rate: A.aiRate[0] + (h % (A.aiRate[1] - A.aiRate[0])), rank: 1 + (h % A.aiRankMax) },
  };
}
type Plate = ReturnType<typeof plates>['me'];
const plateHtml = (p: Plate) => `<div class="plate"><b>${esc(p.name)}</b><small>${p.tier} 리그${p.rank ? ` ${p.rank}위` : ''} · ${p.score}점 · 승률 ${p.rate === null ? '-' : `${p.rate}%`}</small></div>`;
const card = (h: HeroSpec, i: number) => `<div class="vc" style="--i:${i}"><i class="pt" style="background-image:url(${heroPortrait(h.def.id)})"></i><span class="st">${iconText('star').repeat(h.star ?? 1)}</span><b>Lv.${h.lv}</b><em>${esc(h.def.name)}</em></div>`;

/** 상대 파티 (전투 전엔 아직 안 나와 있으니 첫 웨이브 설정에서) */
const foes = (b: Battle): HeroSpec[] => (b.setup.waves[0] ?? []).map((m) => m.hero).filter((h): h is HeroSpec => !!h);
/** VS 입장 (vsSec초 · 누르면 바로 넘어감) */
export function vsIntro(b: Battle, r: Run, done: () => void) {
  const P = plates(r);
  const el = document.createElement('div');
  el.className = 'vs';
  el.innerHTML = `<div class="side me">${plateHtml(P.me)}<div class="vcards">${b.heroes.map((u, i) => card(u.hero!, i)).join('')}</div></div>
    <div class="vsmark">${fxt('VS')}</div>
    <div class="side op">${plateHtml(P.op)}<div class="vcards">${foes(b).map((h, i) => card(h, i)).join('')}</div></div>`;
  $('#stage').append(el);
  setTimeout(() => combatSynth('crit', 0.7), A.vsHitSec * 1000);
  let left = false;
  const end = () => {
    if (left) return;
    left = true;
    el.classList.add('out');
    setTimeout(() => (el.remove(), done()), 250);
  };
  el.onclick = end;
  setTimeout(end, A.vsSec * 1000);
}
/** 3 · 2 · 1 (가운데 큰 금색 숫자 · Cinzel · 커졌다 줄어듦) */
export function countdown(done: () => void) {
  const el = document.createElement('div');
  el.className = 'cdown';
  $('#stage').append(el);
  let n = A.count;
  const next = () => {
    if (n <= 0) return void (el.remove(), done());
    el.innerHTML = `<b>${n}</b>`;
    combatSynth('block', 0.6 + (A.count - n) * 0.2);
    n--;
    setTimeout(next, A.countSec * 1000);
  };
  next();
}

/** 팀 전체 체력 줄 (맨 위: 왼쪽 우리 편 초록 · 오른쪽 상대 빨강 · 양쪽 대장 초상화 · 가운데 남은 시간 · 아래 점수) */
export function pvpHudHtml(b: Battle, r: Run) {
  const P = plates(r);
  const capL = b.heroes[0]?.hero?.def.id;
  const capR = foes(b)[0]?.def.id;
  // 키트 부품만 (UI_KIT_1018): 초상 받침 socket 30 · bar_thick · pill 시계
  return `<div class="tm me">${capL ? kitSocket(heroPortrait(capL), 30, null, 'cap') : ''}<div class="tb">${kitBar(220, 14, 1, T.kit2.hp, 'bar_thick', '', '<b class="tx"></b>')}<span class="tx nm">${esc(P.me.name)} · ${P.me.score}점</span></div></div>
    <div class="tclock"><b class="tx"></b></div>
    <div class="tm op">${capR ? kitSocket(heroPortrait(capR), 30, null, 'cap') : ''}<div class="tb">${kitBar(220, 14, 1, T.kit2.mobHp, 'bar_thick', '', '<b class="tx"></b>')}<span class="tx nm">${esc(P.op.name)} · ${P.op.score}점</span></div></div>`;
}
const pct = (us: Unit[]) => {
  const max = us.reduce((a, u) => a + u.max, 0);
  return max ? (us.reduce((a, u) => a + Math.max(0, u.hp), 0) / max) * 100 : 0;
};
export function syncPvpHud(b: Battle, root: HTMLElement) {
  const mine = pct(b.heroes);
  // 상대가 아직 안 들어왔으면 가득
  const theirs = b.mobs.length ? pct(b.mobs) : 100;
  const set = (sel: string, v: number) => {
    setBar(root.querySelector(`${sel} .kbar`), v / 100);
    const e = root.querySelector<HTMLElement>(`${sel} .kbar b`);
    if (e) e.textContent = `${Math.ceil(v)}%`;
  };
  set('.me', mine);
  set('.op', theirs);
  const left = Math.max(0, b.setup.limit - b.stats.time);
  const tc = root.querySelector<HTMLElement>('.tclock b');
  if (tc) tc.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
}

/** 감정 표현: 내 대장(살아 있는 첫 영웅) 머리 위에 emoteSec초 */
export function emote(b: Battle, side: 'hero' | 'mob', key: string) {
  const u = (side === 'hero' ? b.heroes : b.mobs).find((x) => !x.dead);
  if (!u) return;
  b.emotes = b.emotes.filter((e) => e.uid !== u.uid);
  b.emotes.push({ uid: u.uid, key, t: 0 });
}
let aiNext = 0;
/** 상대 AI도 가끔 (aiEvery초 사이마다 aiChance 확률) */
export function aiEmote(b: Battle, dt: number) {
  if (b.phase !== 'fight') return;
  aiNext -= dt;
  if (aiNext > 0) return;
  const [lo, hi] = A.aiEvery;
  aiNext = lo + Math.random() * (hi - lo);
  if (Math.random() < A.aiChance) emote(b, 'mob', CONFIG.social.quick.emotes[Math.floor(Math.random() * CONFIG.social.quick.emotes.length)]);
}
export const resetAiEmote = () => (aiNext = A.aiEvery[0]);
