// 직업 9종 (STAR_EXPEDITION_SPEC §2) — 능력치 숫자는 CONFIG.jobs · 그림 없는 영웅의 자리표시자 시트·초상화도 여기서
export type JobId = 'knight' | 'warrior' | 'fighter' | 'assassin' | 'archer' | 'engineer' | 'mage' | 'priest' | 'druid';
export interface JobDef {
  id: JobId;
  name: string;
  /** 자리표시자 도트 시트 = 이 개척자의 동작 (PROGRESS §6 A) */
  sheet: 'woongs' | 'ikamolly' | 'walwal' | 'warmnight' | 'gonu';
  /** 「체크인」 초상화 mc_<이것>_<m|f>.png */
  mc: 'knight' | 'warrior' | 'rogue' | 'hunter' | 'mage' | 'priest';
  /** 전투 효과음 (combatSynth) */
  sfx: string;
  /** 무기 종류 (장비 B덩어리) */
  weapon: string;
}
export const JOBS: Record<JobId, JobDef> = {
  knight: { id: 'knight', name: '기사', sheet: 'woongs', mc: 'knight', sfx: 'skill_knight', weapon: '검과 방패' },
  warrior: { id: 'warrior', name: '전사', sheet: 'woongs', mc: 'warrior', sfx: 'skill_warrior', weapon: '대검' },
  fighter: { id: 'fighter', name: '격투가', sheet: 'woongs', mc: 'warrior', sfx: 'skill_warrior', weapon: '건틀릿' },
  assassin: { id: 'assassin', name: '암살자', sheet: 'gonu', mc: 'rogue', sfx: 'skill_rogue', weapon: '단검' },
  archer: { id: 'archer', name: '궁수', sheet: 'warmnight', mc: 'hunter', sfx: 'skill_hunter', weapon: '활' },
  engineer: { id: 'engineer', name: '기계공학자', sheet: 'warmnight', mc: 'hunter', sfx: 'skill_hunter', weapon: '총' },
  mage: { id: 'mage', name: '마법사', sheet: 'ikamolly', mc: 'mage', sfx: 'skill_mage', weapon: '지팡이' },
  priest: { id: 'priest', name: '사제', sheet: 'walwal', mc: 'priest', sfx: 'skill_priest', weapon: '성물' },
  druid: { id: 'druid', name: '드루이드', sheet: 'walwal', mc: 'priest', sfx: 'skill_priest', weapon: '토템' },
};
export const JOB_IDS = Object.keys(JOBS) as JobId[];
