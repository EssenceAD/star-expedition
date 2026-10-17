// 실시간 전투 진행 (그리기와 따로 · 시험 가능): 걷기 → 웨이브 싸움 → … → (보스) → 승리/패배(전멸·시간 초과)
//  입력은 BattleSetup 하나 (스토리·탑·레이드 공용) · 스킬은 data/skills.ts 효과 조합을 여기 한 곳에서 해석
//  진형: 앞 2(f0·f1) / 뒤 2(b0·b1) — 적은 앞줄을 더 자주 노린다 · 상태이상: 기절·침묵·둔화·화상·보호막 (+ 공격↑↓·속도↑·피해 감소·도발·회복·치명↑)
import { CONFIG } from '../config';
import { SER_ASK } from '../data/bonds';
import { JOBS, ZONES } from '../data/jobs';
import type { BossPattern } from '../data/mobs';
import type { Eff, SkillDef, StatusKey } from '../data/skills';
import { durOf, hitTimes, type Act, type AnimSet } from '../sprite/sheet';
import { elemColor, T } from '../theme/tokens';
import type { BattleSetup, HeroSpec, MobSpec } from './setup';
import { raidInit, raidOnHit, raidStep, raidUltZoom, type RaidState } from './raid';

const K = CONFIG.combat;
export interface Mods {
  atk: number;
  crit: number;
  spd: number;
  heal: number;
  mana: number;
  dmgCut: number;
  skillDmg: number;
  bossDmg: number;
}
export interface Unit {
  uid: number;
  side: 'hero' | 'mob';
  hero?: HeroSpec;
  mob?: MobSpec;
  /** 결투장 상대 영웅 (mob 쪽이지만 영웅처럼 스킬을 씀) */
  pvp?: HeroSpec;
  /** 레이드 AI 아군 (늘 자동 · 패널 없음) */
  ai: boolean;
  /** 그림 좌우 뒤집기 (오른쪽에 선 영웅) */
  flip: boolean;
  /** 보스 전장: 서 있는 줄 (0 위 · 1 아래) */
  lane: number;
  anims: AnimSet;
  name: string;
  /** 화면 키 (논리 px) */
  h: number;
  max: number;
  hp: number;
  atk: number;
  def: number;
  rate: number;
  crit: number;
  critDmg: number;
  mod: Mods;
  x: number;
  y: number;
  tx: number;
  /** 위치 구역 번호 (영웅: 0 전방 · 1 중앙 · 2 후방) */
  zone: number;
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
  /** 상태: 남은 초 · 값 */
  st: Partial<Record<StatusKey, { t: number; v: number }>>;
  burnAcc: number;
  flash: number;
  knock: number;
  dead: boolean;
  deadT: number;
  /** 잔상: 스킬 중 남기는 그림 자취 */
  trail: number;
  dealt: number;
  healed: number;
  taken: number;
  pending: { at: number; fn: () => void }[];
}
export interface Num {
  x: number;
  y: number;
  v: number;
  kind: 'hit' | 'crit' | 'heal' | 'hurt' | 'burn';
  t: number;
  big: boolean;
  /** 겹침 판정용 크기 */
  w: number;
  hgt: number;
}
export type FxKind = 'slash' | 'burst' | 'ring' | 'bolt' | 'star' | 'heal' | 'shield' | 'slam' | 'beam' | 'pillar';
export interface Fx {
  kind: FxKind;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  color: string;
  t: number;
  dur: number;
  r?: number;
}
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  dur: number;
  color: string;
  size: number;
}
export interface CutIn {
  u: Unit;
  skill: SkillDef;
  t: number;
}
export interface Say {
  uid: number;
  text: string;
  t: number;
  dur: number;
}

export interface Battle {
  setup: BattleSetup;
  /** 논리 화면 너비 (적 자리는 오른쪽 끝 기준) */
  w: number;
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
  says: Say[];
  stop: number;
  shake: number;
  flash: number;
  auto: boolean;
  speed: number;
  /** 컷인: all = 모든 스킬 · big = 3번 스킬과 손으로 누른 스킬 · off = 없음 */
  cutIns: 'all' | 'big' | 'off';
  pat: { i: number; left: number; warn: number; text: string };
  stats: { dealt: number; taken: number; healed: number; skills: number; time: number; bossDealt: number };
  queue: { u: Unit; i: number }[];
  sounds: string[];
  /** 보스 전장 상태 (레이드·월드 보스·길드 레이드) */
  raid?: RaidState;
}

let uidN = 1;
let rand: () => number = Math.random;
/** 보스 전장(raid.ts)도 같은 난수 */
export const rnd = () => rand();
const NO_MODS = (): Mods => ({ atk: 0, crit: 0, spd: 0, heal: 0, mana: 0, dmgCut: 0, skillDmg: 0, bossDmg: 0 });
function unit(side: Unit['side'], name: string, o: Partial<Unit> & Pick<Unit, 'max' | 'atk' | 'def' | 'rate' | 'x' | 'y' | 'anims' | 'h'>): Unit {
  return {
    uid: uidN++, side, name, hp: o.max, crit: K.critChance, critDmg: K.critMult, mod: NO_MODS(), tx: o.x, zone: 0, ai: false, flip: false, lane: 0, act: 'idle', at: rand() * 2, busy: 0, cd: 0.4 + rand() * 0.8, mana: K.mana.start,
    scd: [0, 0, 0], autoOn: false, shield: 0, st: {}, burnAcc: 0, flash: 0, knock: 0, dead: false, deadT: 0, trail: 0, dealt: 0, healed: 0, taken: 0, pending: [], ...o,
  };
}

