// 보스 전장 (레이드 · 월드 보스): 두 줄 · 피하기 · 부위 파괴 · 그로기 · 페이즈
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { raidDodge, raidOnHit, raidSummary } from '../src/battle/raid';
import { makeBattle, step, type Battle } from '../src/battle/sim';
import { buildRun } from '../src/game/content';
import { recordClear } from '../src/game/stage';
import { newSave } from '../src/game/state';
import { seeded } from './helpers';

const RA = CONFIG.raidArena;
function raidAt(lv: number, mode: 'raid' | 'world' = 'raid') {
  const s = newSave(0);
  for (const id of Object.keys(s.heroes)) s.heroes[id].lv = lv;
  for (let n = 1; n <= 10; n++) recordClear({ c: 1, s: n, d: 0 }, { stars: 3, time: 60, dps: 1, mvp: 'woongs' }, s, seeded(1), 0);
  return makeBattle(buildRun({ mode, arg: 0 }, s), { rnd: seeded(3) });
}
const run = (b: Battle, sec: number, stop = () => false) => {
  for (let t = 0; t < sec && b.phase !== 'win' && b.phase !== 'lose' && !stop(); t += 1 / 30) step(b, 1 / 30);
};
const fight = (b: Battle) => run(b, 30, () => b.phase === 'fight');
const boss = (b: Battle) => b.mobs.find((m) => m.mob?.boss)!;

describe('보스 전장', () => {
  it('레이드는 보스 전장: 거대 보스(오른쪽) · 부위 3개 · 내 파티는 두 줄에 나뉨', () => {
    const b = raidAt(20);
    fight(b);
    expect(b.raid).toBeTruthy();
    expect(boss(b).h).toBe(RA.bossH);
    expect(boss(b).x).toBeGreaterThan(b.w / 2);
    expect(b.raid!.parts.map((p) => p.key)).toEqual(['arm', 'head', 'core']);
    const lanes = new Set(b.heroes.map((h) => h.lane));
    expect(lanes.size).toBe(2);
  });
  it('경고 중 줄 바꾸기 → 그 줄 영웅이 반대 줄로 + 직접 피하기 보너스(그로기 · 공격력)', () => {
    const b = raidAt(20);
    fight(b);
    run(b, 20, () => b.raid!.warnLane != null);
    const r = b.raid!;
    const lane = r.warnLane!;
    const g = r.groggy;
    const n = raidDodge(b);
    expect(n).toBeGreaterThan(0);
    expect(b.heroes.filter((h) => !h.ai && !h.dead).every((h) => h.lane !== lane)).toBe(true);
    expect(r.dodges.manual).toBe(1);
    expect(r.groggy).toBeGreaterThanOrEqual(g + RA.groggy.dodge);
    raidDodge(b); // 같은 경고에 두 번은 보너스 없음
    expect(r.dodges.manual).toBe(1);
  });
  it('부위를 부수면 그 패턴이 순서에서 빠짐 · 결과에 부위 파괴 1등', () => {
    const b = raidAt(20);
    fight(b);
    const r = b.raid!;
    const me = b.heroes[0];
    r.focus = 0;
    raidOnHit(b, me, boss(b), r.parts[0].max + 1, false, false);
    expect(r.parts[0].broken).toBe(true);
    expect(r.focus).toBe(-1);
    const seen = new Set<string>();
    run(b, 60, () => {
      if (r.warnLane != null) seen.add(r.warnKey);
      return false;
    });
    expect(seen.has(RA.parts[0].pattern)).toBe(false);
    expect(raidSummary(b)!.parts[0].top).toBe(me.name);
  });
  it('그로기가 차면 보스 다운 + 두 영웅 협공 · 다운 중엔 경고 없음', () => {
    const b = raidAt(20);
    fight(b);
    const r = b.raid!;
    const [a, c] = b.heroes;
    a.dealt = 100;
    c.dealt = 90;
    for (let i = 0; i * RA.groggy.stun < r.gMax + RA.groggy.stun; i++) raidOnHit(b, a, boss(b), 1, false, true);
    expect(r.downT).toBeGreaterThan(0);
    expect(r.duo?.a).toBe(a);
    expect(r.duo?.b).toBe(c);
    expect(r.warnLane).toBeNull();
    expect(r.gMax).toBeGreaterThan(RA.groggy.max);
  });
  it('체력 70%·30% 아래로 → 페이즈 2·3 (클로즈업 줌)', () => {
    const b = raidAt(20);
    fight(b);
    const r = b.raid!;
    const bs = boss(b);
    bs.hp = bs.max - r.base * 0.31;
    raidOnHit(b, b.heroes[0], bs, 1, false, false);
    expect(r.phase).toBe(1);
    expect(r.zoom?.k).toBe(RA.zoom.phase);
    bs.hp = bs.max - r.base * 0.71;
    raidOnHit(b, b.heroes[0], bs, 1, false, false);
    expect(r.phase).toBe(2);
  });
  it('AUTO로도 끝까지: Lv20 레이드 승리 · 부위 모두 파괴 / 월드 보스 Lv30 부위 모두 파괴', () => {
    const b = raidAt(20);
    b.auto = true;
    // 실제 시간 300초 안 (게임 제한 시간 150초가 승패를 가름 · 협공·페이즈 연출 동안 게임 시간이 느려져 200초로는 모자랐음 — 10/18 main에서도 실패하던 것)
    run(b, 300);
    expect(b.phase).toBe('win');
    expect(b.raid!.parts.every((p) => p.broken)).toBe(true);
    expect(b.raid!.dodges.auto).toBeGreaterThan(0);
    const w = raidAt(30, 'world');
    w.auto = true;
    run(w, 200);
    expect(w.raid!.parts.every((p) => p.broken)).toBe(true);
  });
});
