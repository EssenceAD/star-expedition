// 여관 (킹스레이드 「여관」): 영웅과 인연 맺기(우호도) · 버프 음식 · 형철 10/18
//  인연: 하루 한 번 대화 +talk · 선물(금화) +gift · 100마다 한 단계(최대 10) → 단계마다 공격력·체력 +0.5% · 단계 오를 때 별가루
//  음식: 하나만 · min분 동안 · 공격력/체력/금화/경험치 %
import { CONFIG } from '../config';
import { addCur, dayKey, S, spend, type Save } from './state';

const I = CONFIG.inn;
export const innOf = (s: Save = S) => (s.inn ??= { aff: {}, talk: {}, food: null });
export const affOf = (id: string, s: Save = S) => innOf(s).aff[id] ?? 0;
export const affLv = (id: string, s: Save = S) => Math.min(I.maxLv, Math.floor(affOf(id, s) / I.perLv));
function addAff(id: string, n: number, s: Save) {
  const before = affLv(id, s);
  innOf(s).aff[id] = affOf(id, s) + n;
  const up = affLv(id, s) - before;
  if (up > 0) addCur('stardust', up * I.lvDust, s);
  return up;
}
export const talkedToday = (id: string, s: Save = S, now = Date.now()) => innOf(s).talk[id] === dayKey(now);
/** 대화 (하루 한 번) → 오른 단계 수 · 이미 했으면 -1 */
export function innTalk(id: string, s: Save = S, now = Date.now()): number {
  if (!s.heroes[id] || talkedToday(id, s, now)) return -1;
  innOf(s).talk[id] = dayKey(now);
  return addAff(id, I.talk, s);
}
/** 선물 (금화) → 오른 단계 수 · 금화 모자라면 -1 */
export function innGift(id: string, s: Save = S): number {
  if (!s.heroes[id] || affLv(id, s) >= I.maxLv) return -1;
  if (!spend('gold', I.giftGold, s)) return -1;
  return addAff(id, I.gift, s);
}
/** 지금 먹은 음식 (시간 지나면 null) */
export function foodNow(s: Save = S, now = Date.now()) {
  const f = innOf(s).food;
  if (!f || f.until <= now) return null;
  return I.food.find((x) => x.id === f.id) ?? null;
}
export function eat(id: string, s: Save = S, now = Date.now()): 'ok' | 'poor' {
  const f = I.food.find((x) => x.id === id)!;
  if (!spend('gold', f.gold, s)) return 'poor';
  innOf(s).food = { id, until: now + f.min * 60000 };
  return 'ok';
}
/** 능력치 보너스 (인연 단계 + 음식) */
export function innBonus(id: string, s: Save = S, now = Date.now()) {
  const lv = affLv(id, s);
  const f = foodNow(s, now);
  return { atk: lv * I.lvStat + (f?.eff.atk ?? 0), hp: lv * I.lvStat + (f?.eff.hp ?? 0) };
}
/** 보상 배수 (음식) */
export const foodMult = (k: 'gold' | 'exp', s: Save = S, now = Date.now()) => 1 + (foodNow(s, now)?.eff[k] ?? 0);
