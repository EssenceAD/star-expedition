// 직업 9종 (STAR_EXPEDITION_SPEC §2) — 능력치 숫자는 CONFIG.jobs · 그림 없는 영웅의 자리표시자 시트·초상화도 여기서
/** 위치 3구역 (STAR_PLAN_v2 §1-3: 직업마다 고정) */
export type Zone = 'front' | 'mid' | 'back';
export const ZONES: Zone[] = ['front', 'mid', 'back'];
export const ZONE_NAME: Record<Zone, string> = { front: '전방', mid: '중앙', back: '후방' };
export type JobId = 'knight' | 'warrior' | 'fighter' | 'assassin' | 'archer' | 'engineer' | 'mage' | 'priest' | 'druid';
export interface JobDef {
  id: JobId;
  name: string;
  zone: Zone;
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
  knight: { id: 'knight', zone: 'front', name: '기사', sheet: 'woongs', mc: 'knight', sfx: 'skill_knight', weapon: '검과 방패' },
  warrior: { id: 'warrior', zone: 'front', name: '전사', sheet: 'woongs', mc: 'warrior', sfx: 'skill_warrior', weapon: '대검' },
  fighter: { id: 'fighter', zone: 'front', name: '격투가', sheet: 'woongs', mc: 'warrior', sfx: 'skill_warrior', weapon: '건틀릿' },
  assassin: { id: 'assassin', zone: 'mid', name: '암살자', sheet: 'gonu', mc: 'rogue', sfx: 'skill_rogue', weapon: '단검' },
  archer: { id: 'archer', zone: 'back', name: '궁수', sheet: 'warmnight', mc: 'hunter', sfx: 'skill_hunter', weapon: '활' },
  engineer: { id: 'engineer', zone: 'mid', name: '기계공학자', sheet: 'warmnight', mc: 'hunter', sfx: 'skill_hunter', weapon: '총' },
  mage: { id: 'mage', zone: 'back', name: '마법사', sheet: 'ikamolly', mc: 'mage', sfx: 'skill_mage', weapon: '지팡이' },
  priest: { id: 'priest', zone: 'back', name: '사제', sheet: 'walwal', mc: 'priest', sfx: 'skill_priest', weapon: '성물' },
  druid: { id: 'druid', zone: 'mid', name: '드루이드', sheet: 'walwal', mc: 'priest', sfx: 'skill_priest', weapon: '토템' },
};
export const JOB_IDS = Object.keys(JOBS) as JobId[];
