// B덩어리: 장비(강화·별·티어·옵션·룬·전수·판매/분해·소환·제작·장착) · 영웅 성장(각성·별·스킬·초월·물약·전용 무기) · 상점 · 소프트캡
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { autoEquip, bulk, craft, enhance, equip, expandBag, freeSummonLeft, fuseRunes, gearPower, makeGear, makeRune, socket, starUp, summon, tierUp, transfer, transferPreview, rerollRoll, rerollKeep, unequipAll } from '../src/game/gear';
import { assignShards, awaken, exUp, heroStarUp, skillUp, transcend, usePotion } from '../src/game/growth';
import { fullStats, heroPower, levelCap, statsOf } from '../src/game/heroes';
import { buyHero, buyItem, buyPack } from '../src/game/shop';
import { newSave, type Gear, type Save } from '../src/game/state';
import { seeded } from './helpers';

const rich = (): Save => {
  const s = newSave(0);
  Object.assign(s.cur, { gold: 1e9, stardust: 1e6, enh: 1e5, optTicket: 50, awakenStone: 500, transStone: 500, skillBook: 500, tierMat: 1e4, exp: 100, exShard: 500 });
  return s;
};
const put = (s: Save, g: Gear) => ((s.items[g.uid] = g), g);

describe('장비', () => {
  it('강화: +10까지 · 파괴 없음 · 실패하면 다음 확률이 오름 · 재료가 없으면 못 함', () => {
    const s = rich();
    const g = put(s, makeGear('weapon', 2, 0, s, seeded(1)));
    const rnd = seeded(2);
    let fails = 0;
    for (let i = 0; i < 400 && g.enh < 10; i++) {
      const before = g.pity;
      const r = enhance(g, s, rnd);
      if (r === 'fail' || r === 'drop') {
        fails++;
        expect(g.pity).toBeGreaterThan(before);
      }
      expect(g.enh).toBeGreaterThanOrEqual(0);
    }
    expect(g.enh).toBe(10);
    expect(fails).toBeGreaterThan(0);
    expect(enhance(g, s, rnd)).toBe('max');
    s.cur.enh = 0;
    const g2 = put(s, makeGear('armor', 0, 0, s, seeded(3)));
    expect(enhance(g2, s, rnd)).toBe('poor');
  });
  it('별 올리기: 같은 부위·등급만 먹임 · 먹이는 장비는 사라짐 · 실패 보정 · 5성 뒤 티어', () => {
    const s = rich();
    const rnd = seeded(4);
    const g = put(s, makeGear('acc', 1, 0, s, rnd));
    const other = put(s, makeGear('weapon', 1, 0, s, rnd));
    expect(starUp(g, other, s, rnd)).toBe('bad');
    expect(tierUp(g, s)).toBe('star');
    let guard = 0;
    while (g.star < 5 && guard++ < 500) {
      const f = put(s, makeGear('acc', 1, 0, s, rnd));
      starUp(g, f, s, rnd);
      expect(s.items[f.uid]).toBeUndefined();
    }
    expect(g.star).toBe(5);
    expect(tierUp(g, s)).toBe('ok');
    expect(g.tier).toBe(2);
  });
  it('옵션 바꾸기: 티켓 1장 · 기존/새 중 고름 · 같은 옵션 두 줄 안 나옴', () => {
    const s = rich();
    const g = put(s, makeGear('weapon', 4, 0, s, seeded(5)));
    expect(g.opts.length).toBe(4);
    const nu = rerollRoll(g, 0, s, seeded(6))!;
    expect(s.cur.optTicket).toBe(49);
    expect(g.opts.slice(1).map((o) => o.k)).not.toContain(nu.k);
    rerollKeep(g, 0, nu);
    expect(g.opts[0]).toEqual(nu);
  });
  it('룬: 칸에 꽂으면 능력에 더해짐 · 3개 합성 → 다음 등급', () => {
    const s = rich();
    const g = put(s, makeGear('weapon', 3, 0, s, seeded(7)));
    expect(g.runes.length).toBe(CONFIG.gear.grades[3].runes);
    for (let i = 0; i < 3; i++) {
      const r = makeRune(0, s, seeded(10 + i));
      s.items[r.uid] = r;
    }
    const up = fuseRunes(0, s, seeded(20))!;
    expect(up.grade).toBe(1);
    equip('woongs', 'weapon', g, s);
    const before = fullStats('woongs', s).st;
    up.stat = 'atkPct';
    socket(g, 0, up, s);
    expect(fullStats('woongs', s).st.atk).toBeGreaterThan(before.atk);
  });
  it('전수: 강화가 옮겨지고 주는 장비는 사라짐 · 등급이 낮은 장비로는 덜 옮겨짐', () => {
    const s = rich();
    const a = put(s, makeGear('armor', 3, 0, s, seeded(8)));
    const b = put(s, makeGear('armor', 2, 0, s, seeded(9)));
    a.enh = 8;
    expect(transferPreview(a, b)!.lv).toBe(8 - CONFIG.gear.transfer.gradeDrop[1]);
    expect(transfer(a, b, s)).toBe(true);
    expect(b.enh).toBe(7);
    expect(s.items[a.uid]).toBeUndefined();
  });
  it('장착·자동 장착·모두 해제 · 장비를 끼면 전투력이 오름', () => {
    const s = rich();
    for (const part of ['weapon', 'armor', 'acc', 'acc'] as const) put(s, makeGear(part, 2, 5, s, seeded(11)));
    const p0 = heroPower('woongs', s);
    expect(autoEquip('woongs', s)).toBe(4);
    expect(heroPower('woongs', s)).toBeGreaterThan(p0);
    unequipAll('woongs', s);
    expect(heroPower('woongs', s)).toBe(p0);
  });
  it('일괄 판매/분해는 잠금·장착 제외 · 가방 확장 · 소환 하루 무료 1회 · 제작', () => {
    const s = rich();
    const keep = put(s, makeGear('weapon', 0, 0, s, seeded(12)));
    keep.lock = true;
    const worn = put(s, makeGear('armor', 0, 0, s, seeded(13)));
    equip('woongs', 'armor', worn, s);
    put(s, makeGear('acc', 0, 0, s, seeded(14)));
    expect(bulk('sell', 0, s).n).toBe(1);
    expect(expandBag(s)).toBe(true);
    expect(s.bagSize).toBe(CONFIG.gear.bag.start + CONFIG.gear.bag.step);
    const dust = s.cur.stardust;
    expect(freeSummonLeft(s, 0)).toBe(1);
    expect((summon(1, 0, s, seeded(15), 0) as Gear[]).length).toBe(1);
    expect(s.cur.stardust).toBe(dust);
    expect(freeSummonLeft(s, 0)).toBe(0);
    expect((summon(11, 0, s, seeded(16), 0) as Gear[]).length).toBe(11);
    expect(s.cur.stardust).toBe(dust - CONFIG.gear.summon.ten);
    expect((craft('weapon', 0, s, seeded(17)) as Gear).grade).toBe(CONFIG.gear.craft.grade);
  });
  it('소프트캡: 치명타는 상한에서 멈추고, 넘친 만큼을 알려 줌', () => {
    const s = rich();
    const g = put(s, makeGear('acc', 4, 0, s, seeded(18)));
    g.opts = [{ k: 'crit', v: 0.9 }];
    equip('woongs', 'acc1', g, s);
    const { st, raw } = fullStats('woongs', s);
    expect(st.crit).toBe(CONFIG.gear.cap.crit);
    expect(raw.crit).toBeGreaterThan(CONFIG.gear.cap.crit);
    expect(gearPower(g)).toBeGreaterThan(0);
  });
});

