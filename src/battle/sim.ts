// 실시간 전투 진행 (그리기와 따로 · 시험 가능): 걷기 → 웨이브 싸움 → … → 보스 → 승리/패배(전멸·시간 초과)
import { durOf, hitTimes, type Act, type AnimSet } from '../sprite/sheet';
import { BOSS_PATTERNS, BOSS_SLOT, COMBAT, HEROES, MOB_SLOTS, MOBS, WAVES, type HeroDef, type MobDef, type SkillDef } from './data';

export interface Unit {
  uid: number;
  side: 'hero' | 'mob';
  hero?: HeroDef;
  mob?: MobDef;
  anims: AnimSet;
  name: string;
  max: number;
  hp: number;
  atk: number;
  def: number;
  rate: number;
  x: number;
  y: number;
  tx: number;
  act: Act;
  at: number;
  busy: number;
  cd: number;
  mana: number;
  /** 스킬 쿨타임 남은 초 */
  scd: [number, number, number];
  /** 패널별 Auto */
  autoOn: boolean;
  shield: number;
  stun: number;
  slow: number;
  regen: number;
  regenLeft: number;
  guard: number;
  taunt: number;
  flash: number;
  knock: number;
  dead: boolean;
  deadT: number;
  /** 잔상: 스킬·평타 중 남기는 그림 자취 */
  trail: number;
  dealt: number;
  pending: { at: number; fn: () => void }[];
}
export interface Num { x: number; y: number; v: number; crit: boolean; heal: boolean; t: number; big: boolean }
export type FxKind = 'slash' | 'burst' | 'ring' | 'bolt' | 'star' | 'heal' | 'shield' | 'slam' | 'beam' | 'pillar' | 'spark';
export interface Fx { kind: FxKind; x: number; y: number; x2?: number; y2?: number; color: string; t: number; dur: number; r?: number }
export interface Particle { x: number; y: number; vx: number; vy: number; t: number; dur: number; color: string; size: number }
export interface CutIn { hero: HeroDef; skill: SkillDef; t: number }

export interface Battle {
  t: number;
  phase: 'walk' | 'fight' | 'win' | 'lose';
  why: '' | 'wipe' | 'time';
  wave: number;
  walkLeft: number;
  scroll: number;
  heroes: Unit[];
  mobs: Unit[];
  nums: Num[];
  fx: Fx[];
  parts: Particle[];
  cut: CutIn | null;
  stop: number;
  shake: number;
  flash: number;
  auto: boolean;
  speed: number;
  pat: { i: number; left: number; warn: number; text: string };
  stats: { dealt: number; taken: number; skills: number; time: number; bossDealt: number };
  queue: { u: Unit; i: number }[];
  sounds: string[];
}

let uidN = 1;
let rand: () => number = Math.random;
export function makeBattle(rnd: () => number = Math.random): Battle {
  rand = rnd;
  const heroes = HEROES.map((h): Unit => unit('hero', h.name, h.hp, h.atk, h.def, h.rate, h.slot[0], h.slot[1], h.anims, { hero: h }));
  return {
    t: 0, phase: 'walk', why: '', wave: -1, walkLeft: 1.6, scroll: 0, heroes, mobs: [], nums: [], fx: [], parts: [], cut: null, stop: 0, shake: 0, flash: 0,
    auto: false, speed: 1, pat: { i: 0, left: BOSS_PATTERNS[0].every, warn: 0, text: '' }, stats: { dealt: 0, taken: 0, skills: 0, time: 0, bossDealt: 0 }, queue: [], sounds: [],
  };
}
function unit(side: Unit['side'], name: string, hp: number, atk: number, def: number, rate: number, x: number, y: number, anims: AnimSet, o: Partial<Unit>): Unit {
  return { uid: uidN++, side, anims, name, max: hp, hp, atk, def, rate, x, y, tx: x, act: 'idle', at: rand() * 2, busy: 0, cd: 0.4 + rand() * 0.8, mana: 30, scd: [0, 0, 0], autoOn: false, shield: 0, stun: 0, slow: 0, regen: 0, regenLeft: 0, guard: 0, taunt: 0, flash: 0, knock: 0, dead: false, deadT: 0, trail: 0, dealt: 0, pending: [], ...o };
}
export const alive = (us: Unit[]) => us.filter((u) => !u.dead);
export const bossOf = (b: Battle) => b.mobs.find((m) => m.mob?.boss);

