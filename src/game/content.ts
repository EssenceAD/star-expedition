// C덩어리 콘텐츠 로직 (STAR_PLAN_v2 §3): 하루 도전 수 · 토벌 · 상급 던전 · 도전의 탑 · 요일 던전 · 레이드(8인) · 월드 보스(공용 체력, 1단계는 로컬 + AI)
//  · 결투장 3리그(AI 덱) · 영웅 외전(전용 보물) · 이정표 — 각 콘텐츠는 BattleSetup을 만들고(build) 끝나면 보상(finish)
import { CONFIG } from '../config';
import type { BattleSetup, HeroSpec, MobSpec } from '../battle/setup';
import { activeBonds } from '../data/bonds';
import { CHAT_NAMES } from '../data/chat';
import { artOf, HEROES, heroOf } from '../data/heroes';
import { JOBS } from '../data/jobs';
import { bigBoss, CHAPTER_MOBS, PATTERNS } from '../data/mobs';
import { CHAPTERS } from '../data/story';
import { addAccExp } from './account';
import { dropGear, makeGear, makeRune, bagFull } from './gear';
import { chapterFrom, GEAR_FROM } from '../data/gearNames';
import { baseStats, heroPower, owned } from './heroes';
import { bestCleared, buildHeroes, byZone, cleared, mobsAt, powIdx } from './stage';
import { guildBoss } from './social';
import { addCur, dayKey, partyIds, S, track, type Gear, type Rune, type Save } from './state';

const CC = CONFIG.content;
export type Mode = 'hunt' | 'dungeon' | 'tower' | 'day' | 'raid' | 'world' | 'arena' | 'side' | 'graid';
export const MODE_NAME: Record<Mode, string> = { hunt: '토벌 전투', dungeon: '상급 던전', tower: '도전의 탑', day: '요일 던전', raid: '레이드', world: '월드 보스', arena: '결투장', side: '영웅 외전', graid: '길드 레이드' };
export interface Run {
  mode: Mode;
  /** 장(토벌·던전) · 층(탑) · 단계(요일) · 리그(결투장) · 영웅 id(외전) */
  arg: number | string;
  /** 결투장 상대 번호 · 외전 막 */
  sub?: number;
  /** 최후의 리그: 몇 번째 판 (0~2 · 파티 3개) */
  leg?: number;
  /** 영광의 리그 밴픽: 내가 막은 상대 영웅 id · 상대가 막은 내 영웅 대신 들어갈 영웅 id */
  ban?: string;
  swap?: string;
}

// ───────── 날 · 주 · 하루 도전 수 ─────────
const KST = 9 * 3600e3;
export const weekKey = (t = Date.now()) => {
  const d = new Date(t + KST);
  const day = (d.getUTCDay() + 6) % 7;
  const mon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return mon.toISOString().slice(0, 10);
};
export const kstDay = (t = Date.now()) => new Date(t + KST).getUTCDay();
export const kstHour = (t = Date.now()) => new Date(t + KST).getUTCHours();
const triesMax: Record<Mode, number> = { hunt: CC.hunt.tries, dungeon: CC.dungeon.tries, tower: Infinity, day: CC.day.tries, raid: CC.raid.tries, world: CC.world.tries, arena: CC.arena.tries, side: Infinity, graid: CONFIG.social.guild.raidTries };
/** 하루 도전 키 (토벌·던전은 장마다 따로) */
const tryKey = (r: Run) => (r.mode === 'hunt' || r.mode === 'dungeon' ? `${r.mode}:${r.arg}` : r.mode);
function daily(s: Save, now: number) {
  if (s.daily.key !== dayKey(now)) s.daily = { key: dayKey(now), n: {} };
  return s.daily.n;
}
export const triesLeft = (r: Run, s: Save = S, now = Date.now()) => Math.max(0, triesMax[r.mode] - (daily(s, now)[tryKey(r)] ?? 0));
export const triesText = (r: Run, s: Save = S, now = Date.now()) => (triesMax[r.mode] === Infinity ? '' : `${triesLeft(r, s, now)}/${triesMax[r.mode]}`);
/** 들어갈 수 없는 이유 (null = 됨) */
export function lockOf(r: Run, s: Save = S, now = Date.now()): string | null {
  if (triesLeft(r, s, now) <= 0) return '오늘 도전 수를 다 썼어요';
  if ((r.mode === 'hunt' || r.mode === 'dungeon') && !cleared({ c: +r.arg, s: 10, d: 0 }, s)) return `${r.arg}장을 깨면 열려요`;
  if (r.mode === 'arena' && r.arg === 'glory' && !gloryOpen(now)) return `영광의 리그는 ${CC.arena.gloryHours.map(([a, b]) => `${a}~${b}시`).join(' · ')}에만 열려요`;
  if (r.mode === 'arena' && r.arg === 'last' && s.arena.best < CC.arena.lastUnlock) return `최후의 리그는 점수 ${CC.arena.lastUnlock} 이상이면 열려요`;
  if (r.mode === 'raid' && !bestCleared(s)) return '스토리 1-1을 먼저 깨 주세요';
  if (r.mode === 'side' && !owned(String(r.arg), s)) return '이 영웅이 있어야 해요';
  if (r.mode === 'graid' && !s.guild.id) return '길드에 들어가면 열려요';
  return null;
}
export function useTry(r: Run, s: Save = S, now = Date.now()): boolean {
  if (lockOf(r, s, now)) return false;
  const n = daily(s, now);
  n[tryKey(r)] = (n[tryKey(r)] ?? 0) + 1;
  return true;
}

