// 전투: AUTO로 끝까지 · 쿨타임·마나 · 진형 · 상태이상 · 인연 · 숫자 겹침
import { describe, expect, it } from 'vitest';
import { canCast, has, makeBattle, numMid, placeNum, requestSkill, starsOf, step, shortNum } from '../src/battle/sim';
import { CONFIG } from '../src/config';
import { buildStage, recLevel } from '../src/game/stage';
import { newHero, newSave, type Save } from '../src/game/state';
import { runBattle, seeded } from './helpers';

const save = (lv: number, party?: string[], extra: string[] = []): Save => {
  const s = newSave(0);
  for (const id of [...Object.keys(s.heroes), ...extra]) s.heroes[id] = { ...newHero(), lv };
  if (party) s.party = party;
  return s;
};
const fight = (b: ReturnType<typeof makeBattle>) => {
  for (let t = 0; t < 8 && b.phase !== 'fight'; t += 1 / 30) step(b, 1 / 30);
  for (let t = 0; t < 1.5; t += 1 / 30) step(b, 1 / 30);
};

describe('전투 한 판', () => {
  it('파일럿 1장 보스(1-10)를 추천 레벨 AUTO로 깬다 · 별 2개 이상 · 120초 안', () => {
    const st = { c: 1, s: 10, d: 0 };
    for (const seed of [1, 2, 3, 4, 5]) {
      const b = runBattle(buildStage(st, save(recLevel(st))), seed);
      expect(b.phase, `seed ${seed}`).toBe('win');
      expect(starsOf(b)).toBeGreaterThanOrEqual(2);
      expect(b.stats.time).toBeLessThan(120);
    }
  });
  it('스킬을 하나도 안 쓰면 보스가 훨씬 오래 걸리거나 진다 (스킬이 의미 있게)', () => {
    const st = { c: 1, s: 10, d: 0 };
    const s = save(recLevel(st));
    const a = runBattle(buildStage(st, s), 3, true);
    const m = runBattle(buildStage(st, s), 3, false);
    expect(m.phase === 'lose' || m.stats.time > a.stats.time * 1.3).toBe(true);
  });
  it('스킬 쿨타임 · 마나', () => {
    const b = makeBattle(buildStage({ c: 1, s: 1, d: 0 }, save(1)), { rnd: seeded(9) });
    fight(b);
    const w = b.heroes.find((h) => h.hero!.def.id === 'woongs')!;
    w.mana = 100;
    expect(canCast(b, w, 0)).toBe(true);
    requestSkill(b, w, 0);
    for (let t = 0; t < 1.5; t += 1 / 30) step(b, 1 / 30);
    expect(w.scd[0]).toBeGreaterThan(0);
    expect(canCast(b, w, 0)).toBe(false);
  });
  it('위치 3구역: 직업 위치(전방·중앙·후방) 순서로 오른쪽부터 서고, 서로 안 가리게 떨어져 있다', () => {
    // 편성 순서를 일부러 섞어도 화면 자리는 위치 순서
    const b = makeBattle(buildStage({ c: 1, s: 1, d: 0 }, save(1, ['walwal', 'gonu', 'ikamolly', 'woongs'])), { rnd: seeded(1) });
    expect(b.heroes.map((h) => h.hero!.def.id)).toEqual(['woongs', 'gonu', 'walwal', 'ikamolly']);
    expect(b.heroes.map((h) => h.zone)).toEqual([0, 1, 2, 2]);
    const pos = b.heroes.map((h) => [h.x, h.y] as const);
    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) expect(Math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1])).toBeGreaterThan(40);
    for (let i = 1; i < pos.length; i++) expect(pos[i][0]).toBeLessThan(pos[i - 1][0]);
  });
  it('적은 가장 앞 위치(전방)를 더 자주 노린다', () => {
    const b = makeBattle(buildStage({ c: 1, s: 9, d: 0 }, save(30)), { rnd: seeded(8) });
    b.auto = true;
    for (let t = 0; t < 40 && b.phase !== 'win'; t += 1 / 30) step(b, 1 / 30);
    const front = b.heroes.filter((h) => h.zone === 0).reduce((a, h) => a + h.taken, 0) / b.heroes.filter((h) => h.zone === 0).length;
    const back = b.heroes.filter((h) => h.zone === 2).reduce((a, h) => a + h.taken, 0) / b.heroes.filter((h) => h.zone === 2).length;
    expect(front).toBeGreaterThan(back);
  });
  it('침묵이면 스킬을 못 쓰고, 기절이면 평타도 멈춘다', () => {
    const b = makeBattle(buildStage({ c: 1, s: 1, d: 0 }, save(1)), { rnd: seeded(2) });
    fight(b);
    const w = b.heroes[0];
    w.mana = 100;
    w.st.silence = { t: 2, v: 0 };
    expect(canCast(b, w, 0)).toBe(false);
    w.st.silence = { t: 0, v: 0 };
    w.st.stun = { t: 2, v: 0 };
    expect(canCast(b, w, 0)).toBe(false);
  });
  it('화상은 시간이 지나며 체력을 깎고, 보호막은 피해를 먼저 받는다', () => {
    const b = makeBattle(buildStage({ c: 1, s: 1, d: 0 }, save(1)), { rnd: seeded(3) });
    fight(b);
    const m = b.mobs[0];
    const hp0 = m.hp;
    m.st.burn = { t: 2, v: m.max * 0.1 };
    for (const h of b.heroes) h.cd = 99;
    for (let t = 0; t < 1; t += 1 / 30) step(b, 1 / 30);
    expect(m.hp).toBeLessThan(hp0);
    const h = b.heroes[0];
    h.shield = 1e9;
    const hp = h.hp;
    for (let t = 0; t < 3; t += 1 / 30) step(b, 1 / 30);
    expect(h.hp).toBe(hp);
    expect(has(h, 'stun')).toBe(false);
  });
  it('인연: 삼총사(웅스·고느끼·왈왈콩)면 공속 보너스 + 대사', () => {
    const s = save(5, ['woongs', 'gonu', 'walwal', 'ikamolly']);
    const b = makeBattle(buildStage({ c: 1, s: 1, d: 0 }, s), { rnd: seeded(4) });
    expect(b.setup.bonds.map((x) => x.id)).toContain('port3');
    expect(b.heroes[0].mod.spd).toBeCloseTo(0.15);
    expect(b.says.length).toBe(3);
  });
});

