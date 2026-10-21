// DUST_CAP_1021 (따밤 제보): 주간 상한은 판 드랍에만 · 첫 클리어·★3 별가루는 상한 밖 · 결과에 깎인 양 · 보상 계산
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { hardFirstDust, recordClear } from '../src/game/stage';
import { addCur, dustCapped, newSave, weekOf } from '../src/game/state';

const R = CONFIG.reward;
const capped = () => {
  const s = newSave(0);
  s.track!.week = weekOf();
  s.track!.w['earn:stardust'] = CONFIG.econ.cap.stardust;
  return s;
};

describe('주간 별가루 상한', () => {
  it('addCur는 실제로 더한 양을 돌려줌', () => {
    const s = capped();
    expect(addCur('stardust', 50, s)).toBe(0);
    expect(addCur('stardust', 50, s, true)).toBe(50);
    expect(dustCapped(s)).toBe(true);
  });
  it('상한에 닿아도 어려움 첫 ★3 클리어 별가루(20 + 12)는 들어오고 판 드랍만 깎임', () => {
    const s = capped();
    const before = s.cur.stardust ?? 0;
    const st = { c: 3, s: 7, d: 1 };
    const rnd = () => 0; // 판 드랍 별가루가 나오게
    const r = recordClear(st, { stars: 3, time: 30, dps: 1, mvp: '' }, s, rnd);
    expect(r.got.stardust).toBe(R.firstDust + R.threeStarDust);
    expect(r.got.dustCut).toBeGreaterThan(0);
    expect((s.cur.stardust ?? 0) - before).toBe(R.firstDust + R.threeStarDust);
  });
  it('보상 = 어려움·지옥 깬 스테이지의 첫 클리어(보스 100) + ★3', () => {
    const s = newSave(0);
    s.stages['3-7-1'] = { stars: 3, clears: 1, bestTime: 0, bestDps: 0, mvp: '' };
    s.stages['3-10-2'] = { stars: 2, clears: 1, bestTime: 0, bestDps: 0, mvp: '' };
    s.stages['3-8-0'] = { stars: 3, clears: 1, bestTime: 0, bestDps: 0, mvp: '' };
    expect(hardFirstDust(s)).toBe(R.firstDust + R.threeStarDust + R.firstDustBoss);
  });
});
