// 경사 소식 (형철 10/18): 플레이 중 저장(S)에서 전설 장비·초월·최대 각성이면 소식 · 다른 저장(시뮬)은 조용히
import { describe, expect, it } from 'vitest';
import { makeGear, starUp } from '../src/game/gear';
import { newSave, newsBus, S, setSave } from '../src/game/state';

describe('경사 소식', () => {
  it('전설 장비 얻기·별 올리기는 소식 · 영웅 등급 아래나 시뮬 저장은 없음', () => {
    const got: string[] = [];
    newsBus.push((t) => got.push(t));
    setSave(newSave(0));
    S.acc.name = '시험';
    const leg = makeGear('weapon', 4, 1, S, () => 0.5);
    expect(got.length).toBe(1);
    expect(got[0]).toContain('전설 장비');
    makeGear('weapon', 3, 1, S, () => 0.5);
    makeGear('weapon', 4, 1, newSave(0), () => 0.5);
    expect(got.length).toBe(1);
    const food = makeGear('weapon', 4, 1, S, () => 0.5);
    S.cur.gold = 1e9;
    S.items[leg.uid] = leg;
    S.items[food.uid] = food;
    food.part = leg.part;
    expect(starUp(leg, food, S, () => 0)).toBe('ok');
    expect(got.at(-1)).toContain('2성 달성');
    newsBus.length = 0;
  });
});
