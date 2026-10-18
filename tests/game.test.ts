// 저장(버전 이전) · 스테이지 열림 · 보상 · 장 클리어 합류 · 소탕 · 방치
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { computeOffline, claimOffline } from '../src/game/idle';
import { accNeed, boostMult, buyBooster, buyStamina, stamina, staMax, useStamina } from '../src/game/account';
import { addExp, expNeed } from '../src/game/heroes';
import { baseReward, nextStage, recordClear, repeatBattle, taperAt, unlocked, diffOpen } from '../src/game/stage';
import { migrate, newSave, SAVE_VERSION } from '../src/game/state';
import { seeded } from './helpers';

const clear = (s: ReturnType<typeof newSave>, c: number, n: number, d = 0, stars = 3) => recordClear({ c, s: n, d }, { stars, time: 60, dps: 1000, mvp: 'woongs' }, s, seeded(1), 1e12);

describe('저장', () => {
  it('v1(파일럿) → v2: 기록은 옮기고 새 칸은 기본값', () => {
    const s = migrate({ version: 1, savedAt: 1, best: { pilot: 3 }, clears: 4 }, 100);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.pilot).toEqual({ clears: 4, best: 3 });
    expect(Object.keys(s.heroes)).toEqual(CONFIG.start.heroes);
    expect(CONFIG.start.heroes.length).toBe(4);
    expect(s.cur.gold).toBe(CONFIG.start.gold);
  });
  it('망가진 저장 → 새로 · 빠진 칸은 채움 · 미래 버전은 건드리지 않음', () => {
    expect(migrate(null).version).toBe(SAVE_VERSION);
    expect(migrate('x').version).toBe(SAVE_VERSION);
    const part = migrate({ version: 3, cur: { gold: 7 } });
    expect(part.cur.gold).toBe(7);
    expect(part.party).toEqual(CONFIG.start.party);
    expect(migrate({ version: 9, x: 1 })).toEqual({ version: 9, x: 1 });
  });
  it('v2(앞2/뒤2 편성 · 소탕) → v4: 편성은 목록으로, 소탕은 없애고, 다섯 별은 모두 있게', () => {
    const v2 = { version: 2, party: { f0: 'woongs', f1: 'warmnight', b0: 'ikamolly', b1: null }, heroes: { woongs: { lv: 7, exp: 3 }, warmnight: { lv: 2, exp: 0 }, ikamolly: { lv: 1, exp: 0 }, walwal: { lv: 1, exp: 0 } }, sweep: { stage: '1-1-0' }, cur: { gold: 9 }, stages: {}, seen: {} };
    const s = migrate(v2, 5);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.party).toEqual(['woongs', 'warmnight', 'ikamolly']);
    expect(s.heroes.woongs.star).toBe(1);
    expect(s.heroes.woongs.gear.weapon).toBeNull();
    expect(s.items).toEqual({});
    expect(s.heroes.woongs.lv).toBe(7);
    expect(s.heroes.gonu).toBeTruthy();
    expect((s as unknown as Record<string, unknown>).sweep).toBeUndefined();
    expect(s.acc.lv).toBe(1);
  });
});

