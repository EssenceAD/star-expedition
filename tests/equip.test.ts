// 일괄 장착 · 장비 고정 · 룬 자동 · 원정대 레벨 다시 셈 (형철 10/18)
import { describe, expect, it } from 'vitest';
import { recalcAccount } from '../src/game/account';
import { autoRunes, bulkEquip, equip, makeGear, makeRune, spareRunes } from '../src/game/gear';
import { newSave, newHero } from '../src/game/state';

describe('장비 정리', () => {
  it('일괄 장착: 파티 밖 영웅 장비도 가져오고, 장비 고정 영웅은 건드리지 않음', () => {
    const s = newSave(0);
    const [a, b] = s.party;
    s.heroes.hwang = newHero();
    s.heroes.ichae = newHero();
    const w1 = makeGear('armor', 4, 50, s, () => 0.5);
    const w2 = makeGear('armor', 4, 50, s, () => 0.5);
    s.items[w1.uid] = w1;
    s.items[w2.uid] = w2;
    equip('hwang', 'armor', w1, s);
    equip('ichae', 'armor', w2, s);
    s.heroes.ichae.gearLock = true;
    bulkEquip([a, b], s);
    expect(s.heroes.ichae.gear.armor).toBe(w2.uid);
    expect(s.heroes.hwang.gear.armor).toBeNull();
    expect([s.heroes[a].gear.armor, s.heroes[b].gear.armor]).toContain(w1.uid);
  });
  it('룬 빈 칸 자동: 남는 룬을 좋은 것부터', () => {
    const s = newSave(0);
    const g = makeGear('weapon', 4, 10, s, () => 0.5);
    s.items[g.uid] = g;
    for (const gr of [1, 3]) {
      const r = makeRune(gr, s, () => 0.5);
      s.items[r.uid] = r;
    }
    expect(autoRunes(g, s)).toBe(2);
    expect(spareRunes(s).length).toBe(0);
    expect((s.items[g.runes[0]!] as { grade: number }).grade).toBe(3);
  });
  it('원정대 레벨: 쓴 행동력으로 한 번 다시 셈 · 내려가지 않음', () => {
    const s = newSave(0);
    s.track.all.sta = 500;
    s.acc.lv = 6;
    recalcAccount(s);
    expect(s.acc.lv).toBeGreaterThanOrEqual(14);
    const lv = s.acc.lv;
    s.track.all.sta = 0;
    recalcAccount(s);
    expect(s.acc.lv).toBe(lv);
  });
});