/** 영웅 하나의 장비·초월 비율 + 자기 패시브(stat · 팀 아님) */
function specMods(u: Unit) {
  const sp = specOf(u)!;
  const st = sp.st;
  u.mod.spd += st.spd ?? 0;
  u.mod.heal += st.heal ?? 0;
  u.mod.mana += st.mana ?? 0;
  u.mod.dmgCut += st.dmgCut ?? 0;
  u.mod.skillDmg += st.skillDmg ?? 0;
  u.mod.bossDmg += st.bossDmg ?? 0;
}
/** 영웅 정보 (우리 편 영웅이든 결투장 상대든) */
export const specOf = (u: Unit) => u.hero ?? u.pvp;
/** 패시브 · 인연 → 능력치 보정 (전투 시작 때 한 번) */
function applyMods(b: Battle) {
  const solo = b.setup.bonds.length === 0;
  // 장비·초월 등에서 온 비율 (crit는 Unit.crit에 이미 들어 있음)
  for (const u of b.heroes) specMods(u);
  for (const u of b.heroes) {
    const p = u.hero!.def.passive.p;
    const targets = p.k === 'stat' && p.team ? b.heroes : [u];
    for (const t of targets) {
      if (p.k === 'stat') {
        if (p.s === 'hp') t.max = t.hp = Math.round(t.max * (1 + p.v));
        else if (p.s === 'def') t.def = Math.round(t.def * (1 + p.v));
        else t.mod[p.s] += p.v;
      }
      if (p.k === 'solo' && solo) t.mod.atk += p.v;
    }
  }
  for (const bd of b.setup.bonds)
    for (const u of b.heroes) {
      const e = bd.eff;
      if (e.s === 'spd' || e.s === 'dmgCut' || e.s === 'mana' || e.s === 'skillDmg' || e.s === 'atk' || e.s === 'heal' || e.s === 'crit') u.mod[e.s] += e.v;
    }
}

export function makeBattle(setup: BattleSetup, o: { rnd?: () => number; w?: number } = {}): Battle {
  rand = o.rnd ?? Math.random;
  // 자리: 입력 순서(전방 → 중앙 → 후방)대로 places 4자리 · 구역이 바뀔 때마다 조금 더 뒤로 · 레이드 8인이면 places8 (내 파티 앞 · AI 뒤)
  let gaps = 0;
  const all = [...setup.heroes, ...(setup.allies ?? [])];
  const places = setup.allies?.length ? K.places8 : K.places;
  const heroes = all.map((h, i): Unit => {
    const zone = ZONES.indexOf(h.zone);
    if (i > 0 && h.zone !== all[i - 1].zone && !setup.allies?.length) gaps++;
    const [px, y] = places[i % places.length];
    const x = px - gaps * K.zoneGap;
    const u = unit('hero', h.def.name, { hero: h, anims: h.art.anims, h: h.art.h, max: h.st.hp, atk: h.st.atk, def: h.st.def, rate: h.st.rate, crit: h.st.crit, critDmg: h.st.critDmg, x, y, zone, ai: i >= setup.heroes.length });
    if (setup.arena) {
      // 보스 전장: 파티 A(내 4) 위 줄 · 파티 B(AI 4) 아래 줄 — AI가 없으면 내 파티를 2명씩 나눔
      const A = CONFIG.raidArena;
      const mine = i < setup.heroes.length;
      const k = mine ? i : i - setup.heroes.length;
      u.lane = setup.allies?.length ? (mine ? 0 : 1) : k < 2 ? 0 : 1;
      u.x = setup.allies?.length ? (mine ? A.aX[k] : A.bX[k]) : A.aX[k % 2] - (k < 2 ? 0 : 20);
      u.y = A.lanes[u.lane];
      u.tx = u.x;
    }
    return u;
  });
  const b: Battle = {
    setup, w: o.w ?? CONFIG.view.wBase, t: 0, phase: 'walk', why: '', wave: -1, walkLeft: K.walkSec * (1 - Math.max(0, ...setup.bonds.map((x) => x.walkCut ?? 0))), scroll: 0, heroes, mobs: [], nums: [], fx: [], parts: [], cut: null, says: [],
    stop: 0, shake: 0, flash: 0, auto: false, speed: 1, cutIns: 'big', pat: { i: 0, left: 0, warn: 0, text: '' }, stats: { dealt: 0, taken: 0, healed: 0, skills: 0, time: 0, bossDealt: 0 }, queue: [], sounds: [],
  };
  if (setup.arena) b.walkLeft = 0.5;
  applyMods(b);
  // 인연 대사: 시작하자마자 차례로 말풍선
  let at = 0.2;
  for (const bd of setup.bonds)
    for (const [id, text] of bd.lines) {
      const u = heroes.find((h) => h.hero!.def.id === id);
      if (u) b.says.push({ uid: u.uid, text, t: -at, dur: 2.2 });
      at += 1.1;
    }
  // 세르미뉴가 있으면 누군가 「세르님」께 묻고 짧게 답함
  const ser = heroes.find((h) => h.hero?.def.id === 'sermi');
  const asks = SER_ASK.filter(([id]) => heroes.some((h) => h.hero?.def.id === id));
  if (ser && asks.length) {
    const [id, text] = asks[Math.floor(rand() * asks.length)];
    b.says.push({ uid: heroes.find((h) => h.hero!.def.id === id)!.uid, text, t: -at, dur: 2.2 });
    b.says.push({ uid: ser.uid, text: ser.hero!.def.voice![0], t: -(at + 1.2), dur: 2.2 });
  }
  return b;
}
/** 창 크기가 바뀌면 적 자리를 오른쪽 끝에 맞춰 옮긴다 */
export function relayout(b: Battle, w: number) {
  const d = w - b.w;
  b.w = w;
  for (const m of b.mobs) {
    m.x += d;
    m.tx += d;
  }
  if (b.raid) for (const m of b.mobs) if (m.mob?.boss) ((m.tx = Math.round(w * CONFIG.raidArena.bossX)), (m.x = m.tx));
}
export const alive = (us: Unit[]) => us.filter((u) => !u.dead);
export const bossOf = (b: Battle) => b.mobs.find((m) => m.mob?.boss);
export const has = (u: Unit, s: StatusKey) => (u.st[s]?.t ?? 0) > 0;
const sv = (u: Unit, s: StatusKey) => (has(u, s) ? u.st[s]!.v : 0);
export function addSt(u: Unit, s: StatusKey, dur: number, v = 0) {
  const cur = u.st[s];
  u.st[s] = { t: Math.max(cur?.t ?? 0, dur), v: Math.max(cur && cur.t > 0 ? cur.v : 0, v) };
}

