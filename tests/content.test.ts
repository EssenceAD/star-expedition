// C덩어리: 콘텐츠 (하루 도전 수 · 토벌 · 상급 던전 · 탑 · 요일 · 레이드 8인 · 월드 보스 · 결투장 3리그 · 외전 · 이정표)
import { describe, expect, it } from 'vitest';
import { makeBattle, step } from '../src/battle/sim';
import { CONFIG } from '../src/config';
import { arenaOpps, buildRun, claimMiles, dayKind, finishRun, gloryOpen, lockOf, milesReady, triesLeft, useTry, weekKey, worldBoss, worldRank, type Run } from '../src/game/content';
import { statsOf } from '../src/game/heroes';
import { recordClear } from '../src/game/stage';
import { newHero, newSave, type Save } from '../src/game/state';
import { seeded } from './helpers';

const NOW = Date.UTC(2026, 9, 20, 3, 0, 0); // 화요일 12시 KST
const lv = (s: Save, n: number) => {
  for (const id of Object.keys(s.heroes)) s.heroes[id] = { ...s.heroes[id], lv: n };
  return s;
};
const clearCh = (s: Save, c: number) => {
  for (let n = 1; n <= 10; n++) recordClear({ c, s: n, d: 0 }, { stars: 3, time: 60, dps: 1, mvp: 'woongs' }, s, seeded(1), NOW);
};
const play = (s: Save, r: Run, seed = 1, max = 300) => {
  const b = makeBattle(buildRun(r, s, NOW), { rnd: seeded(seed) });
  b.auto = true;
  for (let t = 0; t < max && b.phase !== 'win' && b.phase !== 'lose'; t += 1 / 30) step(b, 1 / 30);
  return b;
};

