// 저장 (버전·이전) — 로컬 저장 · 클라우드 저장은 D덩어리 (같은 Supabase · 새 테이블)
//  v1 = 파일럿 (최고 별 · 클리어 수) → v2 = 1단계 A (재화 · 영웅 · 편성 앞2/뒤2 · 스테이지 · 소탕 · 방치)
//  → v3 = STAR_PLAN_v2 §1 (편성 = 영웅 4명 목록(위치는 직업으로 자동) · 원정대 레벨 · 행동력 · 부스터 · 소탕 없앰 → 반복 전투)
import { CONFIG } from '../config';
import { getPref, setPref } from '../core/save';

export interface HeroSave {
  lv: number;
  exp: number;
}
export interface StageRec {
  stars: number;
  clears: number;
  /** 최고 기록: 가장 빠른 클리어(초) · 가장 높은 파티 초당 피해 · 그때 MVP */
  bestTime: number;
  bestDps: number;
  mvp: string;
}
export interface SaveV3 {
  version: 3;
  createdAt: number;
  savedAt: number;
  /** 마지막으로 본 시각 (방치 보상 계산) */
  lastSeen: number;
  /** 첫 진입(프롤로그 → 1-1) 끝났나 */
  prologue: boolean;
  /** 원정대(계정) */
  acc: { name: string; lv: number; exp: number };
  /** 행동력: 값 · 마지막으로 회복을 계산한 시각 */
  sta: { n: number; at: number };
  /** 부스터(전리품 2배) 끝나는 시각 */
  boostUntil: number;
  /** 재화: gold · stardust · enh … (키는 T.icon 과 같게) */
  cur: Record<string, number>;
  heroes: Record<string, HeroSave>;
  /** 파티 영웅 4명 (화면 자리는 직업 위치로 자동) */
  party: string[];
  /** 스테이지 기록 키 = stageKey(장, 스테이지, 난이도) */
  stages: Record<string, StageRec>;
  /** 이미 본 대사 (예: '1:intro') */
  seen: Record<string, true>;
  /** 오늘(현실) 판 수 — 금화 체감 (taper) */
  day: { key: string; runs: number };
  /** 파일럿 기록 그대로 */
  pilot: { clears: number; best: number };
}
export type Save = SaveV3;
export const SAVE_VERSION = 3;
export const PARTY_MAX = 4;

export const dayKey = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
export function newSave(now = Date.now()): Save {
  const heroes: Record<string, HeroSave> = {};
  for (const id of CONFIG.start.heroes) heroes[id] = { lv: 1, exp: 0 };
  return {
    version: 3, createdAt: now, savedAt: now, lastSeen: now, prologue: false,
    acc: { name: CONFIG.start.name, lv: 1, exp: 0 }, sta: { n: CONFIG.stamina.base, at: now }, boostUntil: 0,
    cur: { gold: CONFIG.start.gold, stardust: CONFIG.start.stardust },
    heroes, party: [...CONFIG.start.party], stages: {}, seen: {},
    day: { key: dayKey(now), runs: 0 }, pilot: { clears: 0, best: 0 },
  };
}
/** 옛 저장 → 지금 버전 (없거나 망가지면 새로) */
export function migrate(raw: unknown, now = Date.now()): Save {
  const d = raw as Record<string, unknown> | null;
  if (!d || typeof d !== 'object' || typeof d.version !== 'number') return newSave(now);
  if (d.version === 1) {
    const s = newSave(now);
    const best = (d.best as Record<string, number> | undefined)?.pilot ?? 0;
    s.pilot = { clears: Number(d.clears) || 0, best };
    return s;
  }
  if (d.version === 2 || d.version === 3) {
    const base = newSave(now);
    const s = { ...base, ...(d as unknown as Save) };
    s.cur = { ...base.cur, ...s.cur };
    s.day ??= base.day;
    s.acc ??= base.acc;
    s.sta ??= base.sta;
    s.boostUntil ??= 0;
    if (d.version === 2) {
      // 편성 앞2/뒤2 → 영웅 목록 · 소탕은 반복 전투로 바뀌어 없앰 · 시작 5명(다섯 별)은 모두 있게
      const old = (d.party ?? {}) as Record<string, string | null>;
      s.party = ['f0', 'f1', 'b0', 'b1'].map((k) => old[k]).filter((x): x is string => !!x);
      delete (s as unknown as Record<string, unknown>).sweep;
      for (const id of CONFIG.start.heroes) s.heroes[id] ??= { lv: 1, exp: 0 };
      s.version = 3;
    }
    if (!Array.isArray(s.party) || !s.party.length) s.party = [...base.party];
    s.party = s.party.filter((id) => s.heroes[id]).slice(0, PARTY_MAX);
    return s;
  }
  // 미래 버전 (다른 기기에서 새 버전으로 저장) — 덮어쓰지 않게 그대로 둔다
  return d as unknown as Save;
}

/** 지금 저장 (게임 전체가 이것 하나를 쓴다) */
export let S: Save = newSave();
export function loadSave(now = Date.now()) {
  S = migrate(getPref<unknown>('save', null), now);
  return S;
}
export function persist(now = Date.now()) {
  S.savedAt = now;
  S.lastSeen = now;
  setPref('save', S);
}
/** 시험용 */
export const setSave = (s: Save) => (S = s);

export const cur = (k: string, s: Save = S) => s.cur[k] ?? 0;
export function addCur(k: string, n: number, s: Save = S) {
  s.cur[k] = Math.max(0, Math.round((s.cur[k] ?? 0) + n));
}
export function spend(k: string, n: number, s: Save = S): boolean {
  if (cur(k, s) < n) return false;
  addCur(k, -n, s);
  return true;
}
export const partyIds = (s: Save = S) => s.party.filter((id) => s.heroes[id]);
