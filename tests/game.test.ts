// 저장(버전 이전) · 스테이지 열림 · 보상 · 장 클리어 합류 · 소탕 · 방치
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { collectSweep, computeOffline, claimOffline, startSweep, sweepDone } from '../src/game/idle';
import { addExp, expNeed } from '../src/game/heroes';
import { baseReward, nextStage, recordClear, taperAt, unlocked, diffOpen } from '../src/game/stage';
import { migrate, newSave, SAVE_VERSION } from '../src/game/state';
import { seeded } from './helpers';

const clear = (s: ReturnType<typeof newSave>, c: number, n: number, d = 0, stars = 3) => recordClear({ c, s: n, d }, { stars, time: 60, dps: 1000, mvp: 'woongs' }, s, seeded(1), 1e12);

describe('저장', () => {
  it('v1(파일럿) → v2: 기록은 옮기고 새 칸은 기본값', () => {
    const s = migrate({ version: 1, savedAt: 1, best: { pilot: 3 }, clears: 4 }, 100);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.pilot).toEqual({ clears: 4, best: 3 });
    expect(Object.keys(s.heroes)).toEqual(CONFIG.start.heroes);
    expect(s.cur.gold).toBe(CONFIG.start.gold);
  });
  it('망가진 저장 → 새로 · v2에 빠진 칸은 채움 · 미래 버전은 건드리지 않음', () => {
    expect(migrate(null).version).toBe(2);
    expect(migrate('x').version).toBe(2);
    const part = migrate({ version: 2, cur: { gold: 7 } });
    expect(part.cur.gold).toBe(7);
    expect(part.party.f0).toBe('woongs');
    expect(migrate({ version: 9, x: 1 })).toEqual({ version: 9, x: 1 });
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
    expect(r.got.stardust).toBe(CONFIG.reward.firstDust + CONFIG.reward.threeStarDust);
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

describe('소탕 · 방치', () => {
  it('별 3개만 · 시간이 지나야 판이 끝남 · 받으면 보상과 기록', () => {
    const s = newSave(0);
    expect(startSweep({ c: 1, s: 1, d: 0 }, 5, s, 0)).toBe(false);
    clear(s, 1, 1);
    const gold0 = s.cur.gold;
    expect(startSweep({ c: 1, s: 1, d: 0 }, 5, s, 0)).toBe(true);
    expect(startSweep({ c: 1, s: 1, d: 0 }, 5, s, 0)).toBe(false);
    expect(sweepDone(s, (CONFIG.sweep.secPerRun * 2 + 1) * 1000)).toBe(2);
    const h = collectSweep(s, (CONFIG.sweep.secPerRun * 2 + 1) * 1000, seeded(3));
    expect(h.runs).toBe(2);
    expect(s.cur.gold).toBeGreaterThan(gold0);
    const h2 = collectSweep(s, CONFIG.sweep.secPerRun * 10 * 1000, seeded(3));
    expect(h2.runs).toBe(3);
    expect(s.sweep).toBeNull();
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