function spawnWave(b: Battle) {
  b.wave++;
  const specs = b.setup.waves[b.wave];
  b.mobs = specs.map((m, i) => {
    const [ox, y] = m.boss ? K.bossSlot : K.mobSlots[i % K.mobSlots.length];
    const x = b.w - ox;
    const hs = m.hero;
    const u = hs
      ? unit('mob', m.name, { mob: m, pvp: hs, anims: hs.art.anims, h: hs.art.h, max: m.hp, atk: m.atk, def: m.def, rate: m.rate, crit: hs.st.crit, critDmg: hs.st.critDmg, x: x + K.mobEnterFrom, y, zone: ZONES.indexOf(hs.zone), flip: true })
      : unit('mob', m.name, { mob: m, anims: m.kind.anims, h: m.kind.h, max: m.hp, atk: m.atk, def: m.def, rate: m.rate, x: x + K.mobEnterFrom, y });
    if (hs) specMods(u);
    u.tx = x;
    if (b.setup.arena && m.boss) {
      // 거대 보스: 오른쪽 절반
      const A = CONFIG.raidArena;
      u.h = A.bossH;
      u.tx = Math.round(b.w * A.bossX);
      u.x = u.tx + 200;
      u.y = A.bossY;
    }
    return u;
  });
  if (b.setup.arena) raidInit(b);
  const p = b.mobs.find((m) => m.mob?.patterns)?.mob?.patterns;
  b.pat = { i: 0, left: p?.[0].every ?? 0, warn: 0, text: '' };
}

export const playAct = (u: Unit, a: Act) => play(u, a);
function play(u: Unit, a: Act) {
  u.act = a;
  u.at = 0;
  const loop = (u.anims[a] ?? u.anims.idle)?.loop;
  u.busy = loop ? 0 : durOf(u.anims, a);
}

// ───────── 피해 · 회복 ─────────
const effAtk = (u: Unit) => {
  let m = 1 + u.mod.atk + sv(u, 'atkUp') - sv(u, 'atkDown');
  const p = specOf(u)?.def.passive.p;
  if (p?.k === 'lowHp' && p.s === 'atk' && u.hp <= u.max * p.at) m += p.v;
  return u.atk * Math.max(0.1, m);
};
const effSpd = (u: Unit) => {
  let m = 1 + u.mod.spd + sv(u, 'spdUp');
  const p = specOf(u)?.def.passive.p;
  if (p?.k === 'lowHp' && p.s === 'spd' && u.hp <= u.max * p.at) m += p.v;
  return m * (has(u, 'slow') ? K.slowRate : 1);
};
function dmgCut(b: Battle, u: Unit) {
  let c = u.mod.dmgCut + sv(u, 'guard');
  const p = specOf(u)?.def.passive.p;
  if (p?.k === 'lowHp' && p.s === 'dmgCut' && u.hp <= u.max * p.at) c += p.v;
  if (u.side === 'hero' && u.hp < u.max * 0.5) for (const h of alive(b.heroes)) if (h.hero!.def.passive.p.k === 'teamLowGuard') c += (h.hero!.def.passive.p as { v: number }).v;
  return Math.min(0.75, c);
}
function burst(b: Battle, x: number, y: number, color: string, n: number, sp = 160) {
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const v = sp * (0.4 + rand());
    b.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, dur: 0.4 + rand() * 0.4, color, size: 2 + rand() * 3 });
  }
}
/** 숫자 놓을 머리 위 (큰 보스는 몸 가운데쯤 — 화면 위로 안 나가게) */
const topOf = (u: Unit) => u.y - (u.mob?.boss ? u.h * 0.45 : u.h);