function spawnWave(b: Battle) {
  b.wave++;
  b.mobs = WAVES[b.wave].map((id, i) => {
    const m = MOBS[id];
    const [x, y] = m.boss ? BOSS_SLOT : MOB_SLOTS[i % MOB_SLOTS.length];
    const u = unit('mob', m.name, m.hp, m.atk, m.def, m.rate, x + 380, y, m.anims, { mob: m });
    u.tx = x;
    return u;
  });
  b.pat = { i: 0, left: BOSS_PATTERNS[0].every, warn: 0, text: '' };
}

function play(u: Unit, a: Act) {
  u.act = a;
  u.at = 0;
  const loop = (u.anims[a] ?? u.anims.idle)?.loop;
  u.busy = loop ? 0 : durOf(u.anims, a);
}
function onHit(u: Unit, a: Act, fn: (k: number) => void) {
  hitTimes(u.anims, a).forEach((h, k) => u.pending.push({ at: h, fn: () => fn(k) }));
}

// ───────── 피해 · 회복 ─────────
const heroAtk = (u: Unit) => u.atk * (u.hero?.id === 'woongs' && u.hp < u.max * 0.5 ? 1.25 : 1);
function burst(b: Battle, x: number, y: number, color: string, n: number, sp = 160) {
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const v = sp * (0.4 + rand());
    b.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, dur: 0.4 + rand() * 0.4, color, size: 2 + rand() * 3 });
  }
}
export function damage(b: Battle, by: Unit, to: Unit, mult: number, o: { crit?: boolean; stun?: number; slow?: number } = {}) {
  if (to.dead) return 0;
  const crit = o.crit ?? rand() < COMBAT.critChance;
  const atk = by.side === 'hero' ? heroAtk(by) : by.atk;
  let dmg = atk * mult * (crit ? COMBAT.critMult : 1) * (0.92 + rand() * 0.16);
  dmg *= 1 - Math.min(COMBAT.defMax, to.def / (to.def + COMBAT.defK));
  if (to.hero?.id === 'hwang') dmg *= 0.85;
  if (to.guard > 0) dmg *= 0.7;
  dmg = Math.max(1, Math.round(dmg));
  let left = dmg;
  if (to.shield > 0) {
    const s = Math.min(to.shield, left);
    to.shield -= s;
    left -= s;
  }
  to.hp = Math.max(0, to.hp - left);
  to.flash = 1;
  to.knock = (crit ? COMBAT.knock.crit : COMBAT.knock.hit) * (to.side === 'mob' ? 1 : -1) * (to.mob?.boss ? 0.15 : 1);
  if (o.stun && !to.mob?.boss) to.stun = Math.max(to.stun, o.stun);
  if (o.stun && to.mob?.boss) to.stun = Math.max(to.stun, o.stun * 0.4);
  if (o.slow) to.slow = Math.max(to.slow, o.slow);
  const top = to.mob ? to.mob.h : (to.hero?.h ?? 100);
  if (by.side === 'hero') {
    b.stats.dealt += dmg;
    by.dealt += dmg;
    if (to.mob?.boss) b.stats.bossDealt += dmg;
    by.mana = Math.min(COMBAT.mana.max, by.mana + (mult <= 1.2 ? COMBAT.mana.hit : 2));
    burst(b, to.x, to.y - top * 0.5, crit ? '#ffd36b' : '#ffffff', crit ? 10 : 5);
  } else {
    b.stats.taken += dmg;
    to.mana = Math.min(COMBAT.mana.max, to.mana + COMBAT.mana.hurt);
    if (to.busy <= 0 || to.act === 'idle') play(to, 'hurt');
  }
  // 같은 대상에 몰린 숫자는 위로 한 칸씩 쌓기
  const stack = b.nums.filter((n) => !n.heal && Math.abs(n.x - to.x) < 50 && n.t < 0.4).length;
  b.nums.push({ x: to.x + (rand() - 0.5) * 26, y: to.y - top - 4 - (stack % 4) * 22, v: dmg, crit, heal: false, t: 0, big: mult >= 2.5 || crit });
  b.stop = Math.max(b.stop, crit ? COMBAT.hitstop.crit : COMBAT.hitstop.hit);
  if (crit) b.shake = Math.max(b.shake, COMBAT.shake.crit);
  b.sounds.push(crit ? 'crit' : 'hit');
  if (to.hp <= 0) kill(b, to);
  return dmg;
}
function kill(b: Battle, u: Unit) {
  u.dead = true;
  u.deadT = 0;
  u.pending = [];
  if (u.side === 'hero') play(u, 'down');
  b.stop = Math.max(b.stop, COMBAT.hitstop.kill);
  burst(b, u.x, u.y - (u.mob?.h ?? 80) * 0.5, '#fff6c8', u.mob?.boss ? 60 : 16, u.mob?.boss ? 320 : 180);
  if (u.mob?.boss) {
    b.shake = 12;
    b.flash = 1;
  }
}
function heal(b: Battle, to: Unit, amt: number) {
  if (to.dead) return;
  const n = Math.round(amt * 1.15);
  to.hp = Math.min(to.max, to.hp + n);
  b.nums.push({ x: to.x, y: to.y - (to.hero?.h ?? 100) - 10, v: n, crit: false, heal: true, t: 0, big: false });
}