// ───────── AI 영웅 (레이드 동료 · 결투장 상대) ─────────
/** 저장 없이 영웅 입력 만들기 (레벨 · 별) */
export function specFor(id: string, lv: number, star = 1): HeroSpec {
  const def = heroOf(id);
  const st = baseStats(id, lv);
  const m = 1 + CONFIG.growth.star.stat * (star - 1);
  st.hp = Math.round(st.hp * m);
  st.atk = Math.round(st.atk * m);
  st.def = Math.round(st.def * m);
  return { def, art: artOf(def), zone: JOBS[def.job].zone, lv, star, st };
}
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const hashStr = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17) || 1;
/** 파티 하나 (전방 1 이상 · 사제 1 · 나머지 아무나) */
export function aiParty(seed: number, lv: number, star = 1, not: string[] = []): HeroSpec[] {
  const r = seeded(seed);
  const pool = HEROES.map((h) => h.id).filter((id) => !not.includes(id));
  const pickZ = (z: string) => pool.filter((id) => JOBS[heroOf(id).job].zone === z);
  const ids: string[] = [];
  const take = (xs: string[]) => {
    const c = xs.filter((x) => !ids.includes(x));
    if (c.length) ids.push(c[Math.floor(r() * c.length)]);
  };
  take(pickZ('front'));
  take(pool.filter((id) => heroOf(id).job === 'priest'));
  while (ids.length < 4) take(pool);
  return byZone(ids).map((id) => specFor(id, lv, star));
}
const myLv = (s: Save) => Math.max(1, Math.round(partyIds(s).reduce((a, id) => a + s.heroes[id].lv, 0) / Math.max(1, partyIds(s).length)));
/** 레벨 → 강함 지수 (추천 레벨 식을 거꾸로) */
const pOfLv = (lv: number) => Math.max(0, Math.round((lv - 1) / CONFIG.story.recLv));
const top = (s: Save) => {
  const b = bestCleared(s);
  return b ? powIdx(b) : 0;
};

