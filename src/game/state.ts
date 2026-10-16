// 저장 (버전·이전) — 로컬 저장 · 클라우드 저장은 D덩어리 (같은 Supabase · 새 테이블)
//  v1 = 파일럿 (최고 별 · 클리어 수) → v2 = 1단계 A (재화 · 영웅 · 편성 앞2/뒤2 · 스테이지 · 소탕 · 방치)
//  → v3 = STAR_PLAN_v2 §1 (편성 = 영웅 4명 목록(위치는 직업으로 자동) · 원정대 레벨 · 행동력 · 부스터 · 소탕 없앰 → 반복 전투)
//  → v4 = §2 B (영웅 각성·별·스킬 레벨·초월·전용 무기·장비 칸 · 가방(장비·룬) · 상점 기록)
//  → v5 = §3 C (하루 도전 수 · 탑 · 월드 보스 · 결투장 · 영웅 외전·전용 보물 · 이정표)
//  → v6 = §4 D (기록 세기(미션·업적) · 받은 미션 · 출석·이벤트 · 길드 · 친구 · 칭호 · 우편 · 채팅 · 클라우드)
import { CONFIG } from '../config';
import { getPref, setPref } from '../core/save';

export type GearSlot = 'weapon' | 'armor' | 'acc1' | 'acc2';
export const GEAR_SLOTS: GearSlot[] = ['weapon', 'armor', 'acc1', 'acc2'];
export interface HeroSave {
  lv: number;
  exp: number;
  /** 각성 단계 0~5 (레벨 상한) */
  awaken: number;
  /** 별 1~5 */
  star: number;
  /** 스킬 레벨 1~5 ×3 */
  skill: [number, number, number];
  /** 초월: 단계마다 고른 특성 (0 또는 1) */
  trans: number[];
  /** 전용 무기: 별 0 = 없음 · 1~5 */
  ex: number;
  /** 장착한 장비 uid */
  gear: Record<GearSlot, number | null>;
}
export interface Gear {
  uid: number;
  kind: 'gear';
  part: 'weapon' | 'armor' | 'acc';
  grade: number;
  /** 장비 레벨 (나온 스테이지 강함) */
  ilv: number;
  star: number;
  tier: number;
  enh: number;
  /** 강화 실패 누적 보정 · 별 올리기 실패 누적 보정 */
  pity: number;
  starPity: number;
  opts: { k: string; v: number }[];
  runes: (number | null)[];
  lock: boolean;
  /** 장착한 영웅 */
  by: string | null;
}
export interface Rune {
  uid: number;
  kind: 'rune';
  grade: number;
  stat: string;
  lock: boolean;
  /** 꽂힌 장비 uid */
  in: number | null;
}
export type Item = Gear | Rune;
export interface StageRec {
  stars: number;
  clears: number;
  /** 최고 기록: 가장 빠른 클리어(초) · 가장 높은 파티 초당 피해 · 그때 MVP */
  bestTime: number;
  bestDps: number;
  mvp: string;
}
export interface Mail {
  id: number;
  from: string;
  title: string;
  body: string;
  give: Record<string, number>;
  at: number;
  got: boolean;
}
export interface ChatLine {
  name: string;
  text: string;
  at: number;
  me?: boolean;
  title?: string;
  ch: 'world' | 'guild';
}
export interface SaveV6 {
  version: 6;
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
  /** 가방: 장비·룬 (uid → 물건) · 다음 uid · 칸 수 */
  items: Record<number, Item>;
  nextUid: number;
  bagSize: number;
  /** 상점: 무료 소환 쓴 날 · 산 꾸러미 · 영웅별 전용 무기 조각 */
  shop: { freeDay: string; packs: string[] };
  exShards: Record<string, number>;
  /** C덩어리: 오늘 쓴 도전 수 (콘텐츠 키 → 수) */
  daily: { key: string; n: Record<string, number> };
  /** 도전의 탑: 최고 층 · 이번 주 최고 층 */
  tower: { best: number; week: string; weekBest: number };
  /** 월드 보스: 이번 주 · 내 누적 피해 · 내 최고 한 판 */
  world: { week: string; my: number; best: number };
  /** 결투장: 점수 · 최고 · 승패 · 최근 기록 */
  arena: { score: number; best: number; win: number; lose: number; log: { league: string; opp: string; win: boolean; at: number }[]; /** 최후의 리그 파티 2·3 (직접 편성 · 없으면 자동) */ parties?: string[][] };
  /** 영웅 외전: 영웅별 깬 막 수 · 전용 보물 해금 */
  side: Record<string, number>;
  treasure: Record<string, boolean>;
  /** 이정표: 받은 것 · 콘텐츠별 이긴 수 */
  miles: string[];
  wins: Record<string, number>;
  /** D덩어리: 한 일 세기 (오늘 · 이번 주 · 모두) — 미션·업적 */
  track: { day: string; week: string; d: Record<string, number>; w: Record<string, number>; all: Record<string, number> };
  /** 받은 미션·업적·이벤트 보상 (오늘·이번 주는 날/주가 바뀌면 비움) */
  claimed: { d: string[]; w: string[]; ach: string[]; ev: string[] };
  /** 출석 (7일 돌림) · 이벤트 출석 날 수 */
  attend: { last: string; n: number; ev: number; evLast: string };
  /** 길드 (null = 안 듦) · 오늘 출석 · 기여 (모두 · 이번 주) · 길드 레이드 이번 주 피해 */
  guild: { id: string | null; attendDay: string; donateDay: string; contrib: number; week: string; weekContrib: number; raid: number };
  /** 친구 · 오늘 선물 보낸 사람 · 받은 수 */
  friends: { list: string[]; day: string; sent: string[]; got: number };
  /** 칭호 (랭커 칭호 등) · 단 칭호 */
  titles: { own: string[]; on: string | null };
  mail: { list: Mail[]; next: number };
  chat: ChatLine[];
  /** 클라우드: 마지막으로 올린 시각 */
  cloud: { pushedAt: number };
}
export type Save = SaveV6;
export const SAVE_VERSION = 6;
export const newHero = (): HeroSave => ({ lv: 1, exp: 0, awaken: 0, star: 1, skill: [1, 1, 1], trans: [], ex: 0, gear: { weapon: null, armor: null, acc1: null, acc2: null } });
export const PARTY_MAX = 4;

