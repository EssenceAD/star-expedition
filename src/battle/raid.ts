// 보스 전장 (레이드 8인 · 월드 보스 · 길드 레이드 — 스토리와 다른 화면 · 형철 10/17 지시 ①~⑥)
//  ① 거대 보스 + 부위 파괴(팔·머리·코어 각각 체력 · 부수면 그 패턴이 사라지고 부서진 모습)
//  ② 바닥 위/아래 2줄 · 파티 A/B · 줄 단위 빨간 경고 → 탭 한 번으로 줄 바꿔 피하기 (AUTO도 피함 · 직접 피하면 보너스)
//  ③ 그로기 게이지 → 보스 다운 + 두 영웅 협공 컷인 (조합별 전용 컷인 자리 data/combos.ts)
//  ④ 체력 70%·30% 페이즈 전환 (클로즈업 · 배경 바뀜 · 패턴 바뀜)  ⑤ 다층 배경·흔들림·필살기 줌 (render.ts)  ⑥ 피해 순위 · 결과 MVP·부위 파괴 1등·회피 수
import { CONFIG } from '../config';
import { comboOf } from '../data/combos';
import { T } from '../theme/tokens';
import { addSt, alive, damage, playAct, rnd, type Battle, type Unit } from './sim';

const RA = CONFIG.raidArena;
export interface PartState {
  key: string;
  name: string;
  max: number;
  hp: number;
  broken: boolean;
  /** 그림 안 자리 (보스 그림 기준 비율) */
  box: number[];
  pattern: string;
  /** 영웅 uid → 이 부위에 준 피해 */
  dealt: Record<number, number>;
}
export interface RaidState {
  /** 부위·페이즈 기준 체력 */
  base: number;
  parts: PartState[];
  /** 집중 공격할 부위 (−1 = 자동: 아직 안 부서진 첫 부위) */
  focus: number;
  groggy: number;
  gMax: number;
  downT: number;
  phase: number;
  phaseT: number;
  /** 패턴: 다음까지 남은 초 · 지금 경고 중인 줄과 남은 초 · 이번 경고 키 · 남은 줄 순서 */
  left: number;
  order: number;
  warnLane: number | null;
  warnT: number;
  warnKey: string;
  queue: number[];
  /** 이번 경고에 AUTO/AI 피하기를 정했나 · 직접 피했나 */
  decided: boolean;
  manualThis: boolean;
  dodges: { manual: number; auto: number; hit: number };
  duo: { a: Unit; b: Unit; name: string; line: string; t: number } | null;
  zoom: { t: number; dur: number; x: number; y: number; k: number } | null;
  /** 알림 한 줄 (부위 파괴·페이즈) */
  note: { text: string; t: number } | null;
}