// ───────── 전투 입력 ─────────
function base(s: Save, title: string, waves: MobSpec[][], region: number, extra: Partial<BattleSetup> = {}): BattleSetup {
  // 전투 배경: 제목 앞부분이 표의 이름으로 시작하면 (「도전의 탑 2층」처럼 이름 뒤에 층이 붙어도)
  const bgKey = Object.keys(CONFIG.ui.battleBg).find((k) => title.startsWith(k));
  return { bg: bgKey ? CONFIG.ui.battleBg[bgKey] : undefined, heroes: buildHeroes(s), waves, limit: CONFIG.combat.limit, starTime: CONFIG.combat.starTime, bonds: activeBonds(partyIds(s)), region, title, ...extra };
}
export const towerP = (floor: number) => CC.tower.base + (floor - 1);
export const dayKind = (now = Date.now()) => CC.day.kinds[kstDay(now)];
export const DAY_NAME: Record<string, string> = { all: '모든 보상', exp: '경험치 물약', gold: '금화', enh: '강화석' };
const RAID_BOSS = '심연 드래곤 「잿날개」';
/** 월드 보스 이름 (그림 = public/art/worldboss · 패턴은 주마다 장 보스에서 · ANIM_1017 ④) */
export const WORLD_BOSS = '불꽃 날개 마왕';
export function buildRun(r: Run, s: Save = S, now = Date.now()): BattleSetup {
  const c = typeof r.arg === 'number' ? r.arg : 1;
  switch (r.mode) {
    case 'hunt':
      return base(s, `${MODE_NAME.hunt} · ${CHAPTERS[c - 1].name}`, mobsAt(powIdx({ c, s: 10, d: 0 }) + CC.hunt.add, 'gw|B', c), c - 1);
    case 'dungeon':
      return base(s, `${MODE_NAME.dungeon} · ${CHAPTERS[c - 1].name}`, mobsAt(powIdx({ c, s: 10, d: 0 }) + CC.dungeon.add, CC.dungeon.waves.join('|'), c, { hp: 1.5 }), c - 1);
    case 'tower': {
      const f = +r.arg;
      const boss = f % CC.tower.bossEvery === 0;
      return base(s, `${MODE_NAME.tower} ${f}층`, mobsAt(towerP(f), boss ? 'gwg|B' : 'ggw|wgww', ((f - 1) % 10) + 1, { boss: boss ? `탑의 파수꾼 (${f}층)` : undefined, region: 'tower' }), 4);
    }
    case 'day': {
      const L = +r.arg;
      return base(s, `${MODE_NAME.day} · ${DAY_NAME[dayKind(now)]} ${L}단계`, mobsAt(L * CC.day.step, 'sss|gsg|wgw', 1 + (kstDay(now) % 3), { hp: 1.2, region: 'daily' }), kstDay(now) % 10);
    }
    case 'raid': {
      const p = top(s) + CC.raid.add;
      const mobs = mobsAt(p, 'B', 8, { hp: CC.raid.hp / CONFIG.story.boss.hp, atk: CC.raid.atk / CONFIG.story.boss.atk, boss: RAID_BOSS, patterns: [PATTERNS.beam, PATTERNS.roar, PATTERNS.slam, PATTERNS.focus] });
      mobs[0][0].kind = { ...mobs[0][0].kind, anims: bigBoss('raidboss') };
      const allies = aiParty(hashStr(dayKey(now)) + 7, myLv(s), 2, partyIds(s));
      return base(s, `${MODE_NAME.raid} · ${RAID_BOSS}`, mobs, 7, { allies, limit: CC.raid.limit, arena: true });
    }
    case 'world': {
      const wk = weekKey(now);
      const cm = CHAPTER_MOBS[hashStr(wk) % CHAPTER_MOBS.length];
      const mobs = mobsAt(top(s) + CC.world.add, 'B', 5, { hp: 1000, boss: `월드 보스 · ${WORLD_BOSS}`, patterns: cm.patterns.map((k) => PATTERNS[k]) });
      mobs[0][0].partBase = mobs[0][0].hp / 1000 * CC.world.partBase;
      // 월드 보스는 자기 그림 (불꽃 날개 마왕 · 레이드·골렘 그림 같이 쓰던 것 · ANIM_1017 ④)
      mobs[0][0].kind = { ...mobs[0][0].kind, anims: bigBoss('worldboss') };
      return base(s, `${MODE_NAME.world} · ${CC.world.sec}초 동안 피해 주기`, mobs, 9, { limit: CC.world.sec, timeUp: 'win', arena: true });
    }
    case 'arena': {
      const opp = arenaOpps(s, now)[r.sub ?? 0];
      let foes = opp.party;
      let mine = buildHeroes(s);
      if (r.arg === 'last') {
        // 최후의 리그: 파티 3개로 3판 (2판 먼저 이기면 승리) — 판마다 내 파티·상대 파티가 바뀜
        const leg = r.leg ?? 0;
        const mineIds = lastParties(s)[leg] ?? partyIds(s);
        mine = buildHeroes({ ...s, party: mineIds });
        foes = aiParty(hashStr(opp.name) + leg * 13, opp.party[0].lv, 2);
      }
      if (r.arg === 'glory') {
        // 영광의 리그: 서로 한 명씩 금지 — 내가 고른 상대 영웅(r.ban · 안 고르면 가장 센 영웅)을 막고, 상대는 내 가장 센 영웅을 막음 → 고른 대신할 영웅(r.swap)이 들어감
        const myBan = gloryBanOf(s);
        foes = foes.filter((f) => f.def.id !== (r.ban && foes.some((x) => x.def.id === r.ban) ? r.ban : [...foes].sort((a, b) => b.st.atk - a.st.atk)[0].def.id));
        const keep = partyIds(s).filter((id) => id !== myBan);
        if (r.swap && owned(r.swap, s) && !partyIds(s).includes(r.swap)) keep.push(r.swap);
        mine = buildHeroes({ ...s, party: keep });
      }
      const set = base(s, `${MODE_NAME.arena} · ${LEAGUE_NAME[r.arg as League]} · ${opp.name}`, [foes.map((f) => pvpMob(f))], 6, { limit: 90 });
      set.heroes = mine;
      return set;
    }
    case 'graid': {
      const gb = guildBoss(s, now);
      const mobs = mobsAt(top(s) + CONFIG.social.guild.raidAdd, 'B', 6, { hp: 1000, boss: gb.name, patterns: [PATTERNS.slam, PATTERNS.focus, PATTERNS.quake] });
      mobs[0][0].partBase = mobs[0][0].hp / 1000 * CC.world.partBase;
      // 길드 레이드는 자기 그림 「서리 용」 (FINAL_1018 §6 · 레이드와 같은 배치)
      mobs[0][0].kind = { ...mobs[0][0].kind, anims: bigBoss('graidboss') };
      return base(s, `${MODE_NAME.graid} · ${CONFIG.social.guild.raidSec}초 동안 피해 주기`, mobs, 6, { limit: CONFIG.social.guild.raidSec, timeUp: 'win', arena: true });
    }
    case 'side': {
      const id = String(r.arg);
      const act = r.sub ?? (s.side[id] ?? 0) + 1;
      const p = pOfLv(s.heroes[id]?.lv ?? 1) + CC.side.add;
      const set = base(s, `${MODE_NAME.side} · ${heroOf(id).name} ${act}막`, mobsAt(p, act === CC.side.acts ? 'gw|B' : 'gsg|wgw', 1 + (hashStr(id) % 3), { boss: act === CC.side.acts ? `${heroOf(id).name}의 그림자` : undefined, region: 'side' }), hashStr(id) % 10);
      // 외전은 그 영웅이 꼭 파티에 (모자라면 첫 자리를 바꿈)
      const ids = partyIds(s).includes(id) ? partyIds(s) : [id, ...partyIds(s).slice(0, 3)];
      set.heroes = buildHeroes({ ...s, party: ids });
      set.bonds = activeBonds(ids);
      return set;
    }
  }
}
function pvpMob(h: HeroSpec): MobSpec {
  return { kind: { id: 'goblin', hp: 1, atk: 1, def: 1, rate: h.st.rate, h: h.art.h, anims: h.art.anims }, name: h.def.name, boss: false, hp: h.st.hp, atk: h.st.atk, def: h.st.def, rate: h.st.rate, tint: 0, hero: h };
}