export const dayKey = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
export function newSave(now = Date.now()): Save {
  const heroes: Record<string, HeroSave> = {};
  for (const id of CONFIG.start.heroes) heroes[id] = newHero();
  return {
    version: 6, createdAt: now, savedAt: now, lastSeen: now, prologue: false,
    acc: { name: CONFIG.start.name, lv: 1, exp: 0 }, sta: { n: CONFIG.stamina.base, at: now }, boostUntil: 0,
    cur: { gold: CONFIG.start.gold, stardust: CONFIG.start.stardust },
    heroes, party: [...CONFIG.start.party], stages: {}, seen: {},
    day: { key: dayKey(now), runs: 0 }, pilot: { clears: 0, best: 0 },
    items: {}, nextUid: 1, bagSize: CONFIG.gear.bag.start, shop: { freeDay: '', packs: [] }, exShards: {},
    daily: { key: '', n: {} }, tower: { best: 0, week: '', weekBest: 0 }, world: { week: '', my: 0, best: 0 },
    arena: { score: CONFIG.content.arena.start, best: CONFIG.content.arena.start, win: 0, lose: 0, log: [] }, side: {}, treasure: {}, miles: [], wins: {},
    track: { day: '', week: '', d: {}, w: {}, all: {} }, claimed: { d: [], w: [], ach: [], ev: [] }, attend: { last: '', n: 0, ev: 0, evLast: '' },
    guild: { id: null, attendDay: '', donateDay: '', contrib: 0, week: '', weekContrib: 0, raid: 0 }, friends: { list: [], day: '', sent: [], got: 0 }, titles: { own: [], on: null },
    mail: { list: [{ id: 1, from: '여관 주인', title: '원정대에 온 걸 환영해요!', body: '작은 선물을 넣었어요. 별을 되찾으러 가 볼까요?', give: { stardust: 200, gold: 20000 }, at: now, got: false }], next: 2 }, chat: [], cloud: { pushedAt: 0 },
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
  if (d.version >= 2 && d.version <= 6) {
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
      for (const id of CONFIG.start.heroes) s.heroes[id] ??= newHero();
    }
    // v3 → v4: 영웅 성장 칸 · 가방 · 상점 (빠진 칸만 채움)
    for (const id of Object.keys(s.heroes)) s.heroes[id] = { ...newHero(), ...s.heroes[id] };
    s.items ??= {};
    s.nextUid ??= 1;
    s.bagSize ??= base.bagSize;
    s.shop ??= base.shop;
    s.exShards ??= {};
    // v4 → v5: 콘텐츠 칸
    for (const k of ['daily', 'tower', 'world', 'arena', 'side', 'treasure', 'miles', 'wins', 'track', 'claimed', 'attend', 'guild', 'friends', 'titles', 'mail', 'chat', 'cloud'] as const) (s as unknown as Record<string, unknown>)[k] ??= structuredClone(base[k]);
    s.version = 6;
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
/** 재화 더하기 · 별가루·영웅 재료는 주간 획득 상한 (CONFIG.econ.cap · free = 우편 보상처럼 상한 밖) */
export function addCur(k: string, n: number, s: Save = S, free = false) {
  const cap = CONFIG.econ.cap[k];
  // 주가 바뀌는 건 track()/rollTrack이 (그 시각으로) 비움 — 여기서는 지금 주 칸에 셈
  if (n > 0 && cap && !free && s.track) {
    const got = s.track.w[`earn:${k}`] ?? 0;
    n = Math.min(n, Math.max(0, cap - got));
    s.track.w[`earn:${k}`] = got + n;
  }
  s.cur[k] = Math.max(0, Math.round((s.cur[k] ?? 0) + n));
}
/** 이번 주 더 얻을 수 있는 양 (상한 없는 재화는 Infinity) */
export function capLeft(k: string, s: Save = S) {
  const cap = CONFIG.econ.cap[k];
  if (!cap || !s.track) return Infinity;
  return Math.max(0, cap - (s.track.w[`earn:${k}`] ?? 0));
}
export function spend(k: string, n: number, s: Save = S): boolean {
  if (cur(k, s) < n) return false;
  addCur(k, -n, s);
  return true;
}
export const partyIds = (s: Save = S) => s.party.filter((id) => s.heroes[id]);

/** 한 일 세기 (미션·업적 · 「체크인」 goals 방식) — 날·주가 바뀌면 오늘·이번 주 칸과 받은 미션을 비운다 */
const KST = 9 * 3600e3;
export const weekOf = (t = Date.now()) => {
  const d = new Date(t + KST);
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
};
export function rollTrack(s: Save = S, now = Date.now()) {
  const t = s.track;
  if (!t) return;
  if (t.day !== dayKey(now)) ((t.day = dayKey(now)), (t.d = {}), (s.claimed.d = []));
  if (t.week !== weekOf(now)) ((t.week = weekOf(now)), (t.w = {}), (s.claimed.w = []));
}
export function track(ev: string, n = 1, s: Save = S, now = Date.now()) {
  if (!s.track || n <= 0) return;
  rollTrack(s, now);
  for (const m of [s.track.d, s.track.w, s.track.all]) m[ev] = (m[ev] ?? 0) + n;
}