/**
 * 피해 숫자 놓기 (겹침 해결): 대상 머리 위에서 줄(row) × 좌우 칸(col)을 차례로 보고, 이미 떠 있는 숫자와 안 겹치는 첫 자리에 놓는다.
 *  숫자는 모두 같은 속도로 올라가므로 놓는 순간 안 겹치면 끝까지 안 겹친다. 자리가 다 차면 가장 오래된 숫자를 빨리 지운다.
 */
export function placeNum(b: Battle, x0: number, top: number, v: number, kind: Num['kind'], big: boolean) {
  const N = K.nums;
  // 대상별 가로 흩뿌림 (STAR_PLAN_v2 §1-5): 기준 x를 대상 위 ±scatter 안에서 고른다
  const x = x0 + (rand() * 2 - 1) * N.scatter;
  const size = kind === 'crit' ? T.font.canvas.numCrit : big ? T.font.canvas.numBig : kind === 'hurt' || kind === 'burn' ? T.font.canvas.num * 0.8 : T.font.canvas.num;
  const text = shortNum(v) + (kind === 'heal' ? '+' : '');
  // 글자는 기준선(y) 위로 그려지고 치명타는 그 위에 「치명타」 글자가 더 붙는다 · 튀어나올 때 1.15배까지 커짐
  const w = (text.length * size * 0.62 + 6) * 1.15;
  const hgt = (size + (kind === 'crit' ? T.font.canvas.critLabel + 2 : 0)) * 1.1;
  const rise = (n: Num) => n.t * N.rise;
  const boxes = (cy: number) => b.nums.filter((n) => n.t < N.life - 0.2 && Math.abs(numMid(n) - rise(n) - (cy - hgt / 2)) * 2 < n.hgt + hgt);
  for (let r = 0; r < N.rows; r++) {
    const cy = top - 6 - r * N.rowH;
    // 위쪽 HUD(보스 체력 바)에 안 닿게
    if (cy - hgt < N.minY && r > 0) break;
    const row = boxes(cy);
    // 이 줄에서 안 겹치는 x: 대상 위 → 이미 있는 숫자 옆(왼/오른) 중 가까운 곳 · 너무 멀리(spread) 가지 않게
    const xs = [x, ...row.flatMap((n) => [n.x - (n.w + w) / 2 - 2, n.x + (n.w + w) / 2 + 2])].filter((cx) => Math.abs(cx - x) <= N.spread).sort((a, c) => Math.abs(a - x) - Math.abs(c - x));
    const cx = xs.find((cx) => !row.some((n) => Math.abs(n.x - cx) * 2 < n.w + w));
    if (cx !== undefined) {
      b.nums.push({ x: cx, y: cy, v, kind, t: 0, big, w, hgt });
      return;
    }
  }
  // 다 찼다: 이 근처에서 가장 오래된 것들을 빨리 지우고 맨 아래 줄에
  for (const n of boxes(top - 6)) n.t = Math.max(n.t, N.life - 0.2);
  b.nums.push({ x, y: top - 6, v, kind, t: 0, big, w, hgt });
}
/** 숫자 상자의 세로 가운데 (기준선 y에서 위로 hgt) */
export const numMid = (n: Num) => n.y - n.hgt / 2;
/** 만·억 단위 (킹스레이드 문법: 큰 숫자를 짧게) */
export function shortNum(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(n >= 1e9 ? 1 : 2).replace(/\.?0+$/, '')}억`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(n >= 1e5 ? 1 : 2).replace(/\.?0+$/, '')}만`;
  return Math.round(n).toLocaleString('ko-KR');
}