// ───────── 결투장 ─────────
export type League = 'victory' | 'glory' | 'last';
export const LEAGUE_NAME: Record<League, string> = { victory: '승리의 리그', glory: '영광의 리그', last: '최후의 리그' };
export const gloryOpen = (now = Date.now()) => CC.arena.gloryHours.some(([a, b]) => kstHour(now) >= a && kstHour(now) < b);
export const tierOf = (score: number) => [...CC.arena.tiers].reverse().find(([min]) => score >= min)![1];
export interface Opp {
  name: string;
  score: number;
  party: HeroSpec[];
  power: number;
}
/** 오늘의 상대 3명 (AI 덱 · 점수 근처 · 하루 동안 같음) */
export function arenaOpps(s: Save = S, now = Date.now()): Opp[] {
  const seed = hashStr(dayKey(now) + s.arena.score);
  const r = seeded(seed);
  return [0.92, 1, 1.08].map((k, i) => {
    const lv = Math.max(1, Math.round(myLv(s) * k));
    const party = aiParty(seed + i * 101, lv, 1 + Math.floor(r() * 3));
    return { name: CHAT_NAMES[(seed + i * 7) % CHAT_NAMES.length], score: Math.max(0, Math.round(s.arena.score + (k - 1) * 600 + (r() - 0.5) * 60)), party, power: party.reduce((a, h) => a + Math.round(h.st.atk * 6 + h.st.hp * 0.5 + h.st.def * 1.5), 0) };
  });
}
/** 영광의 리그: 상대가 막는 내 영웅 (내 파티에서 공격력이 가장 센 영웅) */
export function gloryBanOf(s: Save = S): string {
  return [...buildHeroes(s)].sort((a, b) => b.st.atk - a.st.atk)[0].def.id;
}
/** 최후의 리그 자동 편성: 편성 파티 빼고 전투력 순으로 4명씩 */
export function autoLast(s: Save = S): string[][] {
  const rest = HEROES.map((h) => h.id).filter((id) => owned(id, s) && !partyIds(s).includes(id)).sort((a, b) => heroPower(b, s) - heroPower(a, s));
  return [rest.slice(0, 4), rest.slice(4, 8)];
}
/** 직접 편성한 파티 2·3이 쓸 수 있나 (가진 영웅 · 파티 1과 안 겹침 · 서로 안 겹침 · 4명까지) */
export function validLast(ps: string[][] | undefined, s: Save = S): ps is string[][] {
  if (!ps || ps.length !== 2) return false;
  const all = ps.flat();
  return ps.every((p) => p.length <= 4) && all.every((id) => owned(id, s) && !partyIds(s).includes(id)) && new Set(all).size === all.length;
}
/** 최후의 리그: 내 파티 3개 (편성 파티 + 직접 편성한 2·3 · 없거나 못 쓰면 자동) */
export function lastParties(s: Save = S): string[][] {
  const two = validLast(s.arena.parties, s) && s.arena.parties.some((p) => p.length) ? s.arena.parties : autoLast(s);
  return [partyIds(s), ...two].filter((p) => p.length);
}