describe('스테이지', () => {
  it('열림: 1-1 → 순서대로 · 장 넘어가기 · 어려움은 그 장 보통 10 클리어 뒤', () => {
    const s = newSave(0);
    expect(unlocked({ c: 1, s: 1, d: 0 }, s)).toBe(true);
    expect(unlocked({ c: 1, s: 2, d: 0 }, s)).toBe(false);
    expect(diffOpen(1, 1, s)).toBe(false);
    for (let n = 1; n <= 10; n++) clear(s, 1, n);
    expect(unlocked({ c: 2, s: 1, d: 0 }, s)).toBe(true);
    expect(diffOpen(1, 1, s)).toBe(true);
    expect(unlocked({ c: 1, s: 1, d: 1 }, s)).toBe(true);
    expect(nextStage(s)).toEqual({ c: 2, s: 1, d: 0 });
  });
  it('첫 클리어 별가루 · 1장 클리어로 루나 합류 · 기록', () => {
    const s = newSave(0);
    const r = clear(s, 1, 1);
    expect(r.first).toBe(true);
    const base = CONFIG.reward.firstDust + CONFIG.reward.threeStarDust;
    expect([base, base + CONFIG.reward.dust.n]).toContain(r.got.stardust);
    expect(clear(s, 1, 1).first).toBe(false);
    for (let n = 2; n <= 10; n++) clear(s, 1, n);
    expect(s.heroes.luna).toBeTruthy();
    expect(s.stages['1-1-0'].clears).toBe(2);
  });
  it('금화는 오늘 판 수가 많아지면 줄고(taper), 경험치는 그대로', () => {
    expect(taperAt(1)).toBe(1);
    expect(taperAt(200)).toBe(0.5);
    expect(taperAt(1000)).toBe(0.25);
    const r = baseReward({ c: 2, s: 3, d: 1 }, seeded(2), []);
    expect(r.gold).toBeGreaterThan(baseReward({ c: 2, s: 3, d: 0 }, seeded(2), []).gold);
  });
  it('레벨업 · 상한에서 멈춤', () => {
    const s = newSave(0);
    expect(addExp('woongs', expNeed(1) + expNeed(2), s)).toBe(2);
    expect(s.heroes.woongs.lv).toBe(3);
    addExp('woongs', 1e12, s);
    expect(s.heroes.woongs.lv).toBe(CONFIG.hero.levelCap[0]);
  });
});

describe('행동력 · 반복 전투 · 부스터 · 방치', () => {
  it('행동력: 시간으로 차고 최대에서 멈춤 · 쓰면 원정대 경험치 · 레벨업이면 가득', () => {
    const s = newSave(0);
    s.sta = { n: 0, at: 0 };
    expect(stamina(s, CONFIG.stamina.regenSec * 3 * 1000)).toBe(3);
    expect(stamina(s, 1e12)).toBe(staMax(s));
    s.sta = { n: 100, at: 0 };
    const r = useStamina(accNeed(1), s, 1);
    expect(r.ok).toBe(true);
    expect(r.up).toBe(1);
    expect(s.acc.lv).toBe(2);
    expect(s.sta.n).toBeGreaterThanOrEqual(staMax(s));
    s.sta = { n: 2, at: 1e12 };
    expect(useStamina(6, s, 1e12).ok).toBe(false);
    s.cur.stardust = CONFIG.stamina.buyDust;
    expect(buyStamina(s, 1e12)).toBe(true);
    expect(s.sta.n).toBe(2 + CONFIG.stamina.buyN);
  });
  it('반복 전투: 별 3개만 · 바로 끝 · 행동력 n × 비용 · 모자라면 되는 만큼', () => {
    const s = newSave(0);
    expect(repeatBattle({ c: 1, s: 1, d: 0 }, 3, s, seeded(1), 1)).toBeNull();
    clear(s, 1, 1);
    s.sta = { n: CONFIG.stamina.cost[0] * 3 + 1, at: 1e12 };
    s.acc.exp = -1e9; // 레벨업으로 가득 차는 일 없게
    const gold = s.cur.gold;
    const h = repeatBattle({ c: 1, s: 1, d: 0 }, 5, s, seeded(1), 1e12)!;
    expect(h.runs).toBe(3);
    expect(s.cur.gold).toBeGreaterThan(gold);
    expect(s.sta.n).toBe(1);
    expect(s.stages['1-1-0'].clears).toBe(4);
  });
  it('부스터: 금화로 1시간 · 전리품 2배', () => {
    const s = newSave(0);
    expect(boostMult(s, 0)).toBe(1);
    expect(buyBooster(s, 0)).toBe(true);
    expect(boostMult(s, 1000)).toBe(CONFIG.booster.mult);
    expect(boostMult(s, CONFIG.booster.sec * 1000 + 1)).toBe(1);
  });
  it('방치: 깬 스테이지 없으면 없음 · 최대 시간까지만 · 받으면 금화·경험치', () => {
    const s = newSave(0);
    s.lastSeen = 0;
    expect(computeOffline(s, 3600e3)).toBeNull();
    clear(s, 1, 3);
    s.lastSeen = 0;
    const a = computeOffline(s, 3 * 3600e3)!;
    const b = computeOffline(s, 100 * 3600e3)!;
    expect(b.seconds).toBe(CONFIG.offline.maxHours * 3600);
    expect(b.reward.gold).toBeGreaterThan(a.reward.gold);
    const g = s.cur.gold;
    claimOffline(b, s, 1e12);
    expect(s.cur.gold).toBe(g + b.reward.gold);
  });
});

