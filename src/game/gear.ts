// 장비 · 룬 (SPEC §10 전부): 드롭 · 기본 능력 · 강화(+10, 파괴 없음, 「체크인」 확률) · 별 올리기(실패 보정) · 티어 · 옵션 바꾸기 · 룬 장착·합성
//  · 소프트캡 · 전수 · 판매/분해 · 잠금 · 장비 소환(1회·10+1·하루 무료) · 제작 · 장착/해제/자동 장착 · 가방 칸
import { CONFIG } from '../config';
import { JOBS } from '../data/jobs';
import { heroOf } from '../data/heroes';
import { addCur, dayKey, GEAR_SLOTS, S, spend, track, type Gear, type GearSlot, type Item, type Rune, type Save } from './state';

const G = CONFIG.gear;
const R = CONFIG.rune;
export type Part = Gear['part'];
export const PARTS: Part[] = ['weapon', 'armor', 'acc'];
export const PART_NAME: Record<Part, string> = { weapon: '무기', armor: '갑옷', acc: '장신구' };
export const SLOT_PART: Record<GearSlot, Part> = { weapon: 'weapon', armor: 'armor', acc1: 'acc', acc2: 'acc' };
export const gradeName = (g: number) => G.grades[g]?.name ?? '?';
export const RUNE_GRADE = ['일반', '고급', '희귀', '영웅', '전설', '고대'];

const pick = <X>(xs: X[], rnd: () => number) => xs[Math.floor(rnd() * xs.length)];
function weighted(ws: number[], rnd: () => number) {
  const sum = ws.reduce((a, b) => a + b, 0);
  let r = rnd() * sum;
  for (let i = 0; i < ws.length; i++) if ((r -= ws[i]) < 0) return i;
  return ws.length - 1;
}
export const bagUsed = (s: Save = S) => Object.keys(s.items).length;
export const bagFull = (s: Save = S) => bagUsed(s) >= s.bagSize;
export const gearOf = (uid: number | null | undefined, s: Save = S) => (uid != null && s.items[uid]?.kind === 'gear' ? (s.items[uid] as Gear) : null);
export const runeOf = (uid: number | null | undefined, s: Save = S) => (uid != null && s.items[uid]?.kind === 'rune' ? (s.items[uid] as Rune) : null);
function add(it: Item, s: Save) {
  s.items[it.uid] = it;
}

// ───────── 만들기 ─────────
function rollOpt(grade: number, rnd: () => number, not: string[] = []) {
  const keys = Object.keys(G.opts).filter((k) => !not.includes(k));
  const k = pick(keys, rnd);
  const o = G.opts[k];
  const v = (o.min + (o.max - o.min) * rnd()) * (0.8 + G.grades[grade].mult * 0.2);
  return { k, v: Math.round(v * 1000) / 1000 };
}
// ───────── 모양(종류) ─────────
const TY = G.types;
const jobOf = (id: string) => heroOf(id)?.job ?? 'knight';
/** 이 영웅이 낄 수 있는 모양인가 (무기만 직업 전용) */
export const fitsHero = (g: Gear, id: string) => g.part !== 'weapon' || !g.type || g.type === TY.weaponOf[jobOf(id)];
/** 갑옷 계열이 맞으면 기본 능력 보너스 */
export const armorMatch = (g: Gear, id: string) => g.part === 'armor' && g.type === TY.armorOf[jobOf(id)];
export const typeName = (g: Gear) => (g.type ? TY.name[g.type] : undefined) ?? PART_NAME[g.part];
/** 새 장비 모양: partyBias 확률로 파티 영웅 하나의 직업에 맞춤 · 아니면 그 부위 모양 중 아무거나 */
export function rollType(part: Part, s: Save, rnd: () => number): string {
  if (part === 'acc') return pick(TY.acc, rnd);
  const table = part === 'weapon' ? TY.weaponOf : TY.armorOf;
  const party = s.party.filter((id) => s.heroes[id]);
  if (party.length && rnd() < TY.partyBias) return table[jobOf(pick(party, rnd))];
  return pick([...new Set(Object.values(table))], rnd);
}
export function makeGear(part: Part, grade: number, ilv: number, s: Save = S, rnd: () => number = Math.random, type?: string): Gear {
  const opts: Gear['opts'] = [];
  for (let i = 0; i < G.grades[grade].opts; i++) opts.push(rollOpt(grade, rnd, opts.map((o) => o.k)));
  return { uid: s.nextUid++, kind: 'gear', part, type: type ?? rollType(part, s, rnd), grade, ilv: Math.max(0, Math.round(ilv)), star: 1, tier: 1, enh: 0, pity: 0, starPity: 0, opts, runes: Array(G.grades[grade].runes).fill(null), lock: false, by: null };
}
export function makeRune(grade: number, s: Save = S, rnd: () => number = Math.random): Rune {
  return { uid: s.nextUid++, kind: 'rune', grade, stat: pick(R.kinds, rnd), lock: false, in: null };
}
/** 스테이지 드롭 (가방이 가득이면 null) */
export function dropGear(ilv: number, diff: number, s: Save = S, rnd: () => number = Math.random): Gear | null {
  if (rnd() >= G.drop.chance || bagFull(s)) return null;
  const g = makeGear(pick(PARTS, rnd), weighted(G.drop.weights[diff] ?? G.drop.weights[0], rnd), ilv, s, rnd);
  add(g, s);
  return g;
}