// ───────── 끝: 보상 ─────────
export interface Outcome {
  win: boolean;
  lines: string[];
  items: [string, number][];
  gear: Gear[];
  runes: Rune[];
}
const give = (k: string, n: number, s: Save, o: Outcome) => {
  if (!n) return;
  addCur(k, n, s);
  o.items.push([k, n]);
};
/** 전투가 끝났을 때 (승리·준 피해) → 보상 · 기록 */
export function finishRun(r: Run, res: { win: boolean; dealt: number; heroes: string[] }, s: Save = S, rnd: () => number = Math.random, now = Date.now()): Outcome {
  const o: Outcome = { win: res.win, lines: [], items: [], gear: [], runes: [] };
  track(`play:${r.mode}`, 1, s, now);
  if (res.win || r.mode === 'world' || r.mode === 'graid') track(`win:${r.mode}`, 1, s, now);
  const c = typeof r.arg === 'number' ? r.arg : 1;
  if (r.mode === 'graid') {
    // 길드 레이드: 준 피해 = 이번 주 길드 기여 · 길드 코인
    s.guild.raid += res.dealt;
    s.guild.weekContrib += Math.round(res.dealt / CONFIG.social.guild.raidCoinPer) * 5;
    give('guildCoin', 5 + Math.round(res.dealt / CONFIG.social.guild.raidCoinPer), s, o);
    o.lines.push(`이번 판 피해 ${Math.round(res.dealt).toLocaleString('ko-KR')} · 이번 주 내 길드 레이드 피해 ${Math.round(s.guild.raid).toLocaleString('ko-KR')}`);
    return o;
  }
  if (r.mode === 'world') {
    // 월드 보스: 이긴 것과 상관없이 준 피해만큼 · 이번 주 누적
    if (s.world.week !== weekKey(now)) s.world = { week: weekKey(now), my: 0, best: 0 };
    s.world.my += res.dealt;
    s.world.best = Math.max(s.world.best, res.dealt);
    const rk = worldRank(s, now);
    const tier = CC.world.rankCut.findIndex((x) => rk.pct <= x);
    give('stardust', CC.world.rewardDust[tier], s, o);
    give('gold', Math.round(res.dealt / 200), s, o);
    o.lines.push(`이번 판 피해 ${Math.round(res.dealt).toLocaleString('ko-KR')} · 이번 주 누적 순위 ${rk.rank}위 / ${rk.total}명 (상위 ${Math.max(1, Math.round(rk.pct * 100))}%)`);
    return o;
  }
  if (r.mode === 'raid') s.raidBest = Math.max(s.raidBest ?? 0, res.dealt);
  if (!res.win) {
    if (r.mode === 'arena') arenaResult(r, false, s, o, now);
    return o;
  }
  s.wins[r.mode] = (s.wins[r.mode] ?? 0) + 1;
  switch (r.mode) {
    case 'hunt': {
      give('enh', CC.hunt.enh * (1 + Math.floor(c / 3)), s, o);
      if (rnd() < CC.hunt.gearChance) pushGear(dropGear(powIdx({ c, s: 10, d: 0 }), CC.hunt.gearDiff, s, () => rnd() * 0.5, chapterFrom(c, false)), o);
      if (rnd() < CC.hunt.shard.chance) give('exShard', CC.hunt.shard.n, s, o);
      break;
    }
    case 'dungeon':
      for (let i = 0; i < CC.dungeon.gear; i++) pushGear(forceGear(powIdx({ c, s: 10, d: 0 }), CC.dungeon.gearDiff, s, rnd), o);
      give('enh', 10, s, o);
      break;
    case 'tower': {
      const f = +r.arg;
      if (s.tower.week !== weekKey(now)) s.tower = { ...s.tower, week: weekKey(now), weekBest: 0 };
      s.tower.weekBest = Math.max(s.tower.weekBest, f);
      if (f > s.tower.best) {
        s.tower.best = f;
        give('stardust', CC.tower.dust[0] + CC.tower.dust[1] * f, s, o);
        if (f % CC.tower.runeEvery === 0 && !bagFull(s)) {
          const ru = makeRune(Math.min(5, Math.floor(f / 10)), s, rnd);
          s.items[ru.uid] = ru;
          o.runes.push(ru);
        }
        o.lines.push(`새 최고 층 ${f}층!`);
      }
      give('towerCoin', f % CC.tower.bossEvery === 0 ? CC.tower.bossCoin : CC.tower.coin, s, o);
      break;
    }
    case 'day': {
      const L = +r.arg;
      const k = dayKind(now);
      if (k === 'exp' || k === 'all') give('exp', CC.day.exp * L, s, o);
      if (k === 'gold' || k === 'all') give('gold', CC.day.gold * L, s, o);
      if (k === 'enh' || k === 'all') give('enh', CC.day.enh * L, s, o);
      break;
    }
    case 'raid':
      give('tierMat', CC.raid.tierMat, s, o);
      give('stardust', 30, s, o);
      if (!bagFull(s)) {
        const g = makeGear((['weapon', 'armor', 'acc'] as const)[Math.floor(rnd() * 3)], CC.raid.gearGrade + (rnd() < 0.15 ? 1 : 0), top(s) + CC.raid.add, s, rnd, undefined, GEAR_FROM.raid);
        s.items[g.uid] = g;
        o.gear.push(g);
      }
      break;
    case 'arena':
      arenaResult(r, true, s, o, now);
      break;
    case 'side': {
      const id = String(r.arg);
      const act = r.sub ?? (s.side[id] ?? 0) + 1;
      s.side[id] = Math.max(s.side[id] ?? 0, act);
      if (act === CC.side.acts && !s.treasure[id]) {
        s.treasure[id] = true;
        s.exShards[id] = (s.exShards[id] ?? 0) + CC.side.shards;
        give('stardust', CC.side.dust, s, o);
        o.lines.push(`${heroOf(id).name}의 전용 보물이 열렸어요 (공격력 +${CONFIG.treasure.atkPct * 100}%) · 전용 무기 조각 +${CC.side.shards}`);
      } else give('gold', 5000 * act, s, o);
      break;
    }
  }
  addAccExp(1, s, now);
  return o;
}
function pushGear(g: Gear | null, o: Outcome) {
  if (g) o.gear.push(g);
}
/** 확정 장비 (가방이 차면 없음) */
function forceGear(ilv: number, diff: number, s: Save, rnd: () => number): Gear | null {
  if (bagFull(s)) return null;
  const w = CONFIG.gear.drop.weights[diff];
  const sum = w.reduce((a, b) => a + b, 0);
  let x = rnd() * sum;
  let g = 0;
  while (g < w.length - 1 && (x -= w[g]) >= 0) g++;
  const it = makeGear((['weapon', 'armor', 'acc'] as const)[Math.floor(rnd() * 3)], g, ilv, s, rnd, undefined, GEAR_FROM.dungeon);
  s.items[it.uid] = it;
  return it;
}
function arenaResult(r: Run, win: boolean, s: Save, o: Outcome, now: number) {
  const opp = arenaOpps(s, now)[r.sub ?? 0];
  const d = win ? CC.arena.win : CC.arena.lose;
  s.arena.score = Math.max(0, s.arena.score + d);
  s.arena.best = Math.max(s.arena.best, s.arena.score);
  s.arena[win ? 'win' : 'lose']++;
  s.arena.log.unshift({ league: String(r.arg), opp: opp.name, win, at: now });
  s.arena.log = s.arena.log.slice(0, 10);
  give('arenaCoin', win ? CC.arena.coin.win : CC.arena.coin.lose, s, o);
  o.lines.push(`${opp.name}에게 ${win ? '승리' : '패배'} · 점수 ${d > 0 ? '+' : ''}${d}, 지금 ${s.arena.score} (${tierOf(s.arena.score)} 리그)`);
}

