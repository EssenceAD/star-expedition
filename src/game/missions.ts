// 미션(일일 · 주간 · 이벤트 · 레이드) + 바로가기 · 업적 · 출석 (STAR_PLAN_v2 §4) — 한 일은 state.track()이 센다
import { CONFIG } from '../config';
import { addCur, dayKey, rollTrack, S, type Save } from './state';

export interface Mission {
  id: string;
  name: string;
  /** 세는 일 (track 키) · 목표 */
  ev: string;
  goal: number;
  give: Record<string, number>;
  /** 바로가기: 화면 · 인자 */
  go: [string, Record<string, unknown>];
}
const ADV: [string, Record<string, unknown>] = ['adventure', {}];
const P = (tab: string): [string, Record<string, unknown>] => ['portal', { tab }];
export const DAILY: Mission[] = [
  { id: 'd_stage', name: '스테이지 5판 (반복 전투 포함)', ev: 'stage', goal: 5, give: { gold: 10000 }, go: ADV },
  { id: 'd_sta', name: '행동력 60 쓰기', ev: 'sta', goal: 60, give: { stardust: 30 }, go: ADV },
  { id: 'd_enh', name: '장비 강화 3번', ev: 'enh', goal: 3, give: { enh: 20 }, go: ['bag', {}] },
  { id: 'd_arena', name: '결투장 2판', ev: 'play:arena', goal: 2, give: { arenaCoin: 20 }, go: P('arena') },
  { id: 'd_hunt', name: '토벌 1판', ev: 'play:hunt', goal: 1, give: { exp: 3 }, go: P('hunt') },
  { id: 'd_day', name: '요일 던전 1판', ev: 'play:day', goal: 1, give: { gold: 10000 }, go: P('day') },
  { id: 'd_summon', name: '장비 소환 1번 (무료 포함)', ev: 'summon', goal: 1, give: { stardust: 20 }, go: ['shop', { cat: 'summon' }] },
];
export const WEEKLY: Mission[] = [
  { id: 'w_stage', name: '스테이지 60판', ev: 'stage', goal: 60, give: { stardust: 100 }, go: ADV },
  { id: 'w_arena', name: '결투장 15판', ev: 'play:arena', goal: 15, give: { stardust: 80, arenaCoin: 100 }, go: P('arena') },
  { id: 'w_tower', name: '도전의 탑 5판', ev: 'play:tower', goal: 5, give: { towerCoin: 50 }, go: P('tower') },
  { id: 'w_world', name: '월드 보스 7판', ev: 'play:world', goal: 7, give: { stardust: 80 }, go: P('world') },
  { id: 'w_dungeon', name: '상급 던전 10판', ev: 'play:dungeon', goal: 10, give: { optTicket: 2 }, go: P('dungeon') },
  { id: 'w_guild', name: '길드 출석 5일', ev: 'guildAttend', goal: 5, give: { guildCoin: 100 }, go: ['guild', {}] },
];
/** 레이드 미션 (하루) */
export const RAIDM: Mission[] = [
  { id: 'r_raid', name: '레이드 3판', ev: 'play:raid', goal: 3, give: { tierMat: 3, stardust: 20 }, go: P('raid') },
  { id: 'r_graid', name: '길드 레이드 2판', ev: 'play:graid', goal: 2, give: { guildCoin: 40 }, go: ['guild', { tab: 'raid' }] },
];
/** 업적 (모두 센 것) */
export const ACH: Mission[] = [
  ...[50, 300, 1000].map((n) => ({ id: `a_stage${n}`, name: `스테이지 ${n}판`, ev: 'stage', goal: n, give: { stardust: n >= 1000 ? 500 : n >= 300 ? 200 : 50 }, go: ADV })),
  ...[20, 200].map((n) => ({ id: `a_enh${n}`, name: `강화 ${n}번`, ev: 'enh', goal: n, give: { stardust: n >= 200 ? 200 : 50 }, go: ['bag', {}] as [string, Record<string, unknown>] })),
  ...[10, 100].map((n) => ({ id: `a_arena${n}`, name: `결투장 ${n}승`, ev: 'win:arena', goal: n, give: { stardust: n >= 100 ? 300 : 80 }, go: P('arena') })),
  ...[10, 50].map((n) => ({ id: `a_boss${n}`, name: `스토리 보스 ${n}번 쓰러뜨리기`, ev: 'boss', goal: n, give: { stardust: n >= 50 ? 300 : 80 }, go: ADV })),
  ...[11, 110].map((n) => ({ id: `a_sum${n}`, name: `장비 소환 ${n}번`, ev: 'summon', goal: n, give: { stardust: n >= 110 ? 300 : 60 }, go: ['shop', { cat: 'summon' }] as [string, Record<string, unknown>] })),
  { id: 'a_hero3', name: '영웅 상점에서 3명 영입', ev: 'hero', goal: 3, give: { stardust: 300 }, go: ['shop', { cat: 'hero' }] },
  { id: 'a_raid10', name: '레이드 10승', ev: 'win:raid', goal: 10, give: { stardust: 300 }, go: P('raid') },
  { id: 'a_skill10', name: '스킬 레벨 10번 올리기', ev: 'skill', goal: 10, give: { stardust: 100 }, go: ['heroes', {}] },
];
export type Kind = 'd' | 'w' | 'r' | 'ach';
const LIST: Record<Kind, Mission[]> = { d: DAILY, w: WEEKLY, r: RAIDM, ach: ACH };
const counter = (k: Kind, s: Save) => (k === 'w' ? s.track.w : k === 'ach' ? s.track.all : s.track.d);
const claimedOf = (k: Kind, s: Save) => (k === 'w' ? s.claimed.w : k === 'ach' ? s.claimed.ach : s.claimed.d);
export const progress = (k: Kind, m: Mission, s: Save = S) => Math.min(m.goal, counter(k, s)[m.ev] ?? 0);
export const isDone = (k: Kind, m: Mission, s: Save = S) => progress(k, m, s) >= m.goal;
export const isClaimed = (k: Kind, m: Mission, s: Save = S) => claimedOf(k, s).includes(m.id);
export function listOf(k: Kind, s: Save = S, now = Date.now()) {
  rollTrack(s, now);
  return LIST[k];
}
export const readyOf = (k: Kind, s: Save = S, now = Date.now()) => listOf(k, s, now).filter((m) => isDone(k, m, s) && !isClaimed(k, m, s));
export const readyAll = (s: Save = S, now = Date.now()) => (['d', 'w', 'r', 'ach'] as Kind[]).reduce((a, k) => a + readyOf(k, s, now).length, 0);
const give = (g: Record<string, number>, s: Save) => Object.entries(g).forEach(([k, v]) => addCur(k, v, s));
export function claim(k: Kind, id: string, s: Save = S, now = Date.now()): boolean {
  const m = listOf(k, s, now).find((x) => x.id === id);
  if (!m || !isDone(k, m, s) || isClaimed(k, m, s)) return false;
  claimedOf(k, s).push(m.id);
  give(m.give, s);
  return true;
}
export function claimAll(k: Kind, s: Save = S, now = Date.now()): number {
  let n = 0;
  for (const m of readyOf(k, s, now)) if (claim(k, m.id, s, now)) n++;
  return n;
}