describe('영웅 성장', () => {
  it('각성: 레벨이 상한일 때만 · 상한이 오름 · 물약으로 레벨', () => {
    const s = rich();
    expect(awaken('woongs', s)).toBe('need');
    s.cur.exp = 1e6;
    usePotion('woongs', 1e6, s);
    expect(s.heroes.woongs.lv).toBe(levelCap('woongs', s));
    expect(awaken('woongs', s)).toBe('ok');
    expect(levelCap('woongs', s)).toBe(CONFIG.hero.levelCap[1]);
  });
  it('별·스킬 레벨·초월(5성+각성 뒤 · 2택)·전용 무기 → 능력이 오름', () => {
    const s = rich();
    const a0 = statsOf('woongs', s).atk;
    expect(heroStarUp('woongs', s)).toBe('ok');
    expect(statsOf('woongs', s).atk).toBeGreaterThan(a0);
    expect(skillUp('woongs', 2, s)).toBe('ok');
    expect(statsOf('woongs', s).skillLv[2]).toBe(2);
    expect(transcend('woongs', 0, s)).toBe('need');
    while (s.heroes.woongs.star < 5) heroStarUp('woongs', s);
    s.heroes.woongs.lv = levelCap('woongs', s);
    awaken('woongs', s);
    const a1 = statsOf('woongs', s).atk;
    expect(transcend('woongs', 0, s)).toBe('ok');
    expect(statsOf('woongs', s).atk).toBeGreaterThan(a1);
    expect(assignShards('woongs', CONFIG.exWeapon.shards, s)).toBe(true);
    const a2 = statsOf('woongs', s).atk;
    expect(exUp('woongs', s)).toBe('ok');
    expect(statsOf('woongs', s).atk).toBeGreaterThan(a2);
  });
});

describe('상점', () => {
  it('영웅 상점: 별가루로 확정 영입 · 이미 있으면 안 됨 · 꾸러미는 한 번', () => {
    const s = newSave(0);
    s.cur.stardust = CONFIG.shop.hero.founder;
    expect(buyHero('hwang', s)).toBe('ok');
    expect(s.heroes.hwang).toBeTruthy();
    expect(buyHero('hwang', s)).toBe('owned');
    expect(buyHero('kleine', s)).toBe('poor');
    s.cur.stardust = 1e4;
    expect(buyPack('starter', s)).toBe('ok');
    expect(buyPack('starter', s)).toBe('done');
    s.cur.gold = 1e6;
    expect(buyItem('potion', s)).toBe('ok');
  });
});
