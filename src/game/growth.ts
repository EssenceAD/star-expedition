// 영웅 성장 (STAR_PLAN_v2 §2): 각성(레벨 상한) · 별(1~5성) · 스킬 레벨 · 초월(단계마다 특성 2택) · 경험치 물약 · 전용 무기(조각) · 전용 보물(자리)
import { CONFIG } from '../config';
import { addExp, levelCap } from './heroes';
import { addCur, news, S, spend, track, type Save } from './state';
import { heroOf } from '../data/heroes';

const GR = CONFIG.growth;
/** 초월 특성: 단계마다 둘 중 하나 (빌드 분기) — 값은 능력 보정 비율 */
export const TRAITS: [Trait, Trait][] = [
  [{ k: 'atk', v: 0.08, name: '날 선 의지 (공격력 +8%)' }, { k: 'hp', v: 0.12, name: '단단한 몸 (체력 +12%)' }],
  [{ k: 'crit', v: 0.05, name: '약점 간파 (치명타 +5%)' }, { k: 'def', v: 0.12, name: '철벽 (방어력 +12%)' }],
  [{ k: 'skillDmg', v: 0.1, name: '별빛 기술 (스킬 피해 +10%)' }, { k: 'heal', v: 0.1, name: '따뜻한 손 (회복량 +10%)' }],
  [{ k: 'mana', v: 0.15, name: '마력 샘 (마나 회복 +15%)' }, { k: 'spd', v: 0.08, name: '바람 걸음 (공격 속도 +8%)' }],
  [{ k: 'bossDmg', v: 0.12, name: '거인 사냥꾼 (보스 피해 +12%)' }, { k: 'dmgCut', v: 0.08, name: '흔들림 없음 (받는 피해 −8%)' }],
];
export interface Trait {
  k: string;
  v: number;
  name: string;
}
type R = 'ok' | 'poor' | 'max' | 'need';

// ───────── 각성: 레벨이 상한일 때 · 상한이 한 단계 오름 ─────────
export const awakenCost = (aw: number) => ({ stones: GR.awaken.stones[aw], gold: GR.awaken.gold[aw] });
export function awaken(id: string, s: Save = S): R {
  const h = s.heroes[id];
  if (h.awaken >= GR.awaken.stones.length) return 'max';
  if (h.lv < levelCap(id, s)) return 'need';
  const c = awakenCost(h.awaken);
  if ((s.cur.awakenStone ?? 0) < c.stones || (s.cur.gold ?? 0) < c.gold) return 'poor';
  addCur('awakenStone', -c.stones, s);
  addCur('gold', -c.gold, s);
  h.awaken++;
  track('awaken', 1, s);
  if (h.awaken >= GR.awaken.stones.length) news(`${s.acc.name}님의 ${heroOf(id).name}, 최대 각성!`, s);
  return 'ok';
}
// ───────── 별 ─────────
export const heroStarCost = (st: number) => ({ dust: GR.star.dust[st - 1], gold: GR.star.gold[st - 1] });
export function heroStarUp(id: string, s: Save = S): R {
  const h = s.heroes[id];
  if (h.star >= 5) return 'max';
  const c = heroStarCost(h.star);
  if ((s.cur.stardust ?? 0) < c.dust || (s.cur.gold ?? 0) < c.gold) return 'poor';
  addCur('stardust', -c.dust, s);
  addCur('gold', -c.gold, s);
  h.star++;
  return 'ok';
}
// ───────── 스킬 레벨 ─────────
export const skillCost = (lv: number) => ({ books: GR.skill.books[lv - 1], gold: GR.skill.gold[lv - 1] });
export function skillUp(id: string, i: 0 | 1 | 2, s: Save = S): R {
  const h = s.heroes[id];
  if (h.skill[i] >= GR.skill.max) return 'max';
  const c = skillCost(h.skill[i]);
  if ((s.cur.skillBook ?? 0) < c.books || (s.cur.gold ?? 0) < c.gold) return 'poor';
  addCur('skillBook', -c.books, s);
  addCur('gold', -c.gold, s);
  h.skill[i]++;
  track('skill', 1, s);
  return 'ok';
}
export const skillMult = (lv: number) => 1 + GR.skill.perLv * (lv - 1);
// ───────── 초월 ─────────
export const canTranscend = (id: string, s: Save = S) => s.heroes[id].star >= GR.transcend.needStar && s.heroes[id].awaken >= GR.transcend.needAwaken;
export function transcend(id: string, pickIdx: 0 | 1, s: Save = S): R {
  const h = s.heroes[id];
  const st = h.trans.length;
  if (st >= TRAITS.length) return 'max';
  if (!canTranscend(id, s)) return 'need';
  const c = { stones: GR.transcend.stones[st], gold: GR.transcend.gold[st] };
  if ((s.cur.transStone ?? 0) < c.stones || (s.cur.gold ?? 0) < c.gold) return 'poor';
  addCur('transStone', -c.stones, s);
  addCur('gold', -c.gold, s);
  h.trans.push(pickIdx);
  news(`${s.acc.name}님의 ${heroOf(id).name}, ${h.trans.length}단계 초월!`, s);
  return 'ok';
}
/** 특성 다시 고르기 (같은 단계 · 무료 — 빌드 연구용) */
export function retrait(id: string, stage: number, s: Save = S) {
  const h = s.heroes[id];
  if (stage < h.trans.length) h.trans[stage] = h.trans[stage] ? 0 : 1;
}
export const traitsOf = (id: string, s: Save = S) => s.heroes[id].trans.map((p, i) => TRAITS[i][p]);
// ───────── 경험치 물약 ─────────
export function usePotion(id: string, n: number, s: Save = S): number {
  const k = Math.min(n, s.cur.exp ?? 0);
  if (k <= 0) return -1;
  addCur('exp', -k, s);
  return addExp(id, k * GR.potionExp, s);
}
// ───────── 전용 무기 (조각 · 장착 시 외형 변화는 3단계 그림) ─────────
const EX = CONFIG.exWeapon;
export const exShards = (id: string, s: Save = S) => s.exShards[id] ?? 0;
export const exNeed = (id: string, s: Save = S) => (s.heroes[id].ex === 0 ? EX.shards : EX.starShards[s.heroes[id].ex - 1]);
export function exUp(id: string, s: Save = S): R {
  const h = s.heroes[id];
  if (h.ex >= 5) return 'max';
  const need = exNeed(id, s);
  if (exShards(id, s) < need) return 'poor';
  s.exShards[id] = exShards(id, s) - need;
  h.ex++;
  return 'ok';
}
/** 전용 무기 조각: 상점에서 산 공용 조각(exShard)을 이 영웅 것으로 */
export function assignShards(id: string, n: number, s: Save = S): boolean {
  if (!spend('exShard', n, s)) return false;
  s.exShards[id] = exShards(id, s) + n;
  return true;
}
export const exAtk = (ex: number) => (ex ? EX.atkPct + EX.perStar * (ex - 1) : 0);