export function damage(b: Battle, by: Unit, to: Unit, mult: number, o: { crit?: boolean; skill?: boolean; st?: Extract<Eff, { k: 'dmg' }>['st'] } = {}) {
  if (to.dead) return 0;
  const critP = by.crit + by.mod.crit + sv(by, 'critUp');
  const crit = o.crit ?? rand() < critP;
  const atk = effAtk(by);
  let dmg = atk * mult * (crit ? by.critDmg : 1) * (0.92 + rand() * 0.16) * (o.skill ? 1 + by.mod.skillDmg : 1) * (to.mob?.boss ? 1 + by.mod.bossDmg : 1);
  dmg *= 1 - Math.min(K.defMax, to.def / (to.def + K.defK * by.atk));
  dmg *= 1 - dmgCut(b, to);
  if (b.raid && to.mob?.boss && b.raid.downT > 0) dmg *= CONFIG.raidArena.groggy.dmgMult;
  dmg = Math.max(1, Math.round(dmg));
  let left = dmg;
  if (to.shield > 0) {
    const s = Math.min(to.shield, left);
    to.shield -= s;
    left -= s;
  }
  to.hp = Math.max(0, to.hp - left);
  to.taken += dmg;
  to.flash = 1;
  const boss = !!to.mob?.boss;
  to.knock = (crit ? K.knock.crit : K.knock.hit) * (to.side === 'mob' ? 1 : -1) * (boss ? K.bossKnock : 1);
  if (o.st) {
    const { s, dur, v = 0 } = o.st;
    const d = boss && (s === 'stun' || s === 'silence') ? dur * K.bossStun : dur;
    addSt(to, s, d, s === 'burn' ? effAtk(by) * v : v);
  }
  if (by.side === 'hero') {
    b.stats.dealt += dmg;
    by.dealt += dmg;
    if (boss) b.stats.bossDealt += dmg;
    by.mana = Math.min(K.mana.max, by.mana + (o.skill ? K.mana.skillHit : K.mana.hit) * (1 + by.mod.mana));
    burst(b, to.x, to.y - to.h * 0.5, crit ? T.battle.burstCrit : T.battle.white, crit ? 10 : 5);
  } else {
    if (by.pvp) by.mana = Math.min(K.mana.max, by.mana + (o.skill ? K.mana.skillHit : K.mana.hit));
    b.stats.taken += dmg;
    to.mana = Math.min(K.mana.max, to.mana + K.mana.hurt * (1 + to.mod.mana));
    if (to.busy <= 0 || to.act === 'idle') play(to, 'hurt');
  }
  placeNum(b, to.x, topOf(to), dmg, by.side === 'mob' ? 'hurt' : crit ? 'crit' : 'hit', mult >= 2.5 || crit);
  b.stop = Math.max(b.stop, crit ? K.hitstop.crit : K.hitstop.hit);
  if (crit) b.shake = Math.max(b.shake, K.shake.crit);
  b.sounds.push(crit ? 'crit' : 'hit');
  if (b.raid && to.mob?.boss && by.side === 'hero') raidOnHit(b, by, to, dmg, !!o.skill, o.st?.s === 'stun');
  if (to.hp <= 0) kill(b, to);
  return dmg;
}
function kill(b: Battle, u: Unit) {
  u.dead = true;
  u.deadT = 0;
  u.pending = [];
  u.st = {};
  u.shield = 0;
  if (u.side === 'hero') play(u, 'down');
  b.stop = Math.max(b.stop, K.hitstop.kill);
  burst(b, u.x, u.y - u.h * 0.5, T.battle.burstKill, u.mob?.boss ? 60 : 16, u.mob?.boss ? 320 : 180);
  if (u.mob?.boss) {
    b.shake = K.shake.bossKill;
    b.flash = 1;
  }
}
function heal(b: Battle, by: Unit, to: Unit, amt: number) {
  if (to.dead) return;
  const n = Math.round(amt * (1 + by.mod.heal));
  const real = Math.min(n, to.max - to.hp);
  to.hp += real;
  by.healed += real;
  b.stats.healed += real;
  placeNum(b, to.x, topOf(to), n, 'heal', false);
}

/** 가장 앞 구역 / 가장 뒤 구역에 있는 영웅들 */
const frontLine = (hs: Unit[]) => hs.filter((h) => h.zone === Math.min(...hs.map((x) => x.zone)));
const backLine = (hs: Unit[]) => hs.filter((h) => h.zone === Math.max(...hs.map((x) => x.zone)));
const frontMob = (b: Battle) => alive(b.mobs).sort((a, c) => a.x - c.x)[0];
const backMob = (b: Battle) => alive(b.mobs).sort((a, c) => c.x - a.x)[0];
function mobTarget(b: Battle): Unit | undefined {
  const hs = alive(b.heroes);
  const t = hs.find((h) => has(h, 'taunt'));
  if (t) return t;
  const pool = rand() < K.mobFrontBias ? frontLine(hs) : hs;
  return pool[Math.floor(rand() * pool.length)];
}

