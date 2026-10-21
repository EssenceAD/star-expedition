// 스토리 스테이지: 열림 조건 · 전투 입력 만들기 · 보상 · 클리어 기록 (ROADMAP §3 · §2 결과)
import { CONFIG } from '../config';
import { activeBonds } from '../data/bonds';
import { artOf, heroOf, HEROES } from '../data/heroes';
import { CHAPTER_MOBS, MOB_KINDS, MOB_ROW, OWN_MOBS, PATTERNS, regionBoss, regionMob, type MobKind, type RegionMobId } from '../data/mobs';
import { CHAPTERS } from '../data/story';
import { T } from '../theme/tokens';
import type { BattleSetup, HeroSpec, MobSpec } from '../battle/setup';
import { addExp, expNeed, join, statsOf } from './heroes';
import { addCur, dayKey, partyIds, S, track, type Save } from './state';
import { boostMult, stageCost, useStamina } from './account';
import { bagFull, dropGear, makeRune } from './gear';
import { chapterFrom } from '../data/gearNames';
import { foodMult } from './inn';
import type { Gear, Rune } from './state';
import { JOBS, ZONES } from '../data/jobs';

const C = CONFIG.story;
const R = CONFIG.reward;
export interface StageId {
  c: number;
  s: number;
  d: number;
}
export const stageKey = ({ c, s, d }: StageId) => `${c}-${s}-${d}`;
export const parseKey = (k: string): StageId => {
  const [c, s, d] = k.split('-').map(Number);
  return { c, s, d };
};
export const isBoss = (st: StageId) => st.s === C.stages;
/** 강함 지수 */
export const powIdx = ({ c, s, d }: StageId) => (c - 1) * C.stages + (s - 1) + C.diffAdd[d];
export const recLevel = (st: StageId) => Math.max(1, Math.round(1 + powIdx(st) * C.recLv));
export const stageName = (st: StageId) => `${st.c}-${st.s}${st.d ? ` ${C.diffName[st.d]}` : ''}`;

export const cleared = (st: StageId, s: Save = S) => (s.stages[stageKey(st)]?.clears ?? 0) > 0;
export const starsAt = (st: StageId, s: Save = S) => s.stages[stageKey(st)]?.stars ?? 0;
/** 난이도가 열렸나: 보통은 늘 · 어려움/지옥은 그 장 아래 난이도 마지막 스테이지 클리어 */
export const diffOpen = (c: number, d: number, s: Save = S) => d === 0 || cleared({ c, s: C.stages, d: d - 1 }, s);
export function unlocked(st: StageId, s: Save = S): boolean {
  if (!diffOpen(st.c, st.d, s)) return false;
  if (st.s > 1) return cleared({ ...st, s: st.s - 1 }, s);
  if (st.c === 1) return true;
  return cleared({ c: st.c - 1, s: C.stages, d: st.d }, s);
}
/** 다음에 할 스테이지 (보통 기준) */
export function nextStage(s: Save = S): StageId {
  for (let c = 1; c <= C.chapters; c++) for (let n = 1; n <= C.stages; n++) if (!cleared({ c, s: n, d: 0 }, s)) return { c, s: n, d: 0 };
  return { c: C.chapters, s: C.stages, d: 0 };
}
/** 가장 높이 깬 스테이지 (방치 보상 기준) */
export function bestCleared(s: Save = S): StageId | null {
  let best: StageId | null = null;
  for (const k of Object.keys(s.stages)) {
    if (!s.stages[k].clears) continue;
    const st = parseKey(k);
    if (!best || powIdx(st) > powIdx(best)) best = st;
  }
  return best;
}

// ───────── 웨이브 ─────────
const KIND: Record<string, MobKind['id']> = { s: 'slime', g: 'goblin', w: 'wolf', a: 'uniq1', b: 'uniq2', E: 'elite', B: 'golem' };
/**
 * 10/18 몹 다양화: 웨이브 글자를 그대로 두고 장 고유 몹·정예를 섞는다 (같은 입력 → 늘 같은 결과)
 *  s 중 일부 → a(고유 1) · w 중 일부 → b(고유 2) · 보스 바로 앞 웨이브(보스 없으면 마지막 웨이브, 3마리 이상)의 첫 g → E(정예)
 */