// ───────── 능력 ─────────
/** 장비 기본 능력 (공격·체력·방어 정수) */
export function gearBase(g: Gear): Record<string, number> {
  const m = G.grades[g.grade].mult * Math.pow(G.grow, g.ilv) * (1 + G.starStat * (g.star - 1)) * (1 + G.tierStat * (g.tier - 1)) * (1 + G.enhStat * enhEff(g.enh));
  return Object.fromEntries(Object.entries(G.base[g.part]).map(([k, v]) => [k, Math.round(v * m)]));
}
export const runeValue = (r: Rune) => R.value[r.grade] ?? 0;
/** 장비 하나가 주는 것: 기본(정수) + 옵션·룬(퍼센트) */
export function gearStats(g: Gear, s: Save = S) {
  const flat = gearBase(g);
  const pct: Record<string, number> = {};
  for (const o of g.opts) pct[o.k] = (pct[o.k] ?? 0) + o.v;
  for (const u of g.runes) {
    const r = runeOf(u, s);
    if (r) pct[r.stat] = (pct[r.stat] ?? 0) + runeValue(r);
  }
  return { flat, pct };
}
export const gearPower = (g: Gear) => {
  const b = gearBase(g);
  return Math.round((b.atk ?? 0) * CONFIG.power.atkW + (b.hp ?? 0) * CONFIG.power.hpW + (b.def ?? 0) * CONFIG.power.defW) + g.opts.length * 50 * (g.grade + 1);
};
export const optText = (o: { k: string; v: number }) => `${G.opts[o.k]?.name ?? o.k} +${(o.v * 100).toFixed(1)}%`;
export const gearName = (g: Gear) => `${gradeName(g.grade)} ${typeName(g)}`;

