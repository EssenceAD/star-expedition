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
  it('영웅 36명 = 멤버 17(개척자 5 + 추가 멤버 11 + 황짐승) + 전설 14 + 새 5 · id 겹침 없음 (docs/MEMBERS.md)', () => {
    expect(HEROES.length).toBe(36);
    expect(HEROES.filter((h) => h.origin === 'founder').length).toBe(17);
    expect(HEROES.filter((h) => h.fiveStar).map((h) => h.name).sort()).toEqual(['고느끼', '따뜻한밤', '왈왈콩선생', '웅스', '이카몰리'].sort());
    expect(HEROES.filter((h) => h.origin === 'legend').length).toBe(14);
    expect(HEROES.filter((h) => h.origin === 'new').length).toBe(5);
    expect(new Set(HEROES.map((h) => h.id)).size).toBe(36);
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

describe('멤버 영웅 관계 (docs/MEMBERS.md · HEROES_ADD_4)', () => {
  it('멤버 영웅 17명 = 실멤버 길드 「별의 원정대」 명단 (개척자 5 + 추가 멤버 11 + 황짐승)', async () => {
    const { GUILDS } = await import('../src/game/social');
    const want = ['웅스', '고느끼', '이카몰리', '왈왈콩선생', '따뜻한밤', '세르미뉴', '클레이네', '팬더', '부브', '하응', '이치애', '재희아빠', '유월', '깡토끼', '딸기망고모찌', '신야군', '황짐승'];
    expect(GUILDS.find((g) => g.real)!.members.sort()).toEqual(want.sort());
  });
  it('관계: 인연 · 협공 컷인 자리 · 세르님 리스펙 대사 · 대사 3종 · 외형', async () => {
    const { BONDS, SER_ASK } = await import('../src/data/bonds');
    const { comboOf } = await import('../src/data/combos');
    for (const [a, b] of [['jaehi', 'warmnight'], ['mochi', 'kkangto'], ['sermi', 'shinya']]) {
      expect(BONDS.some((x) => x.members.includes(a) && x.members.includes(b)), `${a}+${b}`).toBe(true);
      expect(comboOf(a, b).name).not.toBe('협공');
    }
    expect(BONDS.some((x) => x.members.includes('ichae') && x.members.includes('kleine'))).toBe(true);
    expect(SER_ASK.length).toBeGreaterThanOrEqual(5);
    expect(SER_ASK.every(([id, t]) => HEROES.some((h) => h.id === id) && t.includes('세르님'))).toBe(true);
    for (const h of HEROES.filter((x) => ['sermi', 'ichae', 'mochi', 'jaehi'].includes(x.id))) {
      expect(h.voice?.length).toBe(3);
      expect(h.look?.length).toBeGreaterThan(10);
    }
    // 머리색이 다른 영웅과 안 겹치게 적어 둔 외형 (그림 주문서)
    expect(new Set(HEROES.filter((x) => ['sermi', 'ichae', 'mochi', 'jaehi'].includes(x.id)).map((h) => h.look!.split(' · ')[1])).size).toBe(4);
  });
});

describe('외전 대사 초안 (세르미뉴·이치애·딸기망고모찌·재희아빠)', () => {
  it('4명 모두 3막 + 끝 대사 · 말하는 사람은 영웅 id 또는 SPEAKER', async () => {
    const { SIDE } = await import('../src/data/side');
    const { SPEAKER } = await import('../src/data/story');
    for (const id of ['sermi', 'ichae', 'mochi', 'jaehi']) {
      const st = SIDE[id];
      expect(st.acts.length).toBe(3);
      for (const [who, text] of [...st.acts.flat(), ...st.clear]) {
        expect(who in SPEAKER || HEROES.some((h) => h.id === who), `${id} ${who}`).toBe(true);
        expect(text).not.toMatch(/박[힙혔힌]/);
      }
    }
  });
});