// ───────── 출석 (7일 돌림) · 이벤트 출석 ─────────
const SO = CONFIG.social;
export const attendToday = (s: Save = S, now = Date.now()) => s.attend.last !== dayKey(now);
/** 오늘 출석 (안 했으면) → 받은 것 · 몇째 날 */
/** 오늘 이벤트 출석 보상이 남았는지 (출석하면 같이 받음) */
export const eventToday = (s: Save = S, now = Date.now()) => eventLeft(now) > 0 && s.attend.evLast !== dayKey(now);
export function attend(s: Save = S, now = Date.now()): { day: number; give: Record<string, number> } | null {
  if (!attendToday(s, now)) return null;
  s.attend.last = dayKey(now);
  const day = s.attend.n % SO.attend.length;
  s.attend.n++;
  give(SO.attend[day], s);
  // 이벤트 출석 (기간 안)
  if (eventLeft(now) > 0 && s.attend.evLast !== dayKey(now)) {
    s.attend.evLast = dayKey(now);
    s.attend.ev++;
    addCur('stardust', SO.event.dust, s);
  }
  return { day: day + 1, give: SO.attend[day] };
}
/** 이벤트 남은 날 (0 = 끝남 · 시작 전이면 기간 전체) */
export function eventLeft(now = Date.now()) {
  const start = Date.parse(`${SO.event.start}T00:00:00+09:00`);
  const end = start + SO.event.days * 86400e3;
  return now < start ? SO.event.days : Math.max(0, Math.ceil((end - now) / 86400e3));
}
