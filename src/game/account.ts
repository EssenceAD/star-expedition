// 원정대(계정) 레벨 · 행동력 · 부스터 (STAR_PLAN_v2 §1-6·7 · 킹스레이드 문법: 행동력은 시간 회복 · 레벨업 때 가득)
import { CONFIG } from '../config';
import { S, spend, track, type Save } from './state';

const ST = CONFIG.stamina;
const AC = CONFIG.account;
export const staMax = (s: Save = S) => ST.base + ST.perLv * (s.acc.lv - 1);
/** 지금 행동력 (시간 회복 반영해서 저장에도 씀) — 최대 이상이면 회복 멈춤 */
export function stamina(s: Save = S, now = Date.now()): number {
  const max = staMax(s);
  if (s.sta.n >= max) {
    s.sta.at = now;
    return s.sta.n;
  }
  const gain = Math.floor((now - s.sta.at) / 1000 / ST.regenSec);
  if (gain > 0) {
    s.sta.n = Math.min(max, s.sta.n + gain);
    s.sta.at = s.sta.n >= max ? now : s.sta.at + gain * ST.regenSec * 1000;
  }
  return s.sta.n;
}
/** 다음 1 회복까지 남은 초 (가득이면 0) */
export function staNextSec(s: Save = S, now = Date.now()) {
  if (stamina(s, now) >= staMax(s)) return 0;
  return Math.max(0, ST.regenSec - (now - s.sta.at) / 1000);
}
export const accNeed = (lv: number) => Math.round(AC.exp.base * Math.pow(lv, AC.exp.pow));
/** 행동력 쓰기 → 원정대 경험치 (모자라면 false) · 레벨업이면 행동력 가득 */
export function useStamina(n: number, s: Save = S, now = Date.now()): { ok: boolean; up: number } {
  const cur = stamina(s, now);
  if (cur < n) return { ok: false, up: 0 };
  if (cur >= staMax(s)) s.sta.at = now;
  s.sta.n = cur - n;
  track('sta', n, s, now);
  return { ok: true, up: addAccExp(n, s, now) };
}
export function addAccExp(n: number, s: Save = S, now = Date.now()): number {
  let up = 0;
  s.acc.exp += n;
  while (s.acc.lv < AC.max && s.acc.exp >= accNeed(s.acc.lv)) {
    s.acc.exp -= accNeed(s.acc.lv);
    s.acc.lv++;
    up++;
  }
  if (up) {
    s.sta.n = Math.max(s.sta.n, staMax(s));
    s.sta.at = now;
  }
  return up;
}
/** 행동력 사기 (별가루) — 최대를 넘겨 쌓임 */
export function buyStamina(s: Save = S, now = Date.now()): boolean {
  stamina(s, now);
  if (!spend('stardust', ST.buyDust, s)) return false;
  s.sta.n += ST.buyN;
  return true;
}
export const stageCost = (d: number) => ST.cost[d] ?? ST.cost[0];

// ───────── 부스터 ─────────
export const boostLeft = (s: Save = S, now = Date.now()) => Math.max(0, (s.boostUntil - now) / 1000);
export const boostMult = (s: Save = S, now = Date.now()) => (boostLeft(s, now) > 0 ? CONFIG.booster.mult : 1);
/** 부스터 켜기 (금화) — 켜져 있으면 시간을 더함 */
export function buyBooster(s: Save = S, now = Date.now()): boolean {
  if (!spend('gold', CONFIG.booster.gold, s)) return false;
  s.boostUntil = Math.max(now, s.boostUntil) + CONFIG.booster.sec * 1000;
  return true;
}