describe('콘텐츠', () => {
  it('하루 도전 수: 다 쓰면 잠김 · 다음 날 다시 · 토벌은 장마다 따로', () => {
    const s = newSave(0);
    clearCh(s, 1);
    const r: Run = { mode: 'hunt', arg: 1 };
    expect(lockOf({ mode: 'hunt', arg: 2 }, s, NOW)).toMatch(/2장/);
    for (let i = 0; i < CONFIG.content.hunt.tries; i++) expect(useTry(r, s, NOW)).toBe(true);
    expect(triesLeft(r, s, NOW)).toBe(0);
    expect(useTry(r, s, NOW)).toBe(false);
    expect(triesLeft(r, s, NOW + 86400e3)).toBe(CONFIG.content.hunt.tries);
  });
  it('토벌·상급 던전: 깨면 강화석 · 던전은 장비 확정', () => {
    const s = lv(newSave(0), 30);
    clearCh(s, 1);
    const h = finishRun({ mode: 'hunt', arg: 1 }, { win: true, dealt: 1, heroes: [] }, s, seeded(2), NOW);
    expect(h.items.find(([k]) => k === 'enh')).toBeTruthy();
    const d = finishRun({ mode: 'dungeon', arg: 1 }, { win: true, dealt: 1, heroes: [] }, s, seeded(3), NOW);
    expect(d.gear.length).toBe(1);
  });
  it('도전의 탑: 층마다 강해지고 · 처음 깬 층만 별가루 · 주간 최고 층', () => {
    const s = newSave(0);
    const a = buildRun({ mode: 'tower', arg: 1 }, s, NOW).waves.flat()[0].hp;
    const b = buildRun({ mode: 'tower', arg: 2 }, s, NOW).waves.flat()[0].hp;
    expect(b).toBeGreaterThan(a);
    const d0 = s.cur.stardust;
    finishRun({ mode: 'tower', arg: 1 }, { win: true, dealt: 1, heroes: [] }, s, seeded(4), NOW);
    expect(s.cur.stardust).toBeGreaterThan(d0);
    const d1 = s.cur.stardust;
    finishRun({ mode: 'tower', arg: 1 }, { win: true, dealt: 1, heroes: [] }, s, seeded(4), NOW);
    expect(s.cur.stardust).toBe(d1);
    expect(s.tower.best).toBe(1);
    expect(s.tower.weekBest).toBe(1);
    expect(s.tower.week).toBe(weekKey(NOW));
  });
  it('요일 던전: 화요일은 금화', () => {
    expect(dayKind(NOW)).toBe('gold');
    const s = newSave(0);
    const o = finishRun({ mode: 'day', arg: 2 }, { win: true, dealt: 1, heroes: [] }, s, seeded(5), NOW);
    expect(o.items).toEqual([['gold', CONFIG.content.day.gold * 2]]);
  });
  it('레이드: 8인(내 4 + AI 4) 전투가 끝까지 돌고 · 이기면 티어 재료', () => {
    const s = lv(newSave(0), 25);
    clearCh(s, 1);
    const set = buildRun({ mode: 'raid', arg: 0 }, s, NOW);
    expect(set.heroes.length).toBe(4);
    expect(set.allies!.length).toBe(4);
    const b = play(s, { mode: 'raid', arg: 0 }, 6);
    expect(b.heroes.filter((u) => u.ai).length).toBe(4);
    expect(['win', 'lose']).toContain(b.phase);
    const o = finishRun({ mode: 'raid', arg: 0 }, { win: true, dealt: 1, heroes: [] }, s, seeded(6), NOW);
    expect(o.items.find(([k]) => k === 'tierMat')![1]).toBe(CONFIG.content.raid.tierMat);
  });
  it('월드 보스: 60초가 끝나면 「승리」로 끝나고 피해가 이번 주 누적 · AI가 체력을 깎음 · 순위', () => {
    const s = lv(newSave(0), 20);
    clearCh(s, 1);
    const b = play(s, { mode: 'world', arg: 0 }, 7, 100);
    expect(b.phase).toBe('win');
    expect(b.why).toBe('time');
    expect(b.stats.bossDealt).toBeGreaterThan(0);
    const before = worldBoss(s, NOW).hp;
    finishRun({ mode: 'world', arg: 0 }, { win: false, dealt: b.stats.bossDealt, heroes: [] }, s, seeded(7), NOW);
    expect(s.world.my).toBe(b.stats.bossDealt);
    expect(worldBoss(s, NOW).hp).toBeLessThan(before);
    expect(worldBoss(s, NOW + 3600e3).hp).toBeLessThan(worldBoss(s, NOW).hp);
    expect(worldRank(s, NOW).rank).toBeGreaterThan(0);
  });
  it('결투장: 상대 3명(하루 동안 같음) · 상대 영웅도 스킬을 씀 · 이기면 점수+ · 영광은 시간대 · 최후는 점수', () => {
    const s = lv(newSave(0), 10);
    const o1 = arenaOpps(s, NOW);
    expect(o1.length).toBe(3);
    expect(arenaOpps(s, NOW + 60e3).map((o) => o.name)).toEqual(o1.map((o) => o.name));
    const b = play(s, { mode: 'arena', arg: 'victory', sub: 0 }, 8, 100);
    expect(b.mobs.every((m) => m.pvp && m.flip)).toBe(true);
    expect(b.stats.skills).toBeGreaterThan(0);
    const sc = s.arena.score;
    finishRun({ mode: 'arena', arg: 'victory', sub: 0 }, { win: true, dealt: 1, heroes: [] }, s, seeded(8), NOW);
    expect(s.arena.score).toBe(sc + CONFIG.content.arena.win);
    expect(gloryOpen(NOW)).toBe(true);
    expect(gloryOpen(NOW + 3 * 3600e3)).toBe(false);
    expect(lockOf({ mode: 'arena', arg: 'last' }, s, NOW)).toMatch(/점수/);
    // 영광의 리그: 서로 1명씩 금지 → 3 대 3
    const g = buildRun({ mode: 'arena', arg: 'glory', sub: 1 }, s, NOW);
    expect(g.heroes.length).toBe(3);
    expect(g.waves[0].length).toBe(3);
  });
  it('영웅 외전: 3막을 깨면 전용 보물(공격력↑) · 그 영웅 전용 무기 조각', () => {
    const s = newSave(0);
    const atk = statsOf('woongs', s).atk;
    for (const sub of [1, 2, 3]) finishRun({ mode: 'side', arg: 'woongs', sub }, { win: true, dealt: 1, heroes: [] }, s, seeded(9), NOW);
    expect(s.treasure.woongs).toBe(true);
    expect(s.exShards.woongs).toBe(CONFIG.content.side.shards);
    expect(statsOf('woongs', s).atk).toBeGreaterThan(atk);
    expect(lockOf({ mode: 'side', arg: 'hwang' }, s, NOW)).toMatch(/영웅/);
  });
  it('이정표: 된 것만 · 모두 받기 · 두 번 안 받음', () => {
    const s = newSave(0);
    s.heroes.hwang = newHero();
    s.heroes.kleine = newHero();
    s.heroes.panda = newHero();
    clearCh(s, 1);
    const n = milesReady(s).length;
    expect(n).toBeGreaterThan(0);
    const d = s.cur.stardust;
    expect(claimMiles(s)).toBe(n);
    expect(s.cur.stardust).toBe(d + n * CONFIG.content.milestoneDust);
    expect(claimMiles(s)).toBe(0);
  });
});
