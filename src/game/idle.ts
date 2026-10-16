// 방치 보상 — 현실 시간으로 쌓인다 (「체크인」 offline 방식) · 소탕은 반복 전투(game/stage.ts repeatBattle)로 바뀜
//  방치: 가장 높이 깬 스테이지 1판 보상 × 시간당 판 수 × 비율 · fullHours 뒤로는 tailRate · 최대 maxHours
import { CONFIG } from '../config';
import { baseReward, bestCleared, grant, type Reward, type StageId } from './stage';
import { partyIds, S, type Save } from './state';

const O = CONFIG.offline;

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