export function raidInit(b: Battle) {
  const boss = b.mobs.find((m) => m.mob?.boss);
  if (!boss) return;
  const base = boss.mob?.partBase ?? boss.max;
  b.raid = {
    base,
    parts: RA.parts.map((p) => ({ key: p.key, name: p.name, max: base * p.hp, hp: base * p.hp, broken: false, box: p.box, pattern: p.pattern, dealt: {} })),
    focus: -1, groggy: 0, gMax: RA.groggy.max, downT: 0, phase: 0, phaseT: 0, left: 3, order: 0, warnLane: null, warnT: 0, warnKey: '', queue: [], decided: false, manualThis: false,
    dodges: { manual: 0, auto: 0, hit: 0 }, duo: null, zoom: null, note: null,
  };
}
const laneY = (l: number) => RA.lanes[l];
/** 패턴 순서 (이번 페이즈 · 부서진 부위 패턴 빼고) */
function patternsNow(r: RaidState) {
  const gone = new Set(r.parts.filter((p) => p.broken).map((p) => p.pattern));
  const list = RA.phasePatterns[Math.min(r.phase, RA.phasePatterns.length - 1)].filter((k) => !gone.has(k));
  return list.length ? list : ['rage'];
}
/** 내 파티(AI 아닌 영웅)가 더 많이 서 있는 줄 */
function myLane(b: Battle) {
  const mine = alive(b.heroes).filter((h) => !h.ai);
  const up = mine.filter((h) => h.lane === 0).length;
  return up >= mine.length - up ? 0 : 1;
}
function moveLane(u: Unit, to: number) {
  u.lane = to;
}
/** 직접 피하기 (탭 한 번): 경고 중인 줄에 있는 내 영웅들을 반대 줄로 — 경고 중이면 보너스 · 아니면 그냥 줄 바꾸기 */
export function raidDodge(b: Battle): number {
  const r = b.raid;
  if (!r) return 0;
  const lane = r.warnLane ?? myLane(b);
  const movers = alive(b.heroes).filter((h) => !h.ai && h.lane === lane);
  for (const h of movers) moveLane(h, 1 - lane);
  if (r.warnLane != null && movers.length && !r.manualThis) {
    r.manualThis = true;
    r.dodges.manual++;
    addGroggy(b, RA.groggy.dodge);
    for (const h of movers) addSt(h, 'atkUp', RA.dodgeBonus.dur, RA.dodgeBonus.atk);
  }
  return movers.length;
}
function addGroggy(b: Battle, n: number) {
  const r = b.raid!;
  if (r.downT > 0) return;
  r.groggy += n;
  if (r.groggy < r.gMax) return;
  // 그로기 → 다운 + 협공 컷인 (지금까지 가장 많이 때린 두 영웅)
  const boss = b.mobs.find((m) => m.mob?.boss && !m.dead);
  r.groggy = 0;
  r.gMax = Math.round(r.gMax * RA.groggy.grow);
  r.downT = RA.groggy.dur;
  if (boss) boss.st.stun = { t: RA.groggy.dur, v: 0 };
  r.warnLane = null;
  r.queue = [];
  b.pat.text = '';
  const top = [...alive(b.heroes)].sort((x, y) => y.dealt - x.dealt);
  if (top.length >= 2) {
    const c = comboOf(top[0].hero!.def.id, top[1].hero!.def.id);
    r.duo = { a: top[0], b: top[1], name: c.name, line: c.line, t: 0 };
  }
  b.shake = Math.max(b.shake, CONFIG.combat.shake.bossKill);
  b.flash = 1;
  r.note = { text: '그로기! 보스 다운 — 피해 ×' + RA.groggy.dmgMult, t: 0 };
}
/** 보스가 맞았을 때 (영웅이 때림): 부위 · 그로기 · 페이즈 */
export function raidOnHit(b: Battle, by: Unit, boss: Unit, dmg: number, skill: boolean, stun: boolean) {
  const r = b.raid!;
  const alivePart = r.focus >= 0 && !r.parts[r.focus].broken ? r.focus : r.parts.findIndex((p) => !p.broken);
  if (alivePart >= 0) {
    const p = r.parts[alivePart];
    p.hp = Math.max(0, p.hp - dmg);
    p.dealt[by.uid] = (p.dealt[by.uid] ?? 0) + dmg;
    if (p.hp <= 0 && !p.broken) {
      p.broken = true;
      if (r.focus === alivePart) r.focus = -1;
      r.note = { text: `${p.name} 파괴! 「${RA.patterns[p.pattern]?.text.split(' — ')[1] ?? p.pattern}」 패턴이 사라져요`, t: 0 };
      b.shake = Math.max(b.shake, CONFIG.combat.shake.boss);
      b.flash = 0.8;
      const [bx, by2] = partCenter(b, boss, p);
      for (let i = 0; i < 40; i++) b.parts.push({ x: bx, y: by2, vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 360, t: 0, dur: 0.9 + Math.random() * 0.5, color: T.battle.burstKill, size: 3 + Math.random() * 5 });
      if (r.warnKey === p.pattern) ((r.warnLane = null), (r.queue = []), (b.pat.text = ''));
    }
  }
  addGroggy(b, (skill ? RA.groggy.skill : RA.groggy.hit) + (stun ? RA.groggy.stun : 0));
  // 페이즈 전환
  const ratio = 1 - Math.min(1, (boss.max - boss.hp) / r.base);
  if (r.phase < RA.phases.length && ratio <= RA.phases[r.phase] && boss.hp > 0) {
    r.phase++;
    r.phaseT = RA.phaseSec;
    r.zoom = { t: 0, dur: RA.phaseSec, x: boss.x, y: boss.y - boss.h * 0.6, k: RA.zoom.phase };
    r.note = { text: `${r.phase + 1}페이즈 — ${r.phase === 1 ? '분노' : '최후의 발악'}! 패턴이 바뀌어요`, t: 0 };
    r.left = 2.5;
    r.warnLane = null;
    r.queue = [];
    b.pat.text = '';
    b.flash = 1;
  }
}
/** 부위 가운데 (화면 좌표) */
export function partCenter(_b: Battle, boss: Unit, p: PartState): [number, number] {
  const [cx, up, w, h] = p.box;
  return [boss.x + (cx + w / 2) * boss.h * 0.9, boss.y - (up - h / 2) * boss.h];
}
/** 필살기 줌 (내 영웅 3번 스킬) */
export function raidUltZoom(b: Battle, u: Unit) {
  if (!b.raid || u.ai) return;
  b.raid.zoom = { t: 0, dur: RA.zoom.ultSec, x: u.x + 60, y: u.y - u.h * 0.6, k: RA.zoom.ult };
}