const frontMob = (b: Battle) => alive(b.mobs).sort((a, c) => a.x - c.x)[0];
function mobTarget(b: Battle): Unit | undefined {
  const hs = alive(b.heroes);
  const t = hs.find((h) => h.taunt > 0);
  if (t) return t;
  const s = hs.sort((a, c) => c.x - a.x);
  return rand() < 0.7 ? s[0] : s[Math.floor(rand() * s.length)];
}

// ───────── 스킬 ─────────
export function canCast(b: Battle, u: Unit, i: number) {
  const s = u.hero!.skills[i];
  return b.phase === 'fight' && !u.dead && u.stun <= 0 && u.mana >= s.cost && u.scd[i] <= 0 && alive(b.mobs).some((m) => m.x <= m.tx + 40);
}
export function requestSkill(b: Battle, u: Unit, i: number): boolean {
  if (!canCast(b, u, i)) return false;
  if (u.busy > 0 && u.act !== 'hurt') {
    if (!b.queue.some((q) => q.u === u)) b.queue.push({ u, i });
    return true;
  }
  cast(b, u, i);
  return true;
}
function cast(b: Battle, u: Unit, i: number) {
  const h = u.hero!;
  const s = h.skills[i];
  u.mana -= s.cost;
  u.scd[i] = s.cd;
  if (h.id === 'ikamolly') u.mana = Math.min(COMBAT.mana.max, u.mana + 12);
  b.stats.skills++;
  b.cut = { hero: h, skill: s, t: 0 };
  b.sounds.push(h.sfx);
  play(u, s.act);
  u.trail = durOf(u.anims, s.act);
  const mobs = () => alive(b.mobs);
  const front = frontMob(b);
  const fx = (f: Omit<Fx, 't'>) => b.fx.push({ ...f, t: 0 });
  const top = (m: Unit) => m.y - (m.mob?.h ?? 60) * 0.55;
  onHit(u, s.act, (k) => {
    switch (s.key) {
      case 'slashAll':
        for (const m of mobs()) {
          damage(b, u, m, s.mult);
          fx({ kind: 'slash', x: m.x, y: top(m), color: s.color, dur: 0.32, r: k ? 1 : -1 });
        }
        break;
      case 'smash':
        if (front) for (const m of mobs()) if (Math.abs(m.x - front.x) < 140) damage(b, u, m, m === front ? s.mult : s.mult * 0.5, { stun: 1 });
        fx({ kind: 'pillar', x: front?.x ?? 600, y: front?.y ?? 310, color: s.color, dur: 0.55, r: 60 });
        fx({ kind: 'slam', x: front?.x ?? 600, y: front?.y ?? 310, color: s.color, dur: 0.55, r: 150 });
        b.shake = Math.max(b.shake, 9);
        b.flash = 0.6;
        break;
      case 'pierce':
        if (front) {
          damage(b, u, front, s.mult, { crit: true });
          fx({ kind: 'beam', x: u.x + 20, y: u.y - 50, x2: front.x + 60, y2: top(front), color: s.color, dur: 0.45 });
          b.flash = 0.8;
        }
        break;
      case 'fireball':
        if (front) {
          fx({ kind: 'bolt', x: u.x + 30, y: u.y - 70, x2: front.x, y2: top(front), color: s.color, dur: 0.25 });
          fx({ kind: 'burst', x: front.x, y: top(front), color: s.color, dur: 0.5, r: 60 });
          damage(b, u, front, s.mult);
        }
        break;
      case 'frost':
        for (const m of mobs()) {
          damage(b, u, m, s.mult, { slow: 4 });
          fx({ kind: 'ring', x: m.x, y: m.y, color: s.color, dur: 0.7, r: 60 });
        }
        break;
      case 'meteor':
        for (const n of [0, 1, 2])
          u.pending.push({
            at: u.at + 0.15 + n * 0.2,
            fn: () => {
              for (const m of alive(b.mobs)) {
                damage(b, u, m, s.mult);
                fx({ kind: 'star', x: m.x + (rand() - 0.5) * 40, y: top(m), color: s.color, dur: 0.55, r: 55 });
              }
              b.shake = Math.max(b.shake, 5);
            },
          });
        break;
      case 'heal': {
        const t = alive(b.heroes).sort((a, c) => a.hp / a.max - c.hp / c.max)[0];
        if (t) {
          heal(b, t, u.atk * s.mult * 3);
          fx({ kind: 'pillar', x: t.x, y: t.y, color: s.color, dur: 0.8, r: 26 });
        }
        break;
      }
      case 'sanctuary':
        for (const t of alive(b.heroes)) {
          t.regen = u.atk * s.mult * 1.15;
          t.regenLeft = 5;
          fx({ kind: 'heal', x: t.x, y: t.y - 50, color: s.color, dur: 0.9, r: 44 });
        }
        break;
      case 'barrier':
        for (const t of alive(b.heroes)) {
          t.shield += Math.round(u.atk * s.mult * 4);
          fx({ kind: 'shield', x: t.x, y: t.y - 50, color: s.color, dur: 0.9, r: 56 });
        }
        break;
      case 'taunt':
        u.taunt = 5;
        u.shield += 90000;
        fx({ kind: 'ring', x: u.x, y: u.y, color: s.color, dur: 0.9, r: 120 });
        break;
      case 'shieldBash':
        if (front) {
          damage(b, u, front, s.mult, { stun: 1.5 });
          fx({ kind: 'burst', x: front.x, y: top(front), color: s.color, dur: 0.4, r: 50 });
        }
        break;
      case 'resolve':
        for (const t of alive(b.heroes)) {
          t.guard = 6;
          fx({ kind: 'pillar', x: t.x, y: t.y, color: s.color, dur: 0.9, r: 24 });
        }
        break;
    }
  });
}