export function varyWaves(waves: string): string {
  const ws = waves.split('|');
  const bi = ws.findIndex((w) => w.includes('B'));
  const ei = bi > 0 ? bi - 1 : bi < 0 && ws.length >= 2 ? ws.length - 1 : -1;
  return ws
    .map((w, i) => {
      let out = [...w].map((ch, j) => (ch === 's' && (i + j) % 3 === 1 ? 'a' : ch === 'w' && (i + j) % 2 === 1 ? 'b' : ch)).join('');
      if (i === ei && w.length >= 3 && out.includes('g')) out = out.replace('g', 'E');
      return out;
    })
    .join('|');
}
/** 자리표시자 장(4~10)은 3장 웨이브를 그대로 (수치만 다름) */
function waveText(st: StageId): string {
  const ch = CHAPTERS[st.c - 1];
  const src = ch.waves ?? CHAPTERS[C.realChapters - 1].waves!;
  return src[st.s - 1];
}
export function buildMobs(st: StageId): MobSpec[][] {
  return mobsAt(powIdx(st), waveText(st), st.c);
}
/** 강함 지수 p · 웨이브 글자 · 장(이름·색·보스 패턴) · 배수(정예·레이드) → 적 입력 (스토리·토벌·탑·던전 공용) */
export function mobsAt(p: number, waves: string, chapter: number, o: { hp?: number; atk?: number; boss?: string; patterns?: MobSpec['patterns']; region?: keyof typeof OWN_MOBS } = {}): MobSpec[][] {
  const g = Math.pow(C.grow, p);
  const cm = CHAPTER_MOBS[(chapter - 1) % CHAPTER_MOBS.length];
  return (o.region ? waves : varyWaves(waves)).split('|').map((w) =>
    [...w].map((ch): MobSpec => {
      const base = MOB_KINDS[KIND[ch]];
      const boss = base.id === 'golem';
      // 지역 그림 (ANIM_1017 ③): 장의 지역 몹 3종 · 장 보스 — 그림 자체가 지역 색이라 색 바꾸기 없음
      // 탑·요일·외전은 자기 몹 그림 (FINAL_1018 §6 · mobs2/<tower|daily|side> r0~r2 · 탑 보스 bosses2/tower)
      const home = CHAPTERS[(chapter - 1) % CHAPTERS.length].region;
      const region = o.region ?? home;
      // 외전 보스 그림은 따로 없어 장 보스 그림 그대로
      const kind = { ...base, anims: boss ? regionBoss(o.region === 'side' ? home : region) : regionMob(region, MOB_ROW[base.id as RegionMobId]) };
      const bm = boss ? C.boss : { hp: 1, atk: 1, def: 1 };
      return {
        kind, boss, name: boss ? (o.boss ?? cm.boss) : o.region ? OWN_MOBS[o.region][MOB_ROW[kind.id as RegionMobId]] : cm.names[kind.id as RegionMobId],
        hp: Math.round(C.mob.hp * kind.hp * bm.hp * g * (o.hp ?? 1)),
        atk: Math.round(C.mob.atk * kind.atk * bm.atk * g * (o.atk ?? 1)),
        def: Math.round(C.mob.def * kind.def * bm.def * g),
        rate: kind.rate,
        tint: 0,
        patterns: boss ? (o.patterns ?? cm.patterns.map((k) => PATTERNS[k])) : undefined,
      };
    }),
  );
}
/** 지금 편성으로 영웅 입력 */
/** 파티를 위치 순서(전방 → 중앙 → 후방)로 · 같은 위치 안에서는 편성 순서 그대로 */
export const byZone = (ids: string[]) => [...ids].sort((a, b) => ZONES.indexOf(JOBS[heroOf(a).job].zone) - ZONES.indexOf(JOBS[heroOf(b).job].zone));
export function buildHeroes(s: Save = S): HeroSpec[] {
  return byZone(partyIds(s)).map((id) => {
    const def = heroOf(id);
    return { def, art: artOf(def, s.heroes[id].costume), zone: JOBS[def.job].zone, lv: s.heroes[id].lv, star: s.heroes[id].star, st: statsOf(id, s) };
  });
}
export function buildStage(st: StageId, s: Save = S): BattleSetup {
  return {
    heroes: buildHeroes(s), waves: buildMobs(st), limit: CONFIG.combat.limit, starTime: CONFIG.combat.starTime, bg: `region_${CHAPTERS[st.c - 1].region}`,
    bonds: activeBonds(partyIds(s)), region: (st.c - 1) % T.battle.region.length, title: `${CHAPTERS[st.c - 1].name} ${stageName(st)}`,
  };
}

