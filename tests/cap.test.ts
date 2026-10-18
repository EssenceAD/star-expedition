// 한 번만 받는 보상(서사·이정표)은 주간 별가루 상한 밖 + v1.0.24 보상 계산 (웅스·형철 10/18)
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { claimMiles } from '../src/game/content';
import { capRefund, claimSaga } from '../src/game/saga';
import { newSave } from '../src/game/state';

describe('주간 상한과 한 번 보상', () => {
  it('상한에 닿아도 서사·이정표 별가루는 들어옴', () => {
    const s = newSave(0);
    const id = s.party[0];
    s.heroes[id].lv = 10;
    s.track!.w['earn:stardust'] = CONFIG.econ.cap.stardust;
    const before = s.cur.stardust ?? 0;
    expect(claimSaga(id, 'lv10', s)).not.toBeNull();
    expect(s.cur.stardust).toBe(before + 30);
    s.miles = [];
    s.stages['1-1-0'] = { clears: 1, stars: 3 } as never;
    const n = claimMiles(s);
    expect(n).toBeGreaterThan(0);
    expect(s.cur.stardust).toBe(before + 30 + n * CONFIG.content.milestoneDust);
  });
  it('보상 = 받은 서사·이정표 별가루 전부 + 10%', () => {
    const s = newSave(0);
    s.saga = { woongs: ['lv10', 'aff3', 'star3', 'side'], walwal: ['side', 'lv10'], gonu: ['lv10'], ikamolly: ['lv10'] };
    s.miles = Array.from({ length: 31 }, (_, i) => `m${i}`);
    expect(capRefund(s)).toBe(1485);
  });
});
