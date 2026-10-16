// 데이터: 영웅 32명 · 직업 9 · 인연 · 스토리 · 그림 연결
import { describe, expect, it } from 'vitest';
import { BONDS } from '../src/data/bonds';
import { artOf, HEROES, heroOf } from '../src/data/heroes';
import { JOB_IDS } from '../src/data/jobs';
import { CHAPTER_MOBS } from '../src/data/mobs';
import { descPassive, descSkill } from '../src/data/skills';
import { CHAPTERS, PROLOGUE, SPEAKER } from '../src/data/story';
import { CONFIG } from '../src/config';
import { T } from '../src/theme/tokens';
import { existsSync } from 'node:fs';

describe('데이터', () => {
  it('영웅 32명 = 창립 13 + 전설 14 + 새 5 · id 겹침 없음', () => {
    expect(HEROES.length).toBe(32);
    expect(HEROES.filter((h) => h.origin === 'founder').length).toBe(13);
    expect(HEROES.filter((h) => h.origin === 'legend').length).toBe(14);
    expect(HEROES.filter((h) => h.origin === 'new').length).toBe(5);
    expect(new Set(HEROES.map((h) => h.id)).size).toBe(32);
  });
  it('직업 9종이 모두 쓰이고, 능력치가 config에 있다', () => {
    expect(JOB_IDS.length).toBe(9);
    for (const j of JOB_IDS) {
      expect(HEROES.some((h) => h.job === j), j).toBe(true);
      expect(CONFIG.jobs[j], j).toBeTruthy();
    }
  });
  it('스킬 3개 · 아이콘·속성 키가 토큰에 있다 · 설명이 만들어진다', () => {
    for (const h of HEROES) {
      expect(h.skills.length).toBe(3);
      expect(T.elem[h.elem as keyof typeof T.elem], `${h.id} elem`).toBeTruthy();
      for (const s of h.skills) {
        expect(T.icon[s.icon], `${h.id} ${s.name} icon`).toBeTruthy();
        expect(T.elem[s.elem as keyof typeof T.elem], `${h.id} ${s.name} elem`).toBeTruthy();
        expect(descSkill(s).length).toBeGreaterThan(4);
      }
      expect(descPassive(h.passive).length).toBeGreaterThan(4);
    }
  });
  it('그림: 개척자 5명은 자기 시트, 나머지는 자리표시자 + 초상화 파일이 있다', () => {
    for (const h of HEROES) {
      const a = artOf(h, T.battle.tint.length);
      expect(a.placeholder, h.id).toBe(!['woongs', 'ikamolly', 'walwal', 'warmnight', 'gonu'].includes(h.id));
      expect(existsSync(`public/art/portraits/${a.portrait}.png`), `${h.id} → ${a.portrait}`).toBe(true);
    }
  });
  it('인연 멤버가 모두 있는 영웅', () => {
    for (const b of BONDS) for (const m of b.members) expect(heroOf(m), `${b.id} ${m}`).toBeTruthy();
    for (const b of BONDS) for (const [id] of b.lines) expect(b.members, b.id).toContain(id);
  });
  it('스토리 10장 · 1~3장은 웨이브 10개와 대사 · 마지막은 보스 · 말하는 사람이 있다', () => {
    expect(CHAPTERS.length).toBe(CONFIG.story.chapters);
    expect(CHAPTER_MOBS.length).toBe(CONFIG.story.chapters);
    for (const c of CHAPTERS.slice(0, CONFIG.story.realChapters)) {
      expect(c.waves!.length).toBe(10);
      expect(c.waves![9]).toMatch(/B$/);
      for (const w of c.waves!.slice(0, 9)) expect(w).not.toMatch(/B/);
      for (const l of [...c.intro!, ...c.preBoss!, ...c.clear!]) expect(SPEAKER[l[0]] !== undefined || !!heroOf(l[0]), l[0]).toBe(true);
    }
    for (const l of PROLOGUE) expect(SPEAKER[l[0]] !== undefined || !!heroOf(l[0])).toBe(true);
  });
});
