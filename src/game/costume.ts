// 코스튬 (docs/ART_DONE_1017_3.md §3): 별가루로 사고 · 영웅 정보에서 입기 → 전신 그림이 코스튬 그림으로 (전투 도트는 그대로)
import { CONFIG } from '../config';
import { owned } from './heroes';
import { S, spend, track, type Save } from './state';

const CO = CONFIG.costume;
export const costumeKey = (set: string, id: string) => `${set}:${id}`;
/** 이 영웅이 가질 수 있는 코스튬 묶음 */
export const setsOf = (id: string) => Object.keys(CO).filter((k) => CO[k].heroes.includes(id));
export const hasCostume = (set: string, id: string, s: Save = S) => s.costumes.includes(costumeKey(set, id));
/** 상점 진열: 묶음 × 영웅 */
export const costumeStock = () => Object.entries(CO).flatMap(([set, c]) => c.heroes.map((id) => ({ set, id })));
export function buyCostume(set: string, id: string, s: Save = S): 'ok' | 'owned' | 'poor' | 'none' {
  if (!CO[set]?.heroes.includes(id)) return 'none';
  if (hasCostume(set, id, s)) return 'owned';
  if (!spend('stardust', CO[set].dust, s)) return 'poor';
  s.costumes.push(costumeKey(set, id));
  track('costume', 1, s);
  return 'ok';
}
/** 입기 (null = 기본) — 가진 영웅 · 가진 코스튬만 */
export function wearCostume(id: string, set: string | null, s: Save = S): boolean {
  if (!owned(id, s) || (set && !hasCostume(set, id, s))) return false;
  s.heroes[id].costume = set;
  return true;
}
/** 전신 그림 경로 (public/art 아래) — 입은 코스튬이 있으면 그것 */
export function fullbodyPath(id: string, s: Save = S, set?: string | null): string {
  const k = set === undefined ? s.heroes[id]?.costume : set;
  return k && CO[k] ? `${CO[k].dir}/${id}.png` : `fullbody/${id}.png`;
}
