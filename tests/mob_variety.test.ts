import { describe, expect, it } from 'vitest';
import { varyWaves, mobsAt } from '../src/game/stage';
import { CHAPTER_MOBS } from '../src/data/mobs';

describe('몹 다양화 (10/18)', () => {
  it('보스 앞 웨이브에 정예 1마리, 고유 몹이 섞임', () => {
    const v = varyWaves('wsg|gw|gsg|B');
    expect(v.split('|')[2]).toContain('E');
    expect((v.match(/E/g) ?? []).length).toBe(1);
    expect(v).toMatch(/[ab]/);
  });
  it('모든 장에 고유 몹·정예 이름이 있음', () => {
    for (const cm of CHAPTER_MOBS) for (const k of ['uniq1', 'uniq2', 'elite'] as const) expect(cm.names[k].length).toBeGreaterThan(1);
  });
  it('그림 경로가 지역 r3~r5를 가리킴', () => {
    const w = mobsAt(5, 'sss|www|ggg|B', 2).flat();
    const frames = w.map((m) => m.kind.anims.idle.frames[0]);
    expect(frames.some((f) => /mobs2\/swamp:r3c0/.test(f))).toBe(true);
    expect(frames.some((f) => /mobs2\/swamp:r5c0/.test(f))).toBe(true);
  });
});