describe('주간 획득 상한 (B 보강 §4)', () => {
  it('별가루·영웅 재료는 한 주에 상한까지만 · 우편 보상은 상한 밖 · 다음 주에 다시', async () => {
    const { addCur, capLeft, newSave, rollTrack } = await import('../src/game/state');
    const { CONFIG } = await import('../src/config');
    const { buyItem } = await import('../src/game/shop');
    const t0 = Date.UTC(2026, 9, 19, 3);
    const s = newSave(t0);
    rollTrack(s, t0);
    const cap = CONFIG.econ.cap.stardust;
    const d0 = s.cur.stardust;
    addCur('stardust', cap + 500, s);
    expect(s.cur.stardust - d0).toBe(cap);
    expect(capLeft('stardust', s)).toBe(0);
    addCur('stardust', 100, s, true);
    expect(s.cur.stardust - d0).toBe(cap + 100);
    addCur('gold', 1e7, s);
    expect(s.cur.gold).toBeGreaterThanOrEqual(1e7);
    // 상한에 걸리는 물건은 안 팖 (재화만 날리지 않게)
    s.track.w['earn:transStone'] = CONFIG.econ.cap.transStone;
    expect(buyItem('trans', s)).toBe('cap');
    rollTrack(s, t0 + 7 * 86400e3);
    expect(capLeft('stardust', s)).toBe(cap);
  });
});

describe('코스튬 (그림 3차)', () => {
  it('별가루로 사고 · 가진 영웅만 입기 · 입으면 전신 그림이 코스튬 그림 · 옛 저장에 칸 채움', async () => {
    const { buyCostume, fullbodyPath, hasCostume, wearCostume, costumeStock } = await import('../src/game/costume');
    const { CONFIG } = await import('../src/config');
    const { migrate, newSave } = await import('../src/game/state');
    const s = newSave(0);
    expect(costumeStock().length).toBe(CONFIG.costume.festival.heroes.length);
    expect(wearCostume('woongs', 'festival', s)).toBe(false);
    s.cur.stardust = 0;
    expect(buyCostume('festival', 'woongs', s)).toBe('poor');
    s.cur.stardust = 5000;
    expect(buyCostume('festival', 'woongs', s)).toBe('ok');
    expect(s.cur.stardust).toBe(5000 - CONFIG.costume.festival.dust);
    expect(buyCostume('festival', 'woongs', s)).toBe('owned');
    expect(buyCostume('festival', 'aria', s)).toBe('none');
    expect(hasCostume('festival', 'woongs', s)).toBe(true);
    expect(fullbodyPath('woongs', s)).toBe('fullbody/woongs.png');
    expect(wearCostume('woongs', 'festival', s)).toBe(true);
    expect(fullbodyPath('woongs', s)).toBe('costume_festival/woongs.png');
    wearCostume('woongs', null, s);
    expect(fullbodyPath('woongs', s)).toBe('fullbody/woongs.png');
    const old = JSON.parse(JSON.stringify(s));
    delete old.costumes;
    expect(migrate({ ...old, version: 7 }).costumes).toEqual([]);
  });
});
