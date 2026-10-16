// 영웅 능력치 · 레벨 · 전투력 (각성·스킬 레벨·초월·장비는 B덩어리에서 여기에 더한다)
import { CONFIG } from '../config';
import { heroOf } from '../data/heroes';
import { S, type Save } from './state';

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  /** 평타 간격(초) */
  rate: number;
  crit: number;
  critDmg: number;
}
const H = CONFIG.hero;
export const lvMult = (lv: number) => Math.pow(H.grow, lv - 1);
export function baseStats(id: string, lv: number): Stats {
  const h = heroOf(id);
  const j = CONFIG.jobs[h.job];
  const m = lvMult(lv);
  return {
    hp: Math.round(j.hp * (h.stat?.hp ?? 1) * m),
    atk: Math.round(j.atk * (h.stat?.atk ?? 1) * m),
    def: Math.round(j.def * (h.stat?.def ?? 1) * m),
    rate: j.rate,
    crit: CONFIG.combat.critChance,
    critDmg: CONFIG.combat.critMult,
  };
}
export const statsOf = (id: string, s: Save = S) => baseStats(id, s.heroes[id]?.lv ?? 1);
export const powerOf = (st: Stats) => Math.round(st.atk * CONFIG.power.atkW + st.hp * CONFIG.power.hpW + st.def * CONFIG.power.defW);
export const heroPower = (id: string, s: Save = S) => powerOf(statsOf(id, s));
export const levelCap = (_id: string, _s: Save = S) => H.levelCap[0];
export const expNeed = (lv: number) => Math.round(H.exp.base * Math.pow(lv, H.exp.pow));
/** 경험치 더하기 → 오른 레벨 수 */
export function addExp(id: string, n: number, s: Save = S): number {
  const h = s.heroes[id];
  if (!h) return 0;
  const cap = levelCap(id, s);
  let up = 0;
  h.exp += Math.round(n);
  while (h.lv < cap && h.exp >= expNeed(h.lv)) {
    h.exp -= expNeed(h.lv);
    h.lv++;
    up++;
  }
  if (h.lv >= cap) h.exp = Math.min(h.exp, expNeed(h.lv));
  return up;
}
export const owned = (id: string, s: Save = S) => !!s.heroes[id];
export function join(id: string, s: Save = S): boolean {
  if (s.heroes[id]) return false;
  s.heroes[id] = { lv: 1, exp: 0 };
  return true;
}