// ───────── 강화 (긴 사다리 +0~+max · 구간마다 외형 · 파괴 없음 · B 보강 §1) ─────────
const E = G.enhance;
/** 구간 (0 = +0~+9 · 1 = +10~+19 …) — 테두리 빛·연출 단계 */
export const enhBand = (n: number) => Math.min(E.bandEff.length, Math.floor(n / E.band));
/** 소프트캡: 강화 n이 실제로 주는 단계 (구간마다 bandEff) */
export function enhEff(n: number) {
  let v = 0;
  for (let i = 0; i < n; i++) v += E.bandEff[Math.min(E.bandEff.length - 1, Math.floor(i / E.band))];
  return v;
}
export const enhCost = (g: Gear) => ({ stones: E.stones * (g.enh + 1), gold: Math.round(E.gold * Math.pow(g.enh + 1, E.goldPow) * (g.grade + 1)) });
export const enhBase = (n: number) => (n >= E.max ? 0 : E.end + (E.start - E.end) * Math.pow(1 - n / E.max, E.curve));
export const enhRate = (g: Gear) => Math.min(1, enhBase(g.enh) + g.pity);
export type EnhResult = 'max' | 'poor' | 'great' | 'ok' | 'fail' | 'drop';
export function enhance(g: Gear, s: Save = S, rnd: () => number = Math.random): EnhResult {
  if (g.enh >= E.max) return 'max';
  const c = enhCost(g);
  if ((s.cur.enh ?? 0) < c.stones || (s.cur.gold ?? 0) < c.gold) return 'poor';
  addCur('enh', -c.stones, s);
  addCur('gold', -c.gold, s);
  track('enh', 1, s);
  if (rnd() < enhRate(g)) {
    // 대성공(+2)은 구간 경계를 못 넘음 (경계 돌파는 따로 연출)
    const great = enhBand(g.enh + 2) === enhBand(g.enh) && g.enh + 2 <= E.max && rnd() < E.great;
    g.enh += great ? 2 : 1;
    g.pity = 0;
    return great ? 'great' : 'ok';
  }
  g.pity += E.pity;
  // 실패 −1: +dropFrom부터 · 구간 바닥(+10·+20…) 아래로는 안 떨어짐
  if (g.enh + 1 >= E.dropFrom && g.enh % E.band !== 0 && rnd() < E.dropChance) {
    g.enh--;
    return 'drop';
  }
  return 'fail';
}

// ───────── 별 올리기 (같은 부위·같은 등급 먹이기 · 실패 보정) ─────────
export const starRate = (g: Gear) => (g.star >= 5 ? 0 : Math.min(1, G.starUp.rates[g.star - 1] + g.starPity));
export const feedable = (g: Gear, s: Save = S) => Object.values(s.items).filter((x): x is Gear => x.kind === 'gear' && x.uid !== g.uid && x.part === g.part && x.grade === g.grade && !x.lock && !x.by);
export function starUp(g: Gear, food: Gear, s: Save = S, rnd: () => number = Math.random): 'max' | 'poor' | 'bad' | 'ok' | 'fail' {
  if (g.star >= 5) return 'max';
  if (food.uid === g.uid || food.part !== g.part || food.grade !== g.grade || food.lock || food.by) return 'bad';
  const gold = G.starUp.gold[g.star - 1];
  if (!spend('gold', gold, s)) return 'poor';
  removeItem(food.uid, s);
  if (rnd() < starRate(g)) {
    g.star++;
    g.starPity = 0;
    return 'ok';
  }
  g.starPity += G.starUp.rates[g.star - 1] * G.starUp.pityMult;
  return 'fail';
}
// ───────── 티어 (5성 뒤 · 레이드 재료) ─────────
export const tierCost = (g: Gear) => ({ mats: G.tier.mats[g.tier - 1], gold: G.tier.gold[g.tier - 1] });
export function tierUp(g: Gear, s: Save = S): 'max' | 'star' | 'poor' | 'ok' {
  if (g.tier >= G.tier.max) return 'max';
  if (g.star < 5) return 'star';
  const c = tierCost(g);
  if ((s.cur.tierMat ?? 0) < c.mats || (s.cur.gold ?? 0) < c.gold) return 'poor';
  addCur('tierMat', -c.mats, s);
  addCur('gold', -c.gold, s);
  g.tier++;
  return 'ok';
}
// ───────── 옵션 바꾸기 (한 줄 · 기존 vs 새 옵션 고르기) ─────────
export function rerollRoll(g: Gear, line: number, s: Save = S, rnd: () => number = Math.random) {
  if (!spend('optTicket', G.reroll.tickets, s)) return null;
  return rollOpt(g.grade, rnd, g.opts.filter((_, i) => i !== line).map((o) => o.k));
}
export const rerollKeep = (g: Gear, line: number, o: { k: string; v: number }) => (g.opts[line] = o);

