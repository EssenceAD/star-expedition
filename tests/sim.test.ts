// 전투 진행: AUTO로 끝까지 · 시간 · 쿨타임 · 만/억 표기
import { describe, expect, it } from 'vitest';
import { makeBattle, step, starsOf, requestSkill, canCast } from '../src/battle/sim';
import { WAVES } from '../src/battle/data';

function seeded(s = 7) {
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
const run = (auto: boolean, seed: number, max = 400) => {
  const b = makeBattle(seeded(seed));
  b.auto = auto;
  for (let t = 0; t < max && b.phase !== 'win' && b.phase !== 'lose'; t += 1 / 30) step(b, 1 / 30);
  return b;
};

describe('전투 한 판', () => {
  it('AUTO면 웨이브 3 + 보스를 깨고, 90~150초 안팎', () => {
    const times: number[] = [];
    for (const seed of [1, 2, 3, 4, 5]) {
      const b = run(true, seed);
      expect(b.phase, `seed ${seed}`).toBe('win');
      expect(b.wave).toBe(WAVES.length - 1);
      times.push(b.stats.time);
      expect(starsOf(b)).toBeGreaterThanOrEqual(2);
    }
    console.log('클리어 시간', times.map((t) => t.toFixed(0)).join(' '));
    for (const t of times) expect(t).toBeLessThan(160);
  });
  it('스킬을 하나도 안 쓰면 보스에서 시간이 모자라거나 오래 걸린다 (스킬이 의미 있게)', () => {
    const b = run(false, 3);
    expect(b.phase === 'lose' || b.stats.time > 150).toBe(true);
  });
  it('스킬 쿨타임 · 마나', () => {
    const b = makeBattle(seeded(9));
    for (let t = 0; t < 8 && b.phase !== 'fight'; t += 1 / 30) step(b, 1 / 30);
    for (let t = 0; t < 2; t += 1 / 30) step(b, 1 / 30);
    const w = b.heroes.find((h) => h.hero!.id === 'woongs')!;
    w.mana = 100;
    expect(canCast(b, w, 0)).toBe(true);
    requestSkill(b, w, 0);
    for (let t = 0; t < 1.5; t += 1 / 30) step(b, 1 / 30);
    expect(w.scd[0]).toBeGreaterThan(0);
    expect(canCast(b, w, 0)).toBe(false);
  });
});
