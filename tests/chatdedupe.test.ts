// 서버 채팅이 20초마다 다시 쌓이던 것 (따밤 10/19): 불러올 때 같은 줄은 하나로
import { describe, expect, it } from 'vitest';
import { dedupeChat } from '../src/game/social';
import { newSave } from '../src/game/state';

describe('채팅 중복 정리', () => {
  it('같은 채널·이름·글·시각은 하나만 · 다른 시각은 그대로', () => {
    const s = newSave(0);
    s.chat = [];
    const l = { name: '따밤', text: 'ㅎㅇ', at: 1000, ch: 'world' as const };
    for (let i = 0; i < 12; i++) s.chat.push({ ...l });
    s.chat.push({ ...l, at: 2000 });
    expect(dedupeChat(s)).toBe(11);
    expect(s.chat.map((x) => x.at)).toEqual([1000, 2000]);
  });
});