// ───────── 월드 보스 (공용 체력 · 1단계는 로컬 + AI) ─────────
/** 이번 주 보스 최대 체력 · 남은 체력(AI가 시간 따라 깎음 + 내 피해) */
export function worldBoss(s: Save = S, now = Date.now()) {
  const wk = weekKey(now);
  const n = Math.floor((Date.parse(wk) - Date.parse('2026-10-12')) / (7 * 86400e3));
  const max = CC.world.hp * Math.pow(CC.world.grow, Math.max(0, n));
  const hours = (now - (Date.parse(wk) - KST)) / 3600e3;
  const ai = Math.min(0.97, hours * CC.world.aiPerHour) * max;
  const my = s.world.week === wk ? s.world.my : 0;
  return { week: wk, max, hp: Math.max(0, max - ai - my), my, name: `월드 보스 · ${WORLD_BOSS}` };
}
/** 이번 주 랭킹 (AI 플레이어 + 나) */
export function worldBoard(s: Save = S, now = Date.now()) {
  const wb = worldBoss(s, now);
  const r = seeded(hashStr(wb.week));
  const hours = (now - (Date.parse(wb.week) - KST)) / 3600e3;
  const ais = CHAT_NAMES.map((name) => ({ name, dmg: Math.round(wb.max * 0.01 * (0.2 + r() * 1.6) * Math.min(1, hours / 120)), me: false }));
  return [...ais, { name: s.acc.name, dmg: Math.round(wb.my), me: true }].sort((a, b) => b.dmg - a.dmg);
}
export function worldRank(s: Save = S, now = Date.now()) {
  const b = worldBoard(s, now);
  const rank = b.findIndex((x) => x.me) + 1;
  return { rank, total: b.length, pct: rank / b.length };
}