/** 한 걸음 (fight 중 · 보스 패턴 대신) */
export function raidStep(b: Battle, dt: number, dtReal: number) {
  const r = b.raid!;
  const boss = b.mobs.find((m) => m.mob?.boss && !m.dead);
  for (const h of b.heroes) {
    const ty = laneY(h.lane);
    if (Math.abs(h.y - ty) > 0.5) h.y += Math.sign(ty - h.y) * Math.min(Math.abs(ty - h.y), (Math.abs(RA.lanes[1] - RA.lanes[0]) / RA.laneMove) * dtReal);
  }
  if (r.note) ((r.note.t += dtReal), r.note.t > 2.6 && (r.note = null));
  if (r.zoom) ((r.zoom.t += dtReal), r.zoom.t > r.zoom.dur && (r.zoom = null));
  if (r.duo) ((r.duo.t += dtReal), r.duo.t > 1.4 && (r.duo = null));
  if (r.phaseT > 0) r.phaseT -= dtReal;
  if (r.downT > 0) {
    r.downT -= dt;
    return;
  }
  if (!boss || r.phaseT > 0) return;
  const speed = RA.phaseSpeed[Math.min(r.phase, RA.phaseSpeed.length - 1)];
  if (r.warnLane == null) {
    r.left -= dt * speed;
    if (r.left > 0) return;
    const list = patternsNow(r);
    const key = list[r.order++ % list.length];
    const P = RA.patterns[key];
    const first = myLane(b);
    r.warnKey = key;
    r.queue = P.lanes === 'both' ? [1 - first] : [];
    startWarn(b, first, P.warn);
    return;
  }
  r.warnT -= dt;
  const P = RA.patterns[r.warnKey];
  // AUTO·AI 피하기: 경고가 거의 끝날 때 한 번 정함
  if (!r.decided && r.warnT < 0.35) {
    r.decided = true;
    for (const h of alive(b.heroes)) {
      if (h.lane !== r.warnLane) continue;
      const auto = h.ai ? RA.aiDodge : !r.manualThis && (b.auto || h.autoOn) ? RA.autoDodge : 0;
      if (auto && rnd() < auto) {
        moveLane(h, 1 - r.warnLane);
        if (!h.ai) r.dodges.auto++;
      }
    }
  }
  if (r.warnT > 0) return;
  // 쾅: 그 줄에 서 있는 영웅 모두
  playAct(boss, 'attack');
  const lane = r.warnLane;
  const hit = alive(b.heroes).filter((h) => h.lane === lane && Math.abs(h.y - laneY(lane)) < 12);
  for (const h of hit) {
    damage(b, boss, h, P.mult);
    if (!h.ai) r.dodges.hit++;
  }
  b.fx.push({ kind: 'slam', x: 260, y: laneY(lane), color: T.battle.bossSlam, t: 0, dur: 0.6, r: 340 });
  b.shake = Math.max(b.shake, CONFIG.combat.shake.boss + 4);
  b.flash = Math.max(b.flash, 0.5);
  const next = r.queue.shift();
  if (next != null) startWarn(b, next, Math.max(0.9, P.warn * 0.55));
  else {
    r.warnLane = null;
    b.pat.text = '';
    r.left = P.every;
  }
}
function startWarn(b: Battle, lane: number, warn: number) {
  const r = b.raid!;
  r.warnLane = lane;
  r.warnT = warn;
  r.decided = false;
  r.manualThis = false;
  b.pat.text = `${RA.patterns[r.warnKey].text} · ${lane === 0 ? '위' : '아래'} 줄!`;
}
/** 결과용 요약: 부위 파괴 1등 · 회피 */
export function raidSummary(b: Battle) {
  const r = b.raid;
  if (!r) return null;
  const name = (uid: number) => b.heroes.find((h) => h.uid === uid)?.name ?? '?';
  return {
    parts: r.parts.map((p) => {
      const top = Object.entries(p.dealt).sort((a, c) => c[1] - a[1])[0];
      return { name: p.name, broken: p.broken, top: top ? name(+top[0]) : '-' };
    }),
    dodges: r.dodges,
    phase: r.phase + 1,
  };
}
