// 영웅 능력치 · 레벨 · 전투력 — 레벨 × 별 × (장비 기본 + 옵션·룬·초월·전용 무기 비율) · 소프트캡 (STAR_PLAN_v2 §2)
import { CONFIG } from '../config';
import { heroOf } from '../data/heroes';
import { gearOf, gearStats } from './gear';
import { exAtk, traitsOf } from './growth';
import { GEAR_SLOTS, newHero, S, type Save } from './state';

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  /** 평타 간격(초) */
  rate: number;
  crit: number;
  critDmg: number;
  /** 비율 보정 (전투 sim의 Mods에 더해짐) */
  spd: number;
  heal: number;
  mana: number;
  dmgCut: number;
  skillDmg: number;
  bossDmg: number;
  /** 스킬 레벨 1~5 ×3 */
  skillLv: [number, number, number];
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
    spd: 0, heal: 0, mana: 0, dmgCut: 0, skillDmg: 0, bossDmg: 0, skillLv: [1, 1, 1],
  };
}
/** 소프트캡 전 값 (상세 화면 「상한까지 n」 · 넘친 만큼 표시) */
export interface RawCaps {
  crit: number;
  spd: number;
  dmgCut: number;
  critDmg: number;
}
export function fullStats(id: string, s: Save = S): { st: Stats; raw: RawCaps } {
  const h = s.heroes[id];
  const st = baseStats(id, h?.lv ?? 1);
  if (!h) return { st, raw: { crit: st.crit, spd: 0, dmgCut: 0, critDmg: st.critDmg } };
  const starM = 1 + CONFIG.growth.star.stat * (h.star - 1);
  const pct: Record<string, number> = {};
  const flat: Record<string, number> = {};
  const addP = (k: string, v: number) => (pct[k] = (pct[k] ?? 0) + v);
  for (const k of GEAR_SLOTS) {
    const g = gearOf(h.gear[k], s);
    if (!g) continue;
    const gs = gearStats(g, s);
    for (const [a, v] of Object.entries(gs.flat)) flat[a] = (flat[a] ?? 0) + v;
    for (const [a, v] of Object.entries(gs.pct)) addP(a, v);
  }
  for (const t of traitsOf(id, s)) addP(t.k === 'atk' ? 'atkPct' : t.k === 'hp' ? 'hpPct' : t.k === 'def' ? 'defPct' : t.k, t.v);
  addP('atkPct', exAtk(h.ex));
  // 전용 보물 (영웅 외전 클리어로 해금)
  if (s.treasure?.[id]) addP('atkPct', CONFIG.treasure.atkPct);
  st.hp = Math.round((st.hp * starM + (flat.hp ?? 0)) * (1 + (pct.hpPct ?? 0)));
  st.atk = Math.round((st.atk * starM + (flat.atk ?? 0)) * (1 + (pct.atkPct ?? 0)));
  st.def = Math.round((st.def * starM + (flat.def ?? 0)) * (1 + (pct.defPct ?? 0)));
  const cap = CONFIG.gear.cap;
  const raw = { crit: st.crit + (pct.crit ?? 0), spd: pct.spd ?? 0, dmgCut: pct.dmgCut ?? 0, critDmg: st.critDmg + (pct.critDmg ?? 0) };
  st.crit = Math.min(cap.crit, raw.crit);
  st.spd = Math.min(cap.spd, raw.spd);
  st.dmgCut = Math.min(cap.dmgCut, raw.dmgCut);
  st.critDmg = Math.min(cap.critDmg, raw.critDmg);
  st.heal = pct.heal ?? 0;
  st.mana = pct.mana ?? 0;
  st.skillDmg = pct.skillDmg ?? 0;
  st.bossDmg = pct.bossDmg ?? 0;
  st.skillLv = [...h.skill];
  return { st, raw };
}
export const statsOf = (id: string, s: Save = S) => fullStats(id, s).st;
export const powerOf = (st: Stats) => Math.round((st.atk * CONFIG.power.atkW + st.hp * CONFIG.power.hpW + st.def * CONFIG.power.defW) * (1 + st.crit * (st.critDmg - 1) + st.spd + st.skillDmg * 0.5) * (1 + st.skillLv.reduce((a, b) => a + b - 1, 0) * 0.02));
export const heroPower = (id: string, s: Save = S) => powerOf(statsOf(id, s));
export const levelCap = (id: string, s: Save = S) => H.levelCap[Math.min(H.levelCap.length - 1, s.heroes[id]?.awaken ?? 0)];
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
  s.heroes[id] = newHero();
  return true;
}
