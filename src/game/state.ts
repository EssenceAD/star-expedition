// 저장 (버전·이전) — 로컬 저장 · 클라우드 저장은 D덩어리 (같은 Supabase · 새 테이블)
//  v1 = 파일럿 (최고 별 · 클리어 수) → v2 = 1단계 (재화 · 영웅 · 편성 · 스테이지 기록 · 소탕 · 방치)
import { CONFIG } from '../config';
import { getPref, setPref } from '../core/save';

export type Slot = 'f0' | 'f1' | 'b0' | 'b1';
export const SLOTS: Slot[] = ['f0', 'f1', 'b0', 'b1'];
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
export interface SweepJob {
  stage: string;
  runs: number;
  startAt: number;
  /** 이미 받은 판 수 */
  got: number;
}
export interface SaveV2 {
  version: 2;
  createdAt: number;
  savedAt: number;
  /** 마지막으로 본 시각 (방치 보상 계산) */
  lastSeen: number;
  prologue: boolean;
  /** 재화: gold · stardust · enh · exp(경험치 물약) 등 키는 T.icon 과 같게 */
  cur: Record<string, number>;
  heroes: Record<string, HeroSave>;
  party: Record<Slot, string | null>;
  /** 스테이지 기록 키 = stageKey(장, 스테이지, 난이도) */
  stages: Record<string, StageRec>;
  /** 이미 본 대사 (예: '1:intro') */
  seen: Record<string, true>;
  /** 오늘(현실) 판 수 — 금화 체감 (taper) */
  day: { key: string; runs: number };
  sweep: SweepJob | null;
  /** 파일럿 기록 그대로 */
  pilot: { clears: number; best: number };
}
export type Save = SaveV2;
export const SAVE_VERSION = 2;

export const dayKey = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
export function newSave(now = Date.now()): Save {
  const heroes: Record<string, HeroSave> = {};
  for (const id of CONFIG.start.heroes) heroes[id] = { lv: 1, exp: 0 };
  return {
    version: 2, createdAt: now, savedAt: now, lastSeen: now, prologue: false,
    cur: { gold: CONFIG.start.gold, stardust: CONFIG.start.stardust },
    heroes, party: { ...(CONFIG.start.party as Record<Slot, string | null>) }, stages: {}, seen: {},
    day: { key: dayKey(now), runs: 0 }, sweep: null, pilot: { clears: 0, best: 0 },
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
    // 파일럿을 깬 사람은 프롤로그를 이미 아는 사람 — 그래도 한 번은 보여 준다
    return s;
  }
  if (d.version === 2) {
    // 빠진 칸은 기본값으로 채운다 (같은 버전 안에서 칸이 늘어날 때)
    const base = newSave(now);
    const s = { ...base, ...(d as unknown as Save) };
    s.cur = { ...base.cur, ...s.cur };
    s.party = { ...base.party, ...s.party };
    s.day ??= base.day;
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
export const partyIds = (s: Save = S) => SLOTS.map((k) => s.party[k]).filter((x): x is string => !!x);