// ───────── 이정표 (RECOVER_1018 S5): 장마다 할 일 사슬 6칸 · 스테이지 + 새 기능 써 보기 · 칸마다 바로가기 ─────────
export interface Milestone {
  id: string;
  /** 몇 장 사슬 */
  c: number;
  name: string;
  /** 칸을 눌렀을 때 설명 한 줄 */
  desc: string;
  done: (s: Save) => boolean;
  /** 바로가기 [화면, 인자] */
  go: [string, Record<string, unknown>];
}
const gearMax = (s: Save, f: (g: Gear) => number) => Math.max(0, ...Object.values(s.items).filter((x): x is Gear => x.kind === 'gear').map(f));
const ownedN = (s: Save) => Object.keys(s.heroes).length;
const ever = (s: Save, ev: string) => s.track?.all?.[ev] ?? 0;
type Step = [string, string, (s: Save) => boolean, [string, Record<string, unknown>]];
const stage = (c: number, n: number): Step => [n === 1 ? `${c}장 진입` : n === 10 ? `${c}장 보스 쓰러뜨리기` : `${c}-${n} 클리어`, n === 10 ? `${c}-10 보스를 쓰러뜨리면 다음 장이 열려요.` : `${c}-${n} 스테이지를 깨요.`, (s) => cleared({ c, s: n, d: 0 }, s), ['prep', { stage: { c, s: n, d: 0 }, from: 'lobby' }]];
/** 장별 할 일 (가운데 칸은 그 장쯤 열리는 기능 써 보기 · 형철 확인용 초안) */
const CHAINS: Step[][] = [
  [stage(1, 3), ['장비 끼기', '영웅 정보에서 장비를 하나 껴 봐요. 「자동 장착」을 눌러도 돼요.', (s) => Object.values(s.items).some((x) => x.kind === 'gear' && !!x.by), ['heroes', {}]], stage(1, 6), ['장비 강화 1번', '가방에서 장비를 골라 강화해 봐요.', (s) => ever(s, 'enh') > 0, ['bag', {}]], ['영웅 Lv.3', '전투하면 편성한 영웅이 함께 자라요.', (s) => Object.values(s.heroes).some((h) => h.lv >= 3), ['prep', {}]], stage(1, 10)],
  [stage(2, 1), ['스킬 올리기', '영웅 정보 「스킬」 탭에서 스킬 레벨을 올려 봐요.', (s) => ever(s, 'skill') > 0, ['heroes', {}]], stage(2, 5), ['출석 보상 받기', '로비 「출석」에서 오늘 출석 보상을 받아요.', (s) => s.attend.n > 0, ['mission', { tab: 'att' }]], ['장비 소환 1번', '상점 「소환」에서 장비를 뽑아 봐요. 하루 한 번은 무료예요.', (s) => ever(s, 'summon') > 0, ['shop', { cat: 'summon' }]], stage(2, 10)],
  [stage(3, 1), ['결투장 1판', '콘텐츠 > 결투장에서 다른 원정대와 겨뤄요.', (s) => s.arena.win + s.arena.lose > 0, ['portal', { tab: 'arena' }]], stage(3, 5), ['소탕 1번', '별 3개로 깬 스테이지는 정보 창에서 소탕할 수 있어요.', (s) => ever(s, 'repeat') > 0, ['lobby', {}]], ['원정대 Lv.10', '스테이지·미션으로 원정대 경험치를 모아요.', (s) => s.acc.lv >= 10, ['mission', {}]], stage(3, 10)],
  [stage(4, 1), ['도전의 탑 5층', '콘텐츠 > 도전의 탑을 한 층씩 올라요.', (s) => s.tower.best >= 5, ['portal', { tab: 'tower' }]], stage(4, 5), ['장비 +5 강화', '장비 하나를 +5까지 강화해요.', (s) => gearMax(s, (g) => g.enh) >= 5, ['bag', {}]], ['영웅 영입', '모은 별가루로 상점 「영웅」에서 새 영웅을 데려와요. 이번 주 할인 영웅이 가장 싸요.', (s) => ever(s, 'hero') > 0, ['shop', { cat: 'hero' }]], stage(4, 10)],
  [stage(5, 1), ['레이드 첫 승리', '콘텐츠 > 레이드에서 큰 보스를 쓰러뜨려요.', (s) => (s.wins.raid ?? 0) > 0, ['portal', { tab: 'raid' }]], stage(5, 5), ['결투장 5승', '결투장에서 다섯 번 이겨요.', (s) => s.arena.win >= 5, ['portal', { tab: 'arena' }]], ['영웅 첫 각성', '영웅 정보에서 각성석으로 각성해요.', (s) => Object.values(s.heroes).some((h) => h.awaken > 0), ['heroes', {}]], stage(5, 10)],
  [stage(6, 1), ['월드 보스 도전', '콘텐츠 > 월드 보스에 한 번 도전해요.', (s) => s.world.my > 0, ['portal', { tab: 'world' }]], stage(6, 5), ['어려움 1장 클리어', '모험에서 난이도를 「어려움」으로 바꿔 1장을 깨요.', (s) => cleared({ c: 1, s: 10, d: 1 }, s), ['adventure', { c: 1, d: 1 }]], ['장비 5성 만들기', '장비를 합성해 5성을 만들어요.', (s) => gearMax(s, (g) => g.star) >= 5, ['bag', {}]], stage(6, 10)],
  [stage(7, 1), ['도전의 탑 10층', '도전의 탑 10층까지 올라요.', (s) => s.tower.best >= 10, ['portal', { tab: 'tower' }]], stage(7, 5), ['원정대 Lv.20', '원정대 레벨 20을 찍어요.', (s) => s.acc.lv >= 20, ['mission', {}]], ['영웅 외전 하나 끝내기', '콘텐츠 > 영웅 외전을 끝까지 봐요.', (s) => Object.values(s.treasure).some(Boolean), ['portal', { tab: 'side' }]], stage(7, 10)],
  [stage(8, 1), ['결투장 은 리그', '결투장 점수를 올려 은 리그에 들어가요.', (s) => s.arena.best >= CC.arena.tiers[1][0], ['portal', { tab: 'arena' }]], stage(8, 5), ['장비 +10 강화', '장비 하나를 +10까지 강화해요.', (s) => gearMax(s, (g) => g.enh) >= 10, ['bag', {}]], ['영웅 10명 모으기', '영웅을 10명까지 모아요.', (s) => ownedN(s) >= 10, ['shop', { cat: 'hero' }]], stage(8, 10)],
  [stage(9, 1), ['영웅 첫 초월', '영웅 정보에서 초월석으로 초월해요.', (s) => Object.values(s.heroes).some((h) => h.trans.length > 0), ['heroes', {}]], stage(9, 5), ['도전의 탑 30층', '도전의 탑 30층까지 올라요.', (s) => s.tower.best >= 30, ['portal', { tab: 'tower' }]], ['어려움 3장 클리어', '어려움 난이도 3장을 깨요.', (s) => cleared({ c: 3, s: 10, d: 1 }, s), ['adventure', { c: 3, d: 1 }]], stage(9, 10)],
  [stage(10, 1), ['영웅 20명 모으기', '영웅을 20명까지 모아요.', (s) => ownedN(s) >= 20, ['shop', { cat: 'hero' }]], stage(10, 5), ['길드 출석', '길드에 들어가 출석해요.', (s) => ever(s, 'guildAttend') > 0, ['guild', {}]], ['친구에게 선물', '친구 화면에서 행동력을 선물해요.', (s) => ever(s, 'gift') > 0, ['friends', {}]], stage(10, 10)],
];
export const MILESTONES: Milestone[] = CHAINS.flatMap((steps, i) => steps.map(([name, desc, done, go], k) => ({ id: `m${i + 1}-${k + 1}`, c: i + 1, name, desc, done, go })));
export const milesOf = (c: number) => MILESTONES.filter((m) => m.c === c);
/** 지금 할 이정표 (안 받은 것 중 맨 앞) */
export const nextMile = (s: Save = S) => MILESTONES.find((m) => !s.miles.includes(m.id));
export const milesReady = (s: Save = S) => MILESTONES.filter((m) => !s.miles.includes(m.id) && m.done(s));
/** 받을 수 있는 이정표 모두 받기 (ids 주면 그것만) → 받은 개수 */
export function claimMiles(s: Save = S, ids?: string[]): number {
  const ready = milesReady(s).filter((m) => !ids || ids.includes(m.id));
  for (const m of ready) s.miles.push(m.id);
  addCur('stardust', ready.length * CC.milestoneDust, s);
  return ready.length;
}