// ───────── 스킬 ─────────
const foesOf = (b: Battle, u: Unit) => (u.side === 'hero' ? b.mobs : b.heroes);
const friendsOf = (b: Battle, u: Unit) => (u.side === 'hero' ? b.heroes : b.mobs);
export function canCast(b: Battle, u: Unit, i: number) {
  const s = specOf(u)!.def.skills[i];
  const ready = u.side === 'hero' ? alive(b.mobs).some((m) => m.x <= m.tx + 40) : u.x <= u.tx + 1 && alive(b.heroes).length > 0;
  return b.phase === 'fight' && !u.dead && !has(u, 'stun') && !has(u, 'silence') && u.mana >= s.cost && u.scd[i] <= 0 && ready;
}
export function requestSkill(b: Battle, u: Unit, i: number): boolean {
  if (!canCast(b, u, i)) return false;
  if (u.busy > 0 && u.act !== 'hurt') {
    if (!b.queue.some((q) => q.u === u)) b.queue.push({ u, i });
    return true;
  }
  cast(b, u, i, true);
  return true;
}
const allyTargets = (b: Battle, u: Unit, to: string): Unit[] => {
  const hs = alive(friendsOf(b, u));
  if (to === 'self') return [u];
  if (to === 'lowest') return hs.sort((a, c) => a.hp / a.max - c.hp / c.max).slice(0, 1);
  if (to === 'frontAllies') return frontLine(hs);
  return hs;
};
const foeTargets = (b: Battle, u: Unit, to: string): Unit[] => {
  const ms = alive(foesOf(b, u));
  if (!ms.length) return [];
  if (to === 'all') return ms;
  if (to === 'random') return [ms[Math.floor(rand() * ms.length)]];
  if (u.side === 'hero') return [to === 'back' ? backMob(b) : frontMob(b)];
  // 결투장 상대 영웅이 우리 편을 노림: 앞 = 가장 앞 위치(오른쪽) · 뒤 = 가장 뒤 위치
  const line = to === 'back' ? backLine(ms) : frontLine(ms);
  return [line.sort((a, c) => (to === 'back' ? a.x - c.x : c.x - a.x))[0]];
};
function hitFx(b: Battle, u: Unit, s: SkillDef, m: Unit, k: number) {
  const color = elemColor(s.elem);
  const fx = (f: Omit<Fx, 't'>) => b.fx.push({ ...f, t: 0 });
  const y = m.y - m.h * 0.55;
  switch (s.vfx) {
    case 'slash':
      fx({ kind: 'slash', x: m.x, y, color, dur: 0.32, r: k % 2 ? 1 : -1 });
      break;
    case 'smash':
      fx({ kind: 'pillar', x: m.x, y: m.y, color, dur: 0.55, r: 50 });
      fx({ kind: 'slam', x: m.x, y: m.y, color, dur: 0.55, r: 140 });
      b.shake = Math.max(b.shake, K.shake.smash);
      b.flash = Math.max(b.flash, 0.5);
      break;
    case 'pierce':
      fx({ kind: 'beam', x: u.x + 20, y: u.y - u.h * 0.5, x2: m.x + 60, y2: y, color, dur: 0.45 });
      b.flash = Math.max(b.flash, 0.6);
      break;
    case 'bolt':
      fx({ kind: 'bolt', x: u.x + 26, y: u.y - u.h * 0.65, x2: m.x, y2: y, color, dur: 0.25 });
      fx({ kind: 'burst', x: m.x, y, color, dur: 0.35, r: 34 });
      break;
    case 'meteor':
      fx({ kind: 'star', x: m.x + (rand() - 0.5) * 40, y, color, dur: 0.55, r: 55 });
      b.shake = Math.max(b.shake, K.shake.meteor);
      break;
    case 'ring':
      fx({ kind: 'ring', x: m.x, y: m.y, color, dur: 0.7, r: 60 });
      break;
    default:
      fx({ kind: 'burst', x: m.x, y, color, dur: 0.5, r: 60 });
  }
}
function allyFx(b: Battle, s: SkillDef, t: Unit, e: Eff) {
  const color = elemColor(s.elem);
  const kind: FxKind = e.k === 'shield' || s.vfx === 'shield' ? 'shield' : e.k === 'regen' || s.vfx === 'heal' ? 'heal' : e.k === 'taunt' ? 'ring' : 'pillar';
  b.fx.push({ kind, x: t.x, y: kind === 'ring' ? t.y : kind === 'pillar' ? t.y : t.y - t.h * 0.5, color, t: 0, dur: 0.85, r: kind === 'ring' ? 110 : kind === 'pillar' ? 24 : 50 });
}
function cast(b: Battle, u: Unit, i: number, manual = false) {
  const h = specOf(u)!;
  const s = h.def.skills[i];
  u.mana -= s.cost;
  u.scd[i] = s.cd;
  const p = h.def.passive.p;
  if (p.k === 'onCast') u.mana = Math.min(K.mana.max, u.mana + p.mana);
  b.stats.skills++;
  if (u.side === 'hero' && !u.ai && (b.cutIns === 'all' || (b.cutIns === 'big' && (manual || i === 2)))) b.cut = { u, skill: s, t: 0 };
  b.sounds.push(JOBS[h.def.job].sfx);
  play(u, s.act);
  if (i === 2 && u.side === 'hero') raidUltZoom(b, u);
  u.trail = durOf(u.anims, s.act);
  const times = hitTimes(u.anims, s.act);
  const at0 = u.at;
  /** 스킬 레벨 배수 (피해·회복·보호막) */
  const lvM = 1 + CONFIG.growth.skill.perLv * ((h.st.skillLv?.[i] ?? 1) - 1);
  for (const e of s.eff) {
    if (e.k === 'dmg') {
      const n = e.n ?? 1;
      for (let k = 0; k < n; k++) {
        const at = k < times.length ? times[k] : times[times.length - 1] + (k - times.length + 1) * 0.16;
        u.pending.push({
          at: at0 + at,
          fn: () => {
            for (const m of foeTargets(b, u, e.to)) {
              hitFx(b, u, s, m, k);
              damage(b, u, m, e.m * lvM, { crit: e.crit, skill: true, st: e.st });
            }
          },
        });
      }
      continue;
    }
    u.pending.push({
      at: at0 + times[0],
      fn: () => {
        if (u.dead) return;
        const atk = effAtk(u);
        if (e.k === 'taunt') {
          addSt(u, 'taunt', e.dur);
          allyFx(b, s, u, e);
          return;
        }
        for (const t of allyTargets(b, u, e.to)) {
          if (e.k === 'heal') heal(b, u, t, atk * e.m * lvM);
          else if (e.k === 'regen') addSt(t, 'regen', e.dur, atk * e.m * lvM * (1 + u.mod.heal));
          else if (e.k === 'shield') t.shield += Math.round(atk * e.m * lvM);
          else if (e.k === 'buff') addSt(t, e.s, e.dur, e.v);
          else if (e.k === 'mana') t.mana = Math.min(K.mana.max, t.mana + e.v);
          allyFx(b, s, t, e);
        }
      },
    });
  }
}

