// 소탕(자동 반복 · 맡겨 두기)과 방치 보상 — 둘 다 현실 시간으로 쌓인다 (「체크인」 자동 사냥·offline 방식)
//  소탕: 별 3개 스테이지 N판을 맡기면 CONFIG.sweep.secPerRun 초마다 1판씩 끝남 → 아무 때나 끝난 만큼 받기 (꺼져 있어도 진행)
//  방치: 가장 높이 깬 스테이지 1판 보상 × 시간당 판 수 × 비율 · fullHours 뒤로는 tailRate · 최대 maxHours
import { CONFIG } from '../config';
import { baseReward, bestCleared, grant, parseKey, stageKey, starsAt, type Reward, type StageId } from './stage';
import { partyIds, S, type Save } from './state';

const W = CONFIG.sweep;
const O = CONFIG.offline;
export const canSweep = (st: StageId, s: Save = S) => starsAt(st, s) >= 3;
export function startSweep(st: StageId, runs: number, s: Save = S, now = Date.now()): boolean {
  if (s.sweep || !canSweep(st, s) || runs < 1) return false;
  s.sweep = { stage: stageKey(st), runs: Math.min(W.maxRuns, Math.floor(runs)), startAt: now, got: 0 };
  return true;
}
/** 지금까지 끝난 판 수 */
export const sweepDone = (s: Save = S, now = Date.now()) => (s.sweep ? Math.min(s.sweep.runs, Math.floor((now - s.sweep.startAt) / 1000 / W.secPerRun)) : 0);
export const sweepLeftSec = (s: Save = S, now = Date.now()) => (s.sweep ? Math.max(0, s.sweep.runs * W.secPerRun - (now - s.sweep.startAt) / 1000) : 0);
export interface Haul {
  runs: number;
  gold: number;
  exp: number;
  enh: number;
  chests: number;
  ups: string[];
}
const empty = (): Haul => ({ runs: 0, gold: 0, exp: 0, enh: 0, chests: 0, ups: [] });
/** 끝난 판 받기 (다 끝났으면 소탕 비움) */
export function collectSweep(s: Save = S, now = Date.now(), rnd: () => number = Math.random): Haul {
  const h = empty();
  if (!s.sweep) return h;
  const done = sweepDone(s, now);
  const st = parseKey(s.sweep.stage);
  const ids = partyIds(s);
  for (let i = s.sweep.got; i < done; i++) {
    const g = grant(baseReward(st, rnd, ids), ids, s, now);
    h.runs++;
    h.gold += g.gold;
    h.exp += g.exp;
    h.enh += g.enh;
    if (g.chest) h.chests++;
    for (const u of g.ups) if (!h.ups.includes(u)) h.ups.push(u);
    const rec = s.stages[s.sweep.stage];
    if (rec) rec.clears++;
  }
  s.sweep.got = done;
  if (done >= s.sweep.runs) s.sweep = null;
  return h;
}
/** 소탕 그만두기 (끝난 판은 받고) */
export function stopSweep(s: Save = S, now = Date.now(), rnd: () => number = Math.random): Haul {
  const h = collectSweep(s, now, rnd);
  s.sweep = null;
  return h;
}

// ───────── 방치 ─────────
export interface Offline {
  seconds: number;
  away: number;
  stage: StageId;
  reward: Reward;
}
/** 꺼져 있던 동안 보상 (아직 안 줌) — 깬 스테이지가 없거나 너무 짧으면 null */
export function computeOffline(s: Save = S, now = Date.now()): Offline | null {
  const away = Math.max(0, (now - s.lastSeen) / 1000);
  if (away < O.minSeconds) return null;
  const stage = bestCleared(s);
  if (!stage) return null;
  const seconds = Math.min(away, O.maxHours * 3600);
  const hours = seconds / 3600;
  const eff = Math.min(hours, O.fullHours) + Math.max(0, hours - O.fullHours) * O.tailRate;
  const runs = eff * O.runsPerHour * O.rate;
  const one = baseReward(stage, () => 1, []);
  return { seconds, away, stage, reward: { gold: Math.round(one.gold * runs), exp: Math.round(one.exp * runs), stardust: 0, enh: Math.floor(runs * CONFIG.reward.enh.chance), chest: false } };
}
/** 방치 보상 받기 (금화는 taper 없이 · 경험치는 편성 영웅) */
export function claimOffline(o: Offline, s: Save = S, now = Date.now()) {
  const ids = partyIds(s);
  const r = o.reward;
  s.cur.gold = (s.cur.gold ?? 0) + r.gold;
  s.cur.enh = (s.cur.enh ?? 0) + r.enh;
  const g = grant({ ...r, gold: 0, enh: 0 }, ids, s, now);
  // 방치는 오늘 판 수(금화 체감)에 안 센다
  s.day.runs = Math.max(0, s.day.runs - 1);
  return g.ups;
}