// ───────── 룬 ─────────
export function socket(g: Gear, idx: number, r: Rune | null, s: Save = S): boolean {
  if (idx < 0 || idx >= g.runes.length) return false;
  const old = runeOf(g.runes[idx], s);
  if (old) old.in = null;
  if (r) {
    if (r.in != null) {
      const from = gearOf(r.in, s);
      if (from) from.runes = from.runes.map((u) => (u === r.uid ? null : u));
    }
    r.in = g.uid;
  }
  g.runes[idx] = r?.uid ?? null;
  return true;
}
/** 합성: 같은 등급 룬 fuse개 (안 꽂히고 안 잠긴 것) → 다음 등급 1개 */
export function fuseRunes(grade: number, s: Save = S, rnd: () => number = Math.random): Rune | null {
  if (grade >= R.value.length - 1) return null;
  const pool = Object.values(s.items).filter((x): x is Rune => x.kind === 'rune' && x.grade === grade && x.in == null && !x.lock);
  if (pool.length < R.fuse) return null;
  if (!spend('gold', R.fuseGold[grade], s)) return null;
  for (const r of pool.slice(0, R.fuse)) delete s.items[r.uid];
  const r = makeRune(grade + 1, s, rnd);
  add(r, s);
  return r;
}

// ───────── 전수 (「체크인」 웅스 건의 그대로) ─────────
export function transferPreview(from: Gear, to: Gear) {
  if (from.uid === to.uid || from.part !== to.part || from.enh < G.transfer.minEnh) return null;
  const drop = G.transfer.gradeDrop[Math.min(2, Math.max(0, from.grade - to.grade))];
  const lv = Math.max(to.enh, from.enh - drop);
  return { lv, gold: G.transfer.gold * lv * lv };
}
export function transfer(from: Gear, to: Gear, s: Save = S): boolean {
  const p = transferPreview(from, to);
  if (!p || from.lock || !spend('gold', p.gold, s)) return false;
  to.enh = p.lv;
  removeItem(from.uid, s);
  return true;
}

// ───────── 판매 · 분해 · 잠금 · 가방 ─────────
export function removeItem(uid: number, s: Save = S) {
  const it = s.items[uid];
  if (!it) return;
  if (it.kind === 'gear') {
    if (it.by) unequip(it.by, slotOf(it, s)!, s);
    for (const u of it.runes) {
      const r = runeOf(u, s);
      if (r) r.in = null;
    }
  } else if (it.in != null) {
    const g = gearOf(it.in, s);
    if (g) g.runes = g.runes.map((u) => (u === uid ? null : u));
  }
  delete s.items[uid];
}
/** 일괄 판매/분해: 등급 maxGrade 이하 · 안 잠김 · 안 낀 장비 → 금화 / 강화석 */
export function bulk(mode: 'sell' | 'salvage', maxGrade: number, s: Save = S) {
  let n = 0;
  let got = 0;
  for (const it of Object.values(s.items)) {
    if (it.kind !== 'gear' || it.lock || it.by || it.grade > maxGrade) continue;
    got += mode === 'sell' ? G.sell[it.grade] : G.salvage[it.grade];
    removeItem(it.uid, s);
    n++;
  }
  addCur(mode === 'sell' ? 'gold' : 'enh', got, s);
  return { n, got };
}
export function expandBag(s: Save = S): boolean {
  if (s.bagSize >= G.bag.max || !spend('stardust', G.bag.dust, s)) return false;
  s.bagSize = Math.min(G.bag.max, s.bagSize + G.bag.step);
  return true;
}
export type SortKey = 'grade' | 'power' | 'enh' | 'part';
export function sortedGear(key: SortKey, s: Save = S): Gear[] {
  const gs = Object.values(s.items).filter((x): x is Gear => x.kind === 'gear');
  const f: Record<SortKey, (g: Gear) => number> = { grade: (g) => g.grade * 1e6 + gearPower(g), power: gearPower, enh: (g) => g.enh * 1e6 + gearPower(g), part: (g) => -PARTS.indexOf(g.part) * 1e6 + gearPower(g) };
  return gs.sort((a, b) => f[key](b) - f[key](a));
}