/** 스킬 성격 (AUTO 판단) */
const healish = (s: SkillDef) => s.eff.some((e) => e.k === 'heal' || e.k === 'regen');
/** AUTO: 고를 만한 스킬 — 회복 스킬은 다친 아군이 있을 때만, 나머지는 큰 것부터 */
export function autoPick(b: Battle, u: Unit): number {
  const hs = alive(friendsOf(b, u));
  const hurt = hs.filter((x) => x.hp < x.max * K.autoHealAt).length;
  for (const i of [2, 1, 0]) {
    if (!canCast(b, u, i)) continue;
    const s = specOf(u)!.def.skills[i];
    if (healish(s)) {
      const all = s.eff.some((e) => (e.k === 'heal' || e.k === 'regen') && e.to === 'allies');
      if (all ? hurt >= 2 : hurt >= 1) return i;
      continue;
    }
    return i;
  }
  return -1;
}

// ───────── 보스 패턴 ─────────
function bossStrike(b: Battle, boss: Unit, P: BossPattern) {
  const hs = alive(b.heroes);
  const targets = P.to === 'back' ? backLine(hs) : P.to === 'front' ? frontLine(hs) : hs;
  play(boss, 'attack');
  for (const h of targets) {
    damage(b, boss, h, P.mult);
    if (P.st) addSt(h, P.st.s, P.st.dur);
  }
  const x0 = Math.min(...targets.map((h) => h.x));
  if (P.key === 'beam' || P.key === 'focus') b.fx.push({ kind: 'beam', x: boss.x - 40, y: boss.y - boss.h * 0.72, x2: x0 - 40, y2: 270, color: T.battle.bossBeam, t: 0, dur: 0.6 });
  else b.fx.push({ kind: 'slam', x: (x0 + Math.max(...targets.map((h) => h.x))) / 2, y: 300, color: T.battle.bossSlam, t: 0, dur: 0.7, r: 260 });
  b.shake = K.shake.boss;
  b.flash = 0.7;
}

