// 시험 공용: 같은 씨앗이면 같은 결과
import { makeBattle, step, type Battle } from '../src/battle/sim';
import type { BattleSetup } from '../src/battle/setup';
export function seeded(s = 7) {
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
export function runBattle(setup: BattleSetup, seed: number, auto = true, max = 400): Battle {
  const b = makeBattle(setup, { rnd: seeded(seed) });
  b.auto = auto;
  for (let t = 0; t < max && b.phase !== 'win' && b.phase !== 'lose'; t += 1 / 30) step(b, 1 / 30);
  return b;
}