// ───────── 보상 ─────────
export interface Reward {
  gold: number;
  exp: number;
  stardust: number;
  enh: number;
  chest: boolean;
}
/** 오늘 n번째 판의 금화 비율 (taper) */
export function taperAt(n: number): number {
  for (const [upto, r] of R.taper) if (n <= upto) return r;
  return R.taper[R.taper.length - 1][1];
}
/** 한 판 보상 (첫 클리어·별 3개 보너스는 따로 firstBonus) · first = 처음 깨는 판 (초반 퍼주기는 이때만 · 소탕·방치는 그대로) */
export function baseReward(st: StageId, rnd: () => number = Math.random, ids: string[] = partyIds(), first = false): Reward {
  const p = powIdx(st);
  const dm = R.diffMult[st.d];
  const chest = ids.includes('warmnight') && rnd() < R.chest.chance;
  const boss = isBoss(st) ? 2 : 1;
  // 초반 퍼주기 (첫 클리어만): 1 (p < full) → 0 (p ≥ end)
  const f = first ? Math.min(1, Math.max(0, (R.early.end - p) / (R.early.end - R.early.full))) : 0;
  return {
    gold: Math.round(R.gold.base * Math.pow(R.gold.grow, p) * dm * (chest ? R.chest.gold : 1) * boss * (1 + f * R.early.gold)),
    exp: Math.round(Math.max(R.exp.base * Math.pow(R.exp.grow, p), f * R.early.lvShare * expNeed(recLevel(st))) * dm * boss),
    stardust: rnd() < R.dust.chance ? R.dust.n * (st.d + 1) : 0,
    enh: rnd() < R.enh.chance ? R.enh.n * (st.d + 1) : 0,
    chest,
  };
}
/** 보상 주기 (금화는 오늘 판 수로 줄어듦 · 부스터면 전리품(금화·강화석) 2배 · 경험치는 편성 영웅 모두) → 실제 받은 양 · 레벨업한 영웅 */
export function grant(r: Reward, ids: string[], s: Save = S, now = Date.now(), st?: StageId, rnd: () => number = Math.random) {
  if (s.day.key !== dayKey(now)) s.day = { key: dayKey(now), runs: 0 };
  s.day.runs++;
  const bm = boostMult(s, now);
  const gold = Math.round(r.gold * taperAt(s.day.runs) * bm * foodMult('gold', s, now));
  const enh = r.enh * bm;
  addCur('gold', gold, s);
  // 판 드랍 별가루만 주간 상한 안 (반복 파밍) → 실제 들어간 양 · 깎인 양
  const dust = addCur('stardust', r.stardust, s);
  addCur('enh', enh, s);
  const ups: string[] = [];
  const exp = Math.round(r.exp * foodMult('exp', s, now));
  for (const id of ids) if (addExp(id, exp, s)) ups.push(id);
  // 장비 드롭 (스테이지 판만 · 가방이 가득이면 없음) · 보스 스테이지 룬
  const gear: Gear[] = [];
  const runes: Rune[] = [];
  if (st) {
    const g = dropGear(powIdx(st), st.d, s, rnd, chapterFrom(st.c, isBoss(st)));
    if (g) gear.push(g);
    if (isBoss(st) && !bagFull(s) && rnd() < CONFIG.gear.drop.runeBoss) {
      const ru = makeRune(Math.min(5, st.d + (rnd() < 0.2 ? 1 : 0)), s, rnd);
      s.items[ru.uid] = ru;
      runes.push(ru);
    }
  }
  return { ...r, gold, enh, stardust: dust, dustCut: r.stardust - dust, ups, boosted: bm > 1, gear, runes };
}