// ───────── 소환 · 제작 ─────────
export const freeSummonLeft = (s: Save = S, now = Date.now()) => (s.shop.freeDay === dayKey(now) ? 0 : G.summon.freePerDay);
/** 장비 소환: 1회 / 10+1회 · 하루 무료 1회 (게임 재화만) · 장비 레벨 = 깬 가장 높은 스테이지 근처 */
export function summon(n: 1 | 11, ilv: number, s: Save = S, rnd: () => number = Math.random, now = Date.now()): Gear[] | 'poor' | 'full' {
  if (bagUsed(s) + n > s.bagSize) return 'full';
  const free = n === 1 && freeSummonLeft(s, now) > 0;
  if (free) s.shop.freeDay = dayKey(now);
  else if (!spend('stardust', n === 1 ? G.summon.one : G.summon.ten, s)) return 'poor';
  track('summon', n, s, now);
  const out: Gear[] = [];
  for (let i = 0; i < n; i++) {
    const g = makeGear(pick(PARTS, rnd), weighted(G.summon.weights, rnd), ilv, s, rnd);
    add(g, s);
    out.push(g);
  }
  return out;
}
export function craft(part: Part, ilv: number, s: Save = S, rnd: () => number = Math.random): Gear | 'poor' | 'full' {
  if (bagFull(s)) return 'full';
  if ((s.cur.enh ?? 0) < G.craft.stones || (s.cur.gold ?? 0) < G.craft.gold) return 'poor';
  addCur('enh', -G.craft.stones, s);
  addCur('gold', -G.craft.gold, s);
  const g = makeGear(part, G.craft.grade, ilv, s, rnd);
  add(g, s);
  return g;
}

// ───────── 장착 ─────────
export const slotOf = (g: Gear, s: Save = S): GearSlot | null => (g.by ? (GEAR_SLOTS.find((k) => s.heroes[g.by!]?.gear[k] === g.uid) ?? null) : null);
export function equip(id: string, slot: GearSlot, g: Gear, s: Save = S): boolean {
  if (SLOT_PART[slot] !== g.part || !s.heroes[id] || !fitsHero(g, id)) return false;
  if (g.by) unequip(g.by, slotOf(g, s)!, s);
  unequip(id, slot, s);
  s.heroes[id].gear[slot] = g.uid;
  g.by = id;
  return true;
}
export function unequip(id: string, slot: GearSlot, s: Save = S) {
  const h = s.heroes[id];
  const g = gearOf(h?.gear[slot], s);
  if (g) g.by = null;
  if (h) h.gear[slot] = null;
}
export const unequipAll = (id: string, s: Save = S) => GEAR_SLOTS.forEach((k) => unequip(id, k, s));
/** 자동 장착: 칸마다 안 낀 장비 중 장비 전투력이 가장 높은 것 (지금 낀 것보다 좋을 때만) */
export function autoEquip(id: string, s: Save = S): number {
  let n = 0;
  for (const slot of GEAR_SLOTS) {
    const cur = gearOf(s.heroes[id].gear[slot], s);
    const best = Object.values(s.items)
      .filter((x): x is Gear => x.kind === 'gear' && x.part === SLOT_PART[slot] && !x.by && fitsHero(x, id))
      .sort((a, b) => gearPower(b) * (armorMatch(b, id) ? 1 + TY.armorMatch : 1) - gearPower(a) * (armorMatch(a, id) ? 1 + TY.armorMatch : 1))[0];
    if (best && (!cur || gearPower(best) > gearPower(cur))) {
      equip(id, slot, best, s);
      n++;
    }
  }
  return n;
}
/** 직업별 무기 이름 (장비 이름 보조) */
export const weaponFor = (id: string) => JOBS[heroOf(id).job].weapon;