// ───────── 한 걸음 ─────────
export function step(b: Battle, dtReal: number) {
  b.sounds.length = 0;
  let dt = dtReal * b.speed;
  if (b.cut) {
    b.cut.t += dtReal;
    if (b.cut.t >= K.cutInSec) b.cut = null;
    else dt *= K.cutInSlow;
  }
  // 협공 컷인 · 페이즈 전환 중에는 느리게
  if (b.raid && ((b.raid.duo && b.raid.duo.t < 1.1) || b.raid.phaseT > 0)) dt *= CONFIG.combat.cutInSlow;
  b.shake = Math.max(0, b.shake - dtReal * 30);
  b.flash = Math.max(0, b.flash - dtReal * 3);
  for (const n of b.nums) n.t += dtReal;
  b.nums = b.nums.filter((n) => n.t < K.nums.life);
  for (const s of b.says) s.t += dtReal;
  b.says = b.says.filter((s) => s.t < s.dur);
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
  if ((b.phase === 'fight' || b.phase === 'walk') && b.stats.time >= b.setup.limit) {
    b.phase = b.setup.timeUp === 'win' ? 'win' : 'lose';
    b.why = 'time';
    return;
  }

  for (const u of [...b.heroes, ...b.mobs]) {
    u.at += dt * (has(u, 'slow') ? K.slowRate : 1);
    u.flash = Math.max(0, u.flash - dt * K.hitFlash.fade);
    u.knock *= Math.pow(0.0005, dt);
    u.trail = Math.max(0, u.trail - dt);
    for (const k of Object.keys(u.st) as StatusKey[]) u.st[k]!.t = Math.max(0, u.st[k]!.t - dt);
    for (let i = 0; i < 3; i++) u.scd[i] = Math.max(0, u.scd[i] - dt);
    if (!u.dead && has(u, 'regen')) u.hp = Math.min(u.max, u.hp + u.st.regen!.v * dt);
    if (!u.dead && has(u, 'burn')) {
      u.burnAcc += u.st.burn!.v * dt;
      if (u.burnAcc >= u.max * 0.002 || u.st.burn!.t <= dt) {
        const n = Math.round(u.burnAcc);
        u.burnAcc = 0;
        u.hp = Math.max(0, u.hp - n);
        b.stats.dealt += n;
        if (u.mob?.boss) b.stats.bossDealt += n;
        if (n > 0 && rand() < 0.35) placeNum(b, u.x, topOf(u), n, 'burn', false);
        if (u.hp <= 0) kill(b, u);
      }
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
    b.scroll += K.walkScroll * dt;
    b.walkLeft -= dt;
    if (b.walkLeft <= 0) {
      spawnWave(b);
      b.phase = 'fight';
      for (const h of alive(b.heroes)) if (h.act === 'walk') ((h.act = 'idle'), (h.at = 0));
    }
    return;
  }
  if (b.phase !== 'fight') return;

  for (const m of alive(b.mobs)) if (m.x > m.tx) m.x = Math.max(m.tx, m.x - K.mobEnter * dt);
  const arrived = (m: Unit) => m.x <= m.tx + 1;

  for (const h of alive(b.heroes)) {
    h.mana = Math.min(K.mana.max, h.mana + K.mana.regen * (1 + h.mod.mana) * dt);
    const q = b.queue.find((x) => x.u === h);
    if (q && h.busy <= 0) {
      b.queue = b.queue.filter((x) => x !== q);
      if (canCast(b, h, q.i)) cast(b, h, q.i, true);
    }
    if ((b.auto || h.autoOn || h.ai) && h.busy <= 0 && !b.cut) {
      const i = autoPick(b, h);
      if (i >= 0) cast(b, h, i);
    }
  }
  const ready = (u: Unit) => !u.dead && u.busy <= 0 && !has(u, 'stun') && (u.side === 'hero' || arrived(u));
  for (const h of b.heroes) {
    if (!ready(h)) continue;
    h.cd -= dt * effSpd(h);
    if (h.cd > 0) continue;
    const t = frontMob(b);
    if (!t || !arrived(t)) continue;
    h.cd = h.rate;
    play(h, 'attack');
    const ranged = CONFIG.jobs[h.hero!.def.job].ranged;
    const color = elemColor(h.hero!.def.elem);
    for (const at of hitTimes(h.anims, 'attack').slice(0, 1))
      h.pending.push({
        at: h.at + at,
        fn: () => {
          if (t.dead) return;
          const ty = t.y - t.h * 0.55;
          if (ranged) b.fx.push({ kind: 'bolt', x: h.x + 26, y: h.y - h.h * 0.62, x2: t.x, y2: ty, color, t: 0, dur: 0.22 });
          else b.fx.push({ kind: 'slash', x: t.x, y: ty, color: T.battle.white, t: 0, dur: 0.22, r: 1 });
          damage(b, h, t, 1);
        },
      });
  }
  // 결투장 상대 영웅: 마나가 차고 스킬을 씀 (우리 AUTO와 같은 판단)
  for (const m of alive(b.mobs)) {
    if (!m.pvp || !arrived(m)) continue;
    m.mana = Math.min(K.mana.max, m.mana + K.mana.regen * (1 + m.mod.mana) * dt);
    if (m.busy <= 0 && !b.cut) {
      const i = autoPick(b, m);
      if (i >= 0) cast(b, m, i);
    }
  }
  const boss = alive(b.mobs).find((m) => m.mob?.boss);
  for (const m of b.mobs) {
    if (!ready(m)) continue;
    if (m === boss && b.pat.warn > 0) continue;
    m.cd -= dt * (has(m, 'slow') ? K.slowRate : 1);
    if (m.cd > 0) continue;
    m.cd = m.rate;
    const t = mobTarget(b);
    if (!t) break;
    play(m, 'attack');
    for (const at of hitTimes(m.anims, 'attack').slice(0, 1)) m.pending.push({ at: m.at + at, fn: () => damage(b, m, t, 1) });
  }
  // 보스 전장: 줄 경고·부위·그로기·페이즈 (raid.ts)
  if (b.raid) raidStep(b, dt, dtReal);
  // 보스 패턴 (경고 한 줄 → 쾅) · 침묵·기절이면 이번 패턴은 불발
  const pats = boss?.mob?.patterns;
  if (!b.raid && boss && pats?.length && arrived(boss)) {
    const P = pats[b.pat.i % pats.length];
    if (b.pat.warn > 0) {
      b.pat.warn -= dt;
      if (b.pat.warn <= 0) {
        b.pat.text = '';
        if (!has(boss, 'stun') && !has(boss, 'silence')) bossStrike(b, boss, P);
        b.pat.i++;
        b.pat.left = pats[b.pat.i % pats.length].every;
      }
    } else if ((b.pat.left -= dt) <= 0) {
      b.pat.warn = P.warn;
      b.pat.text = P.text.replace('{boss}', boss.name);
    }
  }

  if (!alive(b.heroes).length) {
    b.phase = 'lose';
    b.why = 'wipe';
    return;
  }
  if (!alive(b.mobs).length && b.mobs.every((m) => m.deadT > 0.6)) {
    if (b.wave >= b.setup.waves.length - 1) {
      b.phase = 'win';
      for (const h of alive(b.heroes)) play(h, 'win');
    } else {
      b.phase = 'walk';
      b.walkLeft = K.walkGap;
      b.queue = [];
    }
  }
}

/** 별 3개 평가: 클리어 1 · 아무도 안 쓰러짐 +1 · 시간 안 +1 */
export function starsOf(b: Battle): number {
  if (b.phase !== 'win') return 0;
  return 1 + (b.heroes.every((h) => !h.dead) ? 1 : 0) + (b.stats.time <= b.setup.starTime ? 1 : 0);
}
export const mvpOf = (b: Battle) => [...b.heroes].sort((a, c) => c.dealt + c.healed * 0.5 - (a.dealt + a.healed * 0.5))[0];
export const partyDps = (b: Battle) => b.stats.dealt / Math.max(1, b.stats.time);

/** 전투 전 대사 중: 그림만 숨 쉬게 (진행·시간은 멈춤) */
export function idleStep(b: Battle, dt: number) {
  for (const u of b.heroes) u.at += dt;
}