export interface ClearInfo {
  stars: number;
  time: number;
  dps: number;
  mvp: string;
}
/** DUST_CAP_1021 보상: 어려움·지옥(d ≥ 1) 깬 스테이지의 첫 클리어(+보스) · ★3 별가루 합 — 받은 시각 기록이 없어 전부 */
export function hardFirstDust(s: Save = S): number {
  let n = 0;
  for (const [k, rec] of Object.entries(s.stages)) {
    const [c, st, d] = k.split('-').map(Number);
    if (!(d >= 1) || !(rec?.clears > 0)) continue;
    n += isBoss({ c, s: st, d }) ? R.firstDustBoss : R.firstDust;
    if (rec.stars >= 3) n += R.threeStarDust;
  }
  return n;
}
/** 승리 기록 + 첫 클리어 보너스 + 장 클리어 합류 → 이번에 받은 것 */
export function recordClear(st: StageId, info: ClearInfo, s: Save = S, rnd: () => number = Math.random, now = Date.now()) {
  const k = stageKey(st);
  const old = s.stages[k];
  const first = !old?.clears;
  const firstThree = info.stars >= 3 && (old?.stars ?? 0) < 3;
  const rec = old ?? { stars: 0, clears: 0, bestTime: 0, bestDps: 0, mvp: '' };
  rec.clears++;
  rec.stars = Math.max(rec.stars, info.stars);
  if (!rec.bestTime || info.time < rec.bestTime) rec.bestTime = Math.round(info.time);
  const newBest = info.dps > rec.bestDps;
  if (newBest) {
    rec.bestDps = Math.round(info.dps);
    rec.mvp = info.mvp;
  }
  s.stages[k] = rec;
  track('stage', 1, s, now);
  if (isBoss(st)) track('boss', 1, s, now);
  const ids = partyIds(s);
  const r = baseReward(st, rnd, ids, first);
  if (first && CONFIG.firstRefund) s.sta.n += stageCost(st.d);
  const got = grant(r, ids, s, now, st, rnd);
  // DUST_CAP_1021 (따밤 제보): 첫 클리어·★3 별가루는 한 번만 받는 보상 → 주간 상한 밖 (상한에 닿으면 결과 창에만 뜨고 0이 들어가던 것)
  got.stardust += addCur('stardust', (first ? (isBoss(st) ? R.firstDustBoss : R.firstDust) : 0) + (firstThree ? R.threeStarDust : 0), s, true);
  // 장 클리어(보통 x-10 처음) → 지역 전설 합류
  let joined: string | null = null;
  if (first && isBoss(st) && st.d === 0) {
    const h = heroJoining(st.c);
    if (h && join(h, s)) joined = h;
  }
  return { got, first, firstThree, newBest, joined };
}
/** 이 장을 깨면 합류하는 영웅 */
export const heroJoining = (c: number) => HEROES.find((h) => h.joinChapter === c)?.id ?? null;

// ───────── 반복 전투 (STAR_PLAN_v2 §1-6: 즉시 끝 · 행동력 n × 비용 · 별 3개 스테이지) ─────────
export const canRepeat = (st: StageId, s: Save = S) => starsAt(st, s) >= CONFIG.repeat.minStars;
export interface Haul {
  runs: number;
  gold: number;
  exp: number;
  enh: number;
  chests: number;
  ups: string[];
  accUp: number;
  gear: number;
}
/** n판을 바로 끝냄 — 행동력이 모자라면 할 수 있는 만큼(0판이면 null) */
export function repeatBattle(st: StageId, n: number, s: Save = S, rnd: () => number = Math.random, now = Date.now()): Haul | null {
  if (!canRepeat(st, s)) return null;
  const h: Haul = { runs: 0, gold: 0, exp: 0, enh: 0, chests: 0, ups: [], accUp: 0, gear: 0 };
  const ids = partyIds(s);
  for (let i = 0; i < n; i++) {
    const u = useStamina(stageCost(st.d), s, now);
    if (!u.ok) break;
    h.accUp += u.up;
    const g = grant(baseReward(st, rnd, ids), ids, s, now, st, rnd);
    h.gear += g.gear.length;
    h.runs++;
    h.gold += g.gold;
    h.exp += g.exp;
    h.enh += g.enh;
    if (g.chest) h.chests++;
    for (const id of g.ups) if (!h.ups.includes(id)) h.ups.push(id);
    s.stages[stageKey(st)].clears++;
    track('stage', 1, s, now);
    track('repeat', 1, s, now);
  }
  return h.runs ? h : null;
}