describe('피해 숫자 겹침', () => {
  it('한 대상에 몰려도 떠 있는 숫자끼리 상자가 안 겹친다', () => {
    const b = makeBattle(buildStage({ c: 1, s: 1, d: 0 }, save(1)), { rnd: seeded(5) });
    for (let i = 0; i < CONFIG.combat.nums.rows * 3 - 1; i++) placeNum(b, 600, 200, 12345 + i * 777, i % 4 ? 'hit' : 'crit', i % 3 === 0);
    const ns = b.nums.filter((n) => n.t < CONFIG.combat.nums.life - 0.2);
    let overlaps = 0;
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) if (Math.abs(ns[i].x - ns[j].x) * 2 < ns[i].w + ns[j].w && Math.abs(numMid(ns[i]) - numMid(ns[j])) * 2 < ns[i].hgt + ns[j].hgt) overlaps++;
    expect(overlaps).toBe(0);
  });
  it('실제 전투 1-10 내내: 새 숫자가 나올 때 이미 떠 있는 숫자와 겹치는 비율이 5% 미만', () => {
    const st = { c: 1, s: 10, d: 0 };
    const b = makeBattle(buildStage(st, save(recLevel(st))), { rnd: seeded(6) });
    b.auto = true;
    let total = 0;
    let bad = 0;
    for (let t = 0; t < 200 && b.phase !== 'win' && b.phase !== 'lose'; t += 1 / 30) {
      const before = new Set(b.nums);
      step(b, 1 / 30);
      for (const n of b.nums) {
        if (before.has(n)) continue;
        total++;
        const rise = (x: typeof n) => x.t * CONFIG.combat.nums.rise;
        if ([...before].some((o) => o.t < CONFIG.combat.nums.life - 0.2 && Math.abs(o.x - n.x) * 2 < o.w + n.w && Math.abs(numMid(o) - rise(o) - numMid(n)) * 2 < o.hgt + n.hgt)) bad++;
      }
    }
    console.log('숫자 겹침', bad, '/', total);
    expect(total).toBeGreaterThan(50);
    expect(bad / total).toBeLessThan(0.05);
  });
  it('만·억 단위', () => {
    expect(shortNum(1234)).toBe('1,234');
    expect(shortNum(12345)).toBe('1.23만');
    expect(shortNum(123456789)).toBe('1.23억');
  });
});