/** AUTO: 고를 만한 스킬 (사제는 다친 아군이 있을 때 회복 먼저) */
function autoPick(b: Battle, u: Unit): number {
  const h = u.hero!;
  const hurt = alive(b.heroes).filter((x) => x.hp < x.max * 0.65).length;
  const order = h.role === 'priest' ? (hurt >= 2 ? [2, 1, 0] : hurt ? [0, 1] : []) : [2, 1, 0];
  for (const i of order) if (canCast(b, u, i)) return i;
  return -1;
}

// ───────── 한 걸음 ─────────
export function step(b: Battle, dtReal: number) {
  b.sounds.length = 0;
  let dt = dtReal * b.speed;
  if (b.cut) {
    b.cut.t += dtReal;
    if (b.cut.t >= COMBAT.cutInSec) b.cut = null;
    else dt *= COMBAT.cutInSlow;
  }
  b.shake = Math.max(0, b.shake - dtReal * 30);
  b.flash = Math.max(0, b.flash - dtReal * 3);
  for (const n of b.nums) n.t += dtReal;
  b.nums = b.nums.filter((n) => n.t < 1.2);
  for (const f of b.fx) f.t += dt;
  b.fx = b.fx.filter((f) => f.t < f.dur);
  for (const p of b.parts) {
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 420 * dt;
  }
  b.parts = b.parts.filter((p) => p.t < p.dur);
  if (b.stop > 0) {
    b.stop -= dtReal;
    return;
  }
  b.t += dt;
  if (b.phase === 'fight' || b.phase === 'walk') b.stats.time += dt;
  if ((b.phase === 'fight' || b.phase === 'walk') && b.stats.time >= COMBAT.limit) {
    b.phase = 'lose';
    b.why = 'time';
    return;
  }

  for (const u of [...b.heroes, ...b.mobs]) {
    u.at += dt * (u.slow > 0 ? 0.6 : 1);
    u.flash = Math.max(0, u.flash - dt * 5);
    u.knock *= Math.pow(0.0005, dt);
    u.trail = Math.max(0, u.trail - dt);
    for (const k of ['stun', 'slow', 'guard', 'taunt'] as const) u[k] = Math.max(0, u[k] - dt);
    for (let i = 0; i < 3; i++) u.scd[i] = Math.max(0, u.scd[i] - dt);
    if (u.regenLeft > 0) {
      u.regenLeft -= dt;
      if (!u.dead) u.hp = Math.min(u.max, u.hp + u.regen * dt);
    }
    const due = u.pending.filter((p) => p.at <= u.at);
    u.pending = u.pending.filter((p) => p.at > u.at);
    for (const p of due) p.fn();
    if (u.busy > 0) {
      u.busy -= dt;
      if (u.busy <= 0 && !u.dead) ((u.act = b.phase === 'walk' && u.side === 'hero' ? 'walk' : b.phase === 'win' && u.side === 'hero' ? 'win' : 'idle'), (u.at = 0));
    }
    if (u.dead) u.deadT += dt;
  }

  if (b.phase === 'walk') {
    for (const h of alive(b.heroes)) if (!h.busy && h.act !== 'walk') ((h.act = 'walk'), (h.at = 0));
    b.scroll += 130 * dt;
    b.walkLeft -= dt;
    if (b.walkLeft <= 0) {
      spawnWave(b);
      b.phase = 'fight';
      for (const h of alive(b.heroes)) if (h.act === 'walk') ((h.act = 'idle'), (h.at = 0));
    }
    return;
  }
  if (b.phase !== 'fight') return;

  for (const m of alive(b.mobs)) if (m.x > m.tx) m.x = Math.max(m.tx, m.x - 320 * dt);
  const arrived = (m: Unit) => m.x <= m.tx + 1;

  for (const h of alive(b.heroes)) {
    h.mana = Math.min(COMBAT.mana.max, h.mana + COMBAT.mana.regen * dt);
    const q = b.queue.find((x) => x.u === h);
    if (q && h.busy <= 0) {
      b.queue = b.queue.filter((x) => x !== q);
      if (canCast(b, h, q.i)) cast(b, h, q.i);
    }
    if ((b.auto || h.autoOn) && h.busy <= 0 && !b.cut) {
      const i = autoPick(b, h);
      if (i >= 0) cast(b, h, i);
    }
  }
  const ready = (u: Unit) => !u.dead && u.busy <= 0 && u.stun <= 0 && (u.side === 'hero' || arrived(u));
  for (const h of b.heroes) {
    if (!ready(h)) continue;
    h.cd -= dt;
    if (h.cd > 0) continue;
    const t = frontMob(b);
    if (!t || !arrived(t)) continue;
    h.cd = h.hero!.rate;
    play(h, 'attack');
    onHit(h, 'attack', () => {
      if (t.dead) return;
      const ty = t.y - (t.mob?.h ?? 60) * 0.55;
      if (h.hero!.ranged) b.fx.push({ kind: 'bolt', x: h.x + 26, y: h.y - 64, x2: t.x, y2: ty, color: h.hero!.color, t: 0, dur: 0.22 });
      else b.fx.push({ kind: 'slash', x: t.x, y: ty, color: '#ffffff', t: 0, dur: 0.22, r: 1 });
      damage(b, h, t, 1);
    });
  }
  const boss = alive(b.mobs).find((m) => m.mob?.boss);
  for (const m of b.mobs) {
    if (!ready(m)) continue;
    if (m === boss && b.pat.warn > 0) continue;
    m.cd -= dt * (m.slow > 0 ? 0.6 : 1);
    if (m.cd > 0) continue;
    m.cd = m.rate;
    const t = mobTarget(b);
    if (!t) break;
    play(m, 'attack');
    onHit(m, 'attack', () => damage(b, m, t, 1));
  }
  // 보스 패턴 (경고 한 줄 → 쾅)
  if (boss && arrived(boss)) {
    const P = BOSS_PATTERNS[b.pat.i % BOSS_PATTERNS.length];
    if (b.pat.warn > 0) {
      b.pat.warn -= dt;
      if (b.pat.warn <= 0) {
        b.pat.text = '';
        if (boss.stun <= 0) {
          play(boss, 'attack');
          for (const h of alive(b.heroes)) damage(b, boss, h, P.mult);
          if (P.key === 'slam') b.fx.push({ kind: 'slam', x: 230, y: 312, color: '#ffb35c', t: 0, dur: 0.7, r: 300 });
          else b.fx.push({ kind: 'beam', x: boss.x - 40, y: boss.y - boss.mob!.h * 0.72, x2: 60, y2: 270, color: '#ffb000', t: 0, dur: 0.6 });
          b.shake = COMBAT.shake.boss;
          b.flash = 0.7;
        }
        b.pat.i++;
        b.pat.left = BOSS_PATTERNS[b.pat.i % BOSS_PATTERNS.length].every;
      }
    } else if ((b.pat.left -= dt) <= 0) {
      b.pat.warn = P.warn;
      b.pat.text = P.text;
    }
  }

  if (!alive(b.heroes).length) {
    b.phase = 'lose';
    b.why = 'wipe';
    return;
  }
  if (!alive(b.mobs).length && b.mobs.every((m) => m.deadT > 0.6)) {
    if (b.wave >= WAVES.length - 1) {
      b.phase = 'win';
      for (const h of alive(b.heroes)) play(h, 'win');
    } else {
      b.phase = 'walk';
      b.walkLeft = 1.8;
      b.queue = [];
    }
  }
}

/** 별 3개 평가: 클리어 1 · 아무도 안 쓰러짐 +1 · 120초 안 +1 */
export function starsOf(b: Battle): number {
  if (b.phase !== 'win') return 0;
  return 1 + (b.heroes.every((h) => !h.dead) ? 1 : 0) + (b.stats.time <= 120 ? 1 : 0);
}
