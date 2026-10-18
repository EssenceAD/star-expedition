// 영웅 36명 — 멤버 영웅 17 (docs/MEMBERS.md 최우선: 개척자 5 + 추가 멤버 11 + 황짐승) · 오리지널 19 (「체크인」 전설 14 · 스토리 5)
//  그림: 36명 모두 자기 전투 도트 시트 (public/art/px2/<id> · docs/SPRITES_1017.md)
//  초상화: 개척자 star_<id> · 전설 legend_<key> · 그 외 「체크인」 mc_<직업>_<m|f> (그림 없는 영웅)
//  능력치 숫자는 CONFIG.jobs × stat(영웅별 배수)
import { CONFIG } from '../config';
import { loadParts, type AnimSet } from '../sprite/sheet';
import { JOBS, type JobId } from './jobs';
import { pas, sk, type PassiveDef, type SkillDef } from './skills';

/** founder = 멤버 영웅 17명 (docs/MEMBERS.md) · legend = 「체크인」 전설 · new = 스토리 오리지널 */
export type Origin = 'founder' | 'legend' | 'new';
export interface HeroDef {
  id: string;
  name: string;
  gender: 'm' | 'f';
  job: JobId;
  title: string;
  concept: string;
  origin: Origin;
  /** 상징 속성 (T.elem 키 · DPS 미터·잔상 색) */
  elem: string;
  passive: PassiveDef;
  skills: [SkillDef, SkillDef, SkillDef];
  /** 직업 기본 능력치에 곱 (없으면 1) */
  stat?: { hp?: number; atk?: number; def?: number };
  /** 이 장을 깨면 합류 (지역 전설) */
  joinChapter?: number;
  /** 전용 무기 이름 (B덩어리) */
  exWeapon?: string;
  /** 「체크인」 개척자 (다섯 별) */
  fiveStar?: boolean;
  /** 보스 전장 그로기 깎는 배수 (없으면 1 · 세르미뉴 「공략 담당」) */
  groggy?: number;
  /** 대사 3종: 기본 · 웃음 · 진지 */
  voice?: [string, string, string];
  /** 외형 (그림 주문서 · 실루엣·머리색이 다른 영웅과 안 겹치게) */
  look?: string;
}

export const HEROES: HeroDef[] = [
  // ───────── 멤버 영웅 17명 (docs/MEMBERS.md · 개척자 5 + 추가 멤버 11 + 황짐승) ─────────
  {
    id: 'hwang', name: '황짐승', gender: 'm', job: 'druid', title: '야성의 여관 주인', concept: '평소 느긋한 사장님, 전투 시 짐승 변신. 어깨의 숲 정령 「코드」', origin: 'founder', elem: 'beast', exWeapon: '숲의 계약서',
    look: '구릿빛 피부 · 멋진 수염 (형철 본인) · 느긋한 사장님 인상 · 어깨 위 숲 정령 「코드」',
    passive: pas('야성 해방', { k: 'lowHp', s: 'spd', v: 0.35, at: 0.3 }),
    skills: [
      sk(0, '짐승의 발톱', 'claw', 'beast', 'slash', { k: 'dmg', to: 'front', m: 1.6, n: 2 }),
      sk(1, '영업 개시', 'gold', 'gold', 'ring', { k: 'dmg', to: 'all', m: 1.2, st: { s: 'atkDown', dur: 6, v: 0.2 } }),
      sk(2, '코드에게 속삭이기', 'whisper', 'nature', 'pillar', { k: 'buff', to: 'allies', s: 'atkUp', v: 0.25, dur: 10 }, { k: 'mana', to: 'allies', v: 10 }),
    ],
  },
  {
    id: 'kleine', name: '클레이네', gender: 'f', job: 'mage', title: '길드의 별', concept: '길드 마스터, 우아·카리스마', origin: 'founder', elem: 'light',
    passive: pas('인기 만점', { k: 'stat', s: 'mana', v: 0.1, team: true }),
    skills: [
      sk(0, '집결 명령', 'crown', 'gold', 'pillar', { k: 'buff', to: 'allies', s: 'spdUp', v: 0.2, dur: 6 }, { k: 'dmg', to: 'front', m: 1.6 }),
      sk(1, '별비', 'star', 'light', 'meteor', { k: 'dmg', to: 'all', m: 0.9, n: 3 }),
      sk(2, '여왕의 시선', 'eye', 'shadow', 'pierce', { k: 'dmg', to: 'front', m: 5.5, st: { s: 'stun', dur: 2 } }),
    ],
  },
  {
    id: 'panda', name: '팬더', gender: 'm', job: 'fighter', title: '대나무 숲의 주먹', concept: '판다 무늬 도복을 입은 사람, 술 호리병, 푸근·유머', origin: 'founder', elem: 'nature', stat: { hp: 1.15 },
    passive: pas('여유로운 호흡', { k: 'stat', s: 'dmgCut', v: 0.1 }),
    skills: [
      sk(0, '곰 손바닥', 'fist', 'earth', 'burst', { k: 'dmg', to: 'front', m: 2.6, st: { s: 'stun', dur: 1 } }),
      sk(1, '취권', 'bottle', 'nature', 'slash', { k: 'dmg', to: 'random', m: 0.9, n: 5 }),
      sk(2, '배 튕기기', 'belly', 'earth', 'smash', { k: 'taunt', dur: 4 }, { k: 'shield', to: 'self', m: 4 }, { k: 'dmg', to: 'all', m: 1.6 }),
    ],
  },
  {
    id: 'bube', name: '부브', gender: 'm', job: 'knight', title: '황금 갑주의 후원자', concept: '길드 큰형님, 멋진 중년', origin: 'founder', elem: 'gold',
    passive: pas('여유', { k: 'stat', s: 'def', v: 0.15 }),
    skills: [
      sk(0, '후원금', 'gold', 'gold', 'shield', { k: 'shield', to: 'allies', m: 1.5 }),
      sk(1, '품격의 일격', 'pierce', 'gold', 'pierce', { k: 'dmg', to: 'front', m: 3.2, st: { s: 'stun', dur: 1.5 } }),
      sk(2, '큰형님의 등', 'shield', 'gold', 'ring', { k: 'taunt', dur: 5 }, { k: 'buff', to: 'allies', s: 'guard', v: 0.3, dur: 6 }),
    ],
  },
  {
    id: 'haeung', name: '하응', gender: 'm', job: 'knight', title: '앞장서는 방패', concept: '어리지만 리더', origin: 'founder', elem: 'steel',
    passive: pas('물러서지 않는다', { k: 'lowHp', s: 'dmgCut', v: 0.25, at: 0.4 }),
    skills: [
      sk(0, '선봉', 'taunt', 'steel', 'ring', { k: 'taunt', dur: 4 }, { k: 'shield', to: 'self', m: 3 }),
      sk(1, '방패 벽', 'shield', 'wave', 'shield', { k: 'buff', to: 'frontAllies', s: 'guard', v: 0.4, dur: 6 }),
      sk(2, '반격의 일격', 'pierce', 'steel', 'pierce', { k: 'dmg', to: 'front', m: 5, st: { s: 'stun', dur: 2 } }),
    ],
  },
  {
    id: 'yuwol', name: '유월', gender: 'm', job: 'engineer', title: '키다리 장치술사', concept: '마르고 키 큼, 게임 센스, 고글·드론', origin: 'founder', elem: 'wave',
    passive: pas('공략왕', { k: 'stat', s: 'crit', v: 0.1, team: true }),
    skills: [
      sk(0, '드론 출격', 'drone', 'wave', 'bolt', { k: 'dmg', to: 'random', m: 0.9, n: 4 }),
      sk(1, '함정 설치', 'trap', 'earth', 'ring', { k: 'dmg', to: 'all', m: 1.3, st: { s: 'slow', dur: 5 } }),
      sk(2, '풀가동', 'gear', 'wave', 'meteor', { k: 'dmg', to: 'all', m: 1.1, n: 3 }, { k: 'buff', to: 'self', s: 'spdUp', v: 0.3, dur: 8 }),
    ],
  },
  {
    id: 'shinya', name: '신야군', gender: 'm', job: 'archer', title: '말없는 저격수', concept: '조용히 깊게 파고듦, 착한 아싸. 석궁+노트', origin: 'founder', elem: 'shadow',
    passive: pas('독자노선', { k: 'solo', v: 0.2 }),
    skills: [
      sk(0, '약점 기록', 'note', 'shadow', 'bolt', { k: 'dmg', to: 'front', m: 1.6, st: { s: 'atkDown', dur: 8, v: 0.15 } }),
      sk(1, '정밀 사격', 'arrow', 'shadow', 'pierce', { k: 'dmg', to: 'front', m: 4.2, crit: true }),
      sk(2, '조용한 엄호', 'veil', 'shadow', 'shield', { k: 'shield', to: 'lowest', m: 2.5 }, { k: 'dmg', to: 'back', m: 4.5 }),
    ],
  },
  {
    id: 'kkangto', name: '깡토끼', gender: 'f', job: 'mage', title: '폭발하는 토끼', concept: '여장부, 원거리 파괴, 동물 앞에선 순함. 토끼 귀 모자+망치형 지팡이', origin: 'founder', elem: 'pink',
    passive: pas('의외의 순정', { k: 'stat', s: 'heal', v: 0.1, team: true }),
    skills: [
      sk(0, '깡!', 'hammer', 'pink', 'smash', { k: 'dmg', to: 'front', m: 2.4, st: { s: 'stun', dur: 1.5 } }),
      sk(1, '싹 다 날려', 'rabbit', 'fire', 'burst', { k: 'dmg', to: 'all', m: 2.1 }),
      sk(2, '분노 장전', 'bolt', 'fire', 'meteor', { k: 'buff', to: 'self', s: 'atkUp', v: 0.4, dur: 8 }, { k: 'dmg', to: 'all', m: 1, n: 3 }),
    ],
  },
  {
    id: 'woongs', name: '웅스', gender: 'm', job: 'warrior', title: '첫 번째 칼날', concept: '「체크인」 다섯 별. 양손 대검, 사냥·강화 진심, 온천 사랑. 삼총사 막내', origin: 'founder', elem: 'ember', fiveStar: true,
    look: '날씬한 체형 · 동그란 안경 · 장궁 · 허리에 등불 (형철 10/17 다시 그림)', stat: { hp: 1.1 },
    passive: pas('투지', { k: 'lowHp', s: 'atk', v: 0.25, at: 0.5 }),
    skills: [
      sk(0, '회오리 베기', 'slash', 'ember', 'slash', { k: 'dmg', to: 'all', m: 1.4, n: 2 }),
      sk(1, '대지 가르기', 'smash', 'earth', 'smash', { k: 'dmg', to: 'front', m: 3.4, st: { s: 'stun', dur: 1 } }),
      sk(2, '별빛 관통', 'pierce', 'light', 'pierce', { k: 'dmg', to: 'front', m: 7, crit: true }),
    ],
  },
  {
    id: 'gonu', name: '고느끼', gender: 'f', job: 'assassin', title: '무대 위의 그림자', concept: '「체크인」 다섯 별. 실제 뮤지컬 배우, 노래하며 싸우는 암살자', origin: 'founder', elem: 'pink', fiveStar: true,
    passive: pas('주연의 존재감', { k: 'stat', s: 'crit', v: 0.15 }),
    skills: [
      sk(0, '서곡', 'song', 'pink', 'ring', { k: 'buff', to: 'allies', s: 'spdUp', v: 0.25, dur: 8 }),
      sk(1, '암전', 'dark', 'shadow', 'burst', { k: 'dmg', to: 'all', m: 1.5, st: { s: 'silence', dur: 3 } }),
      sk(2, '커튼콜', 'dagger', 'pink', 'slash', { k: 'dmg', to: 'front', m: 1.6, n: 4 }),
    ],
  },
  {
    id: 'walwal', name: '왈왈콩선생', gender: 'f', job: 'priest', title: '밤길의 간호사', concept: '「체크인」 다섯 별. 실제 간호사, 응급 처치 사제', origin: 'founder', elem: 'holy', fiveStar: true,
    passive: pas('밤 근무', { k: 'stat', s: 'heal', v: 0.15 }),
    skills: [
      sk(0, '응급 처치', 'heal', 'nature', 'pillar', { k: 'heal', to: 'lowest', m: 4.5 }),
      sk(1, '주사 한 방', 'needle', 'nature', 'heal', { k: 'regen', to: 'allies', m: 0.4, dur: 5 }),
      sk(2, '안정을 취하세요', 'bed', 'holy', 'shield', { k: 'shield', to: 'allies', m: 3.5 }),
    ],
  },
  {
    id: 'ikamolly', name: '이카몰리', gender: 'f', job: 'mage', title: '첫 번째 바람', concept: '「체크인」 다섯 별. 바람개비 지팡이', origin: 'founder', elem: 'wind', fiveStar: true,
    passive: pas('마력 순환', { k: 'onCast', mana: 12 }),
    skills: [
      sk(0, '화염구', 'fire', 'fire', 'burst', { k: 'dmg', to: 'front', m: 3.1, st: { s: 'burn', dur: 4, v: 0.25 } }),
      sk(1, '서리 고리', 'frost', 'ice', 'ring', { k: 'dmg', to: 'all', m: 1.7, st: { s: 'slow', dur: 4 } }),
      sk(2, '별똥비', 'meteor', 'shadow', 'meteor', { k: 'dmg', to: 'all', m: 2.7, n: 3 }),
    ],
  },
  {
    id: 'warmnight', name: '따뜻한밤', gender: 'm', job: 'archer', title: '지도 끝의 등불', concept: '「체크인」 다섯 별. 장궁+허리 등불, 길잡이', origin: 'founder', elem: 'ember', fiveStar: true,
    passive: pas('밤의 등불', { k: 'teamLowGuard', v: 0.1 }),
    skills: [
      sk(0, '불씨 화살', 'arrow', 'ember', 'burst', { k: 'dmg', to: 'front', m: 3, st: { s: 'stun', dur: 1.5 } }),
      sk(1, '별빛 화살비', 'rain', 'light', 'meteor', { k: 'dmg', to: 'all', m: 1.9, n: 3 }),
      sk(2, '따뜻한 등불', 'lamp', 'ember', 'pillar', { k: 'buff', to: 'allies', s: 'guard', v: 0.3, dur: 6 }),
    ],
  },
  // ───────── 「체크인」 전설 14명 ─────────
  {
    id: 'elysia', name: '엘리시아', gender: 'f', job: 'knight', title: '은빛 기사', concept: '도도한 귀족 여기사. 칭찬에 약하다', origin: 'legend', elem: 'steel',
    passive: pas('은빛 서약', { k: 'stat', s: 'atk', v: 0.15 }),
    skills: [
      sk(0, '은빛 찌르기', 'pierce', 'steel', 'pierce', { k: 'dmg', to: 'front', m: 2.6 }),
      sk(1, '서약의 방패', 'shield', 'steel', 'shield', { k: 'shield', to: 'frontAllies', m: 4 }, { k: 'taunt', dur: 3 }),
      sk(2, '귀족의 결투', 'crown', 'light', 'pierce', { k: 'dmg', to: 'front', m: 6, crit: true }),
    ],
  },
  {
    id: 'ceres', name: '세레스', gender: 'f', job: 'knight', title: '왕실 기사', concept: '땋은 왕관 머리의 수줍은 모범생', origin: 'legend', elem: 'holy',
    passive: pas('왕실 방패', { k: 'stat', s: 'hp', v: 0.2 }),
    skills: [
      sk(0, '예법의 일격', 'pierce', 'holy', 'slash', { k: 'dmg', to: 'front', m: 2.2, st: { s: 'stun', dur: 1 } }),
      sk(1, '왕실의 가호', 'crown', 'holy', 'shield', { k: 'shield', to: 'allies', m: 2 }),
      sk(2, '수호 맹세', 'shield', 'holy', 'ring', { k: 'taunt', dur: 6 }, { k: 'buff', to: 'self', s: 'guard', v: 0.5, dur: 6 }),
    ],
  },
  {
    id: 'leon', name: '레온', gender: 'm', job: 'knight', title: '사자왕', concept: '금발 갈기머리 황금 갑옷 미남', origin: 'legend', elem: 'gold',
    passive: pas('사자왕의 위엄', { k: 'stat', s: 'atk', v: 0.08, team: true }),
    skills: [
      sk(0, '사자 발톱', 'lion', 'gold', 'slash', { k: 'dmg', to: 'front', m: 1.4, n: 2 }),
      sk(1, '포효', 'lion', 'gold', 'ring', { k: 'dmg', to: 'all', m: 1.2, st: { s: 'atkDown', dur: 6, v: 0.2 } }, { k: 'taunt', dur: 3 }),
      sk(2, '왕의 돌격', 'pierce', 'gold', 'smash', { k: 'dmg', to: 'all', m: 2.8, st: { s: 'stun', dur: 1.5 } }),
    ],
  },
  {
    id: 'grom', name: '그롬', gender: 'm', job: 'warrior', title: '대전사', concept: '근육 대머리 수염. 확실한 마초', origin: 'legend', elem: 'earth', stat: { hp: 1.15 },
    passive: pas('대전사의 함성', { k: 'stat', s: 'atk', v: 0.18 }),
    skills: [
      sk(0, '도끼 휘두르기', 'slash', 'earth', 'slash', { k: 'dmg', to: 'all', m: 1.3 }),
      sk(1, '대지 강타', 'smash', 'earth', 'smash', { k: 'dmg', to: 'all', m: 1.8, st: { s: 'stun', dur: 1 } }),
      sk(2, '광폭화', 'fist', 'blood', 'burst', { k: 'buff', to: 'self', s: 'atkUp', v: 0.5, dur: 10 }, { k: 'buff', to: 'self', s: 'spdUp', v: 0.3, dur: 10 }),
    ],
  },
  {
    id: 'vael', name: '바엘', gender: 'm', job: 'warrior', title: '어둠의 검사', concept: '은발 엘프 미남. 냉소적, 검은 갑옷. 교단 출신', origin: 'legend', elem: 'shadow', joinChapter: 5,
    passive: pas('심연 베기', { k: 'stat', s: 'crit', v: 0.12 }),
    skills: [
      sk(0, '그림자 베기', 'dark', 'shadow', 'slash', { k: 'dmg', to: 'front', m: 2.8 }),
      sk(1, '심연의 칼날', 'dark', 'shadow', 'ring', { k: 'dmg', to: 'all', m: 1.6, st: { s: 'silence', dur: 3 } }),
      sk(2, '어둠 해방', 'pierce', 'shadow', 'pierce', { k: 'dmg', to: 'front', m: 6.5, crit: true }),
    ],
  },
  {
    id: 'ryuka', name: '류카', gender: 'f', job: 'warrior', title: '용의 딸', concept: '청록 머리 작은 뿔. 귀여운 용족', origin: 'legend', elem: 'wave',
    passive: pas('용의 피', { k: 'stat', s: 'hp', v: 0.15 }),
    skills: [
      sk(0, '용꼬리 치기', 'dragon', 'wave', 'slash', { k: 'dmg', to: 'all', m: 1.3 }),
      sk(1, '용의 숨결', 'fire', 'fire', 'burst', { k: 'dmg', to: 'all', m: 1.4, st: { s: 'burn', dur: 5, v: 0.2 } }),
      sk(2, '역린', 'dragon', 'blood', 'pierce', { k: 'dmg', to: 'front', m: 6 }, { k: 'heal', to: 'self', m: 2 }),
    ],
  },
  {
    id: 'jin', name: '진', gender: 'm', job: 'warrior', title: '떠돌이 검객', concept: '흑발 상투 동양 검객 미남', origin: 'legend', elem: 'steel',
    passive: pas('발도', { k: 'stat', s: 'spd', v: 0.15 }),
    skills: [
      sk(0, '일섬', 'slash', 'steel', 'slash', { k: 'dmg', to: 'front', m: 2.9 }),
      sk(1, '삼연참', 'slash', 'steel', 'slash', { k: 'dmg', to: 'random', m: 1.3, n: 3 }),
      sk(2, '무명검', 'pierce', 'steel', 'pierce', { k: 'dmg', to: 'all', m: 2.6, crit: true }),
    ],
  },
  {
    id: 'nyx', name: '닉스', gender: 'f', job: 'assassin', title: '그림자', concept: '흑발 단발 암살자. 교단 첩자였음', origin: 'legend', elem: 'shadow',
    passive: pas('그림자 걸음', { k: 'stat', s: 'crit', v: 0.18 }),
    skills: [
      sk(0, '등 찌르기', 'dagger', 'shadow', 'slash', { k: 'dmg', to: 'back', m: 3 }),
      sk(1, '독 바르기', 'dagger', 'nature', 'burst', { k: 'dmg', to: 'front', m: 1.5, st: { s: 'burn', dur: 8, v: 0.3 } }),
      sk(2, '그림자 처형', 'dark', 'shadow', 'pierce', { k: 'dmg', to: 'front', m: 7.5, crit: true }),
    ],
  },
  {
    id: 'luna', name: '루나', gender: 'f', job: 'assassin', title: '은늑대', concept: '늑대 귀 은발 수인 소녀. 장난꾸러기', origin: 'legend', elem: 'ice', joinChapter: 1,
    passive: pas('은빛 코', { k: 'stat', s: 'spd', v: 0.15 }),
    skills: [
      sk(0, '늑대 발톱', 'wolf', 'ice', 'slash', { k: 'dmg', to: 'front', m: 1.4, n: 2 }),
      sk(1, '하울링', 'wolf', 'ice', 'ring', { k: 'dmg', to: 'all', m: 1.2, st: { s: 'slow', dur: 4 } }, { k: 'buff', to: 'self', s: 'spdUp', v: 0.3, dur: 6 }),
      sk(2, '은빛 질주', 'moon', 'ice', 'slash', { k: 'dmg', to: 'random', m: 1.4, n: 5 }),
    ],
  },
  {
    id: 'sylas', name: '사일러스', gender: 'm', job: 'archer', title: '숲의 사수', concept: '금발 장발 엘프 궁수 미남', origin: 'legend', elem: 'nature',
    passive: pas('바람 화살', { k: 'stat', s: 'atk', v: 0.12 }),
    skills: [
      sk(0, '연사', 'arrow', 'nature', 'bolt', { k: 'dmg', to: 'front', m: 1, n: 3 }),
      sk(1, '덩굴 화살', 'leaf', 'nature', 'ring', { k: 'dmg', to: 'all', m: 1.5, st: { s: 'slow', dur: 4 } }),
      sk(2, '숲의 심판', 'rain', 'nature', 'meteor', { k: 'dmg', to: 'all', m: 2.2, n: 3 }),
    ],
  },
  {
    id: 'vivian', name: '비비안', gender: 'f', job: 'engineer', title: '해적 선장', concept: '갈색 웨이브 안대 선장. 총·대포', origin: 'legend', elem: 'fire',
    passive: pas('선장의 배짱', { k: 'stat', s: 'crit', v: 0.1 }),
    skills: [
      sk(0, '권총 난사', 'cannon', 'fire', 'bolt', { k: 'dmg', to: 'random', m: 0.8, n: 4 }),
      sk(1, '대포 일제 사격', 'cannon', 'fire', 'meteor', { k: 'dmg', to: 'all', m: 1.4, n: 2, st: { s: 'stun', dur: 0.8 } }),
      sk(2, '보물 지도', 'gold', 'gold', 'pillar', { k: 'buff', to: 'allies', s: 'critUp', v: 0.2, dur: 10 }, { k: 'mana', to: 'allies', v: 15 }),
    ],
  },
  {
    id: 'scarlet', name: '스칼렛', gender: 'f', job: 'mage', title: '홍염의 마녀', concept: '붉은 머리의 요염한 마녀', origin: 'legend', elem: 'fire',
    passive: pas('홍염', { k: 'stat', s: 'atk', v: 0.12 }),
    skills: [
      sk(0, '불꽃 키스', 'fire', 'fire', 'burst', { k: 'dmg', to: 'front', m: 2, st: { s: 'burn', dur: 6, v: 0.3 } }),
      sk(1, '화염 회오리', 'wind', 'fire', 'ring', { k: 'dmg', to: 'all', m: 1.3, st: { s: 'burn', dur: 6, v: 0.15 } }),
      sk(2, '홍련', 'fire', 'blood', 'meteor', { k: 'dmg', to: 'all', m: 3, n: 2 }),
    ],
  },
  {
    id: 'momo2', name: '미미', gender: 'f', job: 'mage', title: '꼬마 대마법사', concept: '큰 모자 동그란 안경 꼬마. 귀여움', origin: 'legend', elem: 'pink',
    passive: pas('천재', { k: 'onCast', mana: 10 }),
    skills: [
      sk(0, '반짝 화살', 'star', 'pink', 'bolt', { k: 'dmg', to: 'random', m: 1, n: 3 }),
      sk(1, '얼음 사탕', 'frost', 'ice', 'ring', { k: 'dmg', to: 'all', m: 1.3, st: { s: 'stun', dur: 1.2 } }),
      sk(2, '대마법: 별사탕', 'meteor', 'pink', 'meteor', { k: 'dmg', to: 'all', m: 2.4, n: 3 }),
    ],
  },
  {
    id: 'aria', name: '아리아', gender: 'f', job: 'priest', title: '성녀', concept: '금발 화관의 온화한 성녀', origin: 'legend', elem: 'holy',
    passive: pas('성녀의 기도', { k: 'stat', s: 'heal', v: 0.25 }),
    skills: [
      sk(0, '치유의 빛', 'heal', 'holy', 'pillar', { k: 'heal', to: 'lowest', m: 4.5 }),
      sk(1, '성역', 'sanct', 'holy', 'heal', { k: 'regen', to: 'allies', m: 0.35, dur: 6 }),
      sk(2, '대축복', 'flower', 'holy', 'pillar', { k: 'heal', to: 'allies', m: 2 }, { k: 'buff', to: 'allies', s: 'atkUp', v: 0.15, dur: 8 }),
    ],
  },
  // ───────── 새 영웅 5명 ─────────
  {
    id: 'ayla', name: '에일라', gender: 'f', job: 'priest', title: '노래하는 사제', concept: '류트를 든 음유 사제', origin: 'new', elem: 'wind',
    passive: pas('여운', { k: 'stat', s: 'mana', v: 0.15, team: true }),
    skills: [
      sk(0, '위로의 노래', 'lute', 'wind', 'heal', { k: 'heal', to: 'allies', m: 1.3 }),
      sk(1, '빠른 박자', 'song', 'wind', 'ring', { k: 'buff', to: 'allies', s: 'spdUp', v: 0.25, dur: 8 }),
      sk(2, '앙코르', 'lute', 'holy', 'pillar', { k: 'mana', to: 'allies', v: 30 }, { k: 'regen', to: 'allies', m: 0.3, dur: 5 }),
    ],
  },
  {
    id: 'veronica', name: '베로니카', gender: 'f', job: 'priest', title: '심연의 수녀', concept: '교단을 떠난 수녀. 어둠으로 치유', origin: 'new', elem: 'shadow',
    passive: pas('속죄', { k: 'stat', s: 'atk', v: 0.2 }),
    skills: [
      sk(0, '검은 기도', 'dark', 'shadow', 'burst', { k: 'dmg', to: 'front', m: 2.2 }, { k: 'heal', to: 'lowest', m: 2 }),
      sk(1, '심연의 장막', 'veil', 'shadow', 'shield', { k: 'shield', to: 'allies', m: 2.5 }),
      sk(2, '파문', 'dark', 'shadow', 'ring', { k: 'dmg', to: 'all', m: 1.8, st: { s: 'silence', dur: 4 } }),
    ],
  },
  {
    id: 'moss', name: '모스 할머니', gender: 'f', job: 'druid', title: '대드루이드', concept: '황짐승의 스승. 느릿한 말투, 엄청난 자연 마법', origin: 'new', elem: 'nature', stat: { atk: 1.05 },
    passive: pas('숲의 숨', { k: 'stat', s: 'heal', v: 0.15, team: true }),
    skills: [
      sk(0, '가시 덩굴', 'leaf', 'nature', 'ring', { k: 'dmg', to: 'all', m: 1.1, st: { s: 'slow', dur: 4 } }),
      sk(1, '이끼 담요', 'leaf', 'nature', 'heal', { k: 'regen', to: 'allies', m: 0.35, dur: 6 }),
      sk(2, '고목의 분노', 'smash', 'earth', 'smash', { k: 'dmg', to: 'all', m: 2.6, st: { s: 'stun', dur: 2 } }),
    ],
  },
  {
    id: 'yeonhwa', name: '연화', gender: 'f', job: 'fighter', title: '권법 소녀', concept: '팬더의 제자. 씩씩함', origin: 'new', elem: 'pink',
    passive: pas('수련의 성과', { k: 'stat', s: 'spd', v: 0.12 }),
    skills: [
      sk(0, '연꽃 장', 'flower', 'pink', 'burst', { k: 'dmg', to: 'front', m: 1.2, n: 3 }),
      sk(1, '회선각', 'wind', 'pink', 'slash', { k: 'dmg', to: 'all', m: 1.6 }),
      sk(2, '백화난무', 'fist', 'pink', 'slash', { k: 'dmg', to: 'front', m: 1, n: 7 }),
    ],
  },
  {
    id: 'noel', name: '노엘', gender: 'f', job: 'mage', title: '꺼진 별의 왕녀', concept: '최종장 영웅. 꺼진 별의 마지막 빛', origin: 'new', elem: 'light', joinChapter: 10,
    passive: pas('남은 별빛', { k: 'stat', s: 'atk', v: 0.2 }),
    skills: [
      sk(0, '별의 파편', 'gem', 'light', 'bolt', { k: 'dmg', to: 'front', m: 3.2 }),
      sk(1, '꺼진 별', 'moon', 'shadow', 'burst', { k: 'dmg', to: 'all', m: 1.8, st: { s: 'silence', dur: 3 } }),
      sk(2, '다시 빛나라', 'star', 'light', 'meteor', { k: 'dmg', to: 'all', m: 3.2, n: 2 }),
    ],
  },
  // ───────── (멤버 영웅 이어서 · 추가 멤버 · 상세는 docs/HEROES_ADD_4.md · 다른 멤버와 완전히 같은 급) ─────────
  {
    id: 'sermi', name: '세르미뉴', gender: 'm', job: 'mage', title: '별을 읽는 자', concept: '신중하고 진중한 계산형 마법사. 말수는 적지만 한마디가 정확하고, 모두가 「세르님」께 물어봄', origin: 'founder', elem: 'light', groggy: 1.6,
    look: '시크한 미소년 · 은회색 앞머리가 눈을 살짝 가림 · 남색 롱코트(별자리 무늬 안감) · 손 위에 떠 있는 작은 천구의',
    voice: ['계산은 끝났어. 3초 뒤에 쓰러진다.', '…칭찬은 고마워. 다음 수도 보고 있어.', '…괜찮아, 예상한 범위야.'],
    passive: pas('예지', { k: 'stat', s: 'mana', v: 0.12, team: true }),
    skills: [
      sk(0, '별표식', 'star', 'light', 'bolt', { k: 'dmg', to: 'front', m: 0.8, n: 3 }),
      sk(1, '궤도 계산', 'eye', 'light', 'ring', { k: 'dmg', to: 'all', m: 0.9, st: { s: 'slow', dur: 6 } }, { k: 'mana', to: 'allies', v: 12 }),
      sk(2, '별의 정답', 'meteor', 'light', 'meteor', { k: 'dmg', to: 'front', m: 3.2, crit: true }, { k: 'dmg', to: 'random', m: 0.9, n: 4 }),
    ],
  },
  {
    id: 'ichae', name: '이치애', gender: 'f', job: 'fighter', title: '꺾이지 않는 꽃', concept: '의리 있고 인내심 강한 격투가. 동료가 맞으면 대신 맞으러 감. 원정대(길드)에서 만난 동료', origin: 'founder', elem: 'holy', stat: { hp: 1.12, def: 1.05 },
    look: '청순한 인상 · 긴 흑발을 낮게 하나로 묶음 · 흰색·연분홍 무도복(넓은 소매) · 붕대 감은 주먹 · 머리끈의 작은 꽃',
    voice: ['괜찮아요, 제가 버틸게요.', '헤헤, 다들 무사해서 다행이에요.', '여기까지 같이 왔잖아요. 끝까지 가요.'],
    passive: pas('인내', { k: 'lowHp', s: 'atk', v: 0.45, at: 0.5 }),
    skills: [
      sk(0, '받아치기', 'fist', 'holy', 'burst', { k: 'buff', to: 'self', s: 'guard', v: 0.35, dur: 4 }, { k: 'dmg', to: 'front', m: 1.6 }),
      sk(1, '의리', 'shield', 'holy', 'shield', { k: 'taunt', dur: 5 }, { k: 'shield', to: 'lowest', m: 2.2 }),
      sk(2, '만개', 'flower', 'holy', 'burst', { k: 'dmg', to: 'front', m: 0.8, n: 3 }, { k: 'dmg', to: 'front', m: 4.2, st: { s: 'stun', dur: 1.5 } }),
    ],
  },
  {
    id: 'mochi', name: '딸기망고모찌', gender: 'm', job: 'druid', title: '세 친구의 주인', concept: '유머러스하고 쾌활한 분위기 메이커. 정령견 딸기·망고·모찌 자랑이 끝이 없음', origin: 'founder', elem: 'nature',
    look: '밝은 표정의 청년 · 짧은 갈색 머리 · 개 발자국 배지 · 초록 망토와 큰 간식 가방 · 정령견 셋: 딸기(레드 토이푸들·분홍 리본) · 망고(웰시코기·노란 털) · 모찌(비숑 프리제·하얀 솜뭉치)',
    voice: ['딸기 물어! 망고 막아! 모찌는… 일단 귀여워!', '우리 애들 오늘 컨디션 최고야ㅋㅋ', '애들아, 뒤로. 여긴 내가 볼게.'],
    passive: pas('세 친구', { k: 'teamLowGuard', v: 0.1 }),
    skills: [
      sk(0, '딸기 출동', 'dog', 'pink', 'slash', { k: 'dmg', to: 'front', m: 1.9 }),
      sk(1, '망고 지켜 · 모찌 핥기', 'paw', 'nature', 'shield', { k: 'shield', to: 'allies', m: 1.4 }, { k: 'heal', to: 'lowest', m: 2.2 }),
      sk(2, '다 같이 산책!', 'dog', 'nature', 'smash', { k: 'dmg', to: 'all', m: 1.5, n: 2 }, { k: 'regen', to: 'allies', m: 0.25, dur: 5 }),
    ],
  },
  {
    id: 'jaehi', name: '재희아빠', gender: 'm', job: 'warrior', title: '세상에서 제일 바쁜 아빠', concept: '귀엽고 다소 산만하지만 속은 진국. 재희 얘기를 자주 하고 동료를 가족처럼 챙김', origin: 'founder', elem: 'earth', stat: { hp: 1.08 },
    look: '밝은 피부 · 웨이브 애쉬브라운 머리 · 차분한 미소 (형철 10/17: 웅스와 확실히 다르게) · 큼직한 갑옷 가슴에 아이가 그린 듯한 삐뚤빼뚤 별 패치 · 허리에 작은 인형 고리 · 큰 양손 망치',
    voice: ['앗 잠깐만용~ 이거 먼저 하구!', '우리 팀 다치면 아빠 화난다아~?', '…괜찮아. 내가 지킬게.'],
    passive: pas('아빠 왔다!', { k: 'teamLowGuard', v: 0.12 }),
    skills: [
      sk(0, '정신없는 휘두르기', 'hammer', 'earth', 'smash', { k: 'dmg', to: 'random', m: 0.9, n: 3 }),
      sk(1, '아빠 왔다! · 간식 타임', 'snack', 'gold', 'shield', { k: 'taunt', dur: 4 }, { k: 'shield', to: 'lowest', m: 2.5 }, { k: 'heal', to: 'allies', m: 0.6 }),
      sk(2, '재희야 아빠 간다', 'hammer', 'earth', 'smash', { k: 'dmg', to: 'front', m: 5.8, crit: true }, { k: 'buff', to: 'allies', s: 'guard', v: 0.2, dur: 5 }),
    ],
  },
];
export const HERO_BY_ID: Record<string, HeroDef> = Object.fromEntries(HEROES.map((h) => [h.id, h]));
export const heroOf = (id: string) => HERO_BY_ID[id];

// ───────── 그림 (도트 시트 · 초상화) ─────────
// 전투 도트: 36명 모두 public/art/px2/<id> (docs/ANIM_1017.md) · 새 16칸 m1r1 숨쉬기 · m1r0 걷기 · m2r0 평타(준비→휘두름→타격→회수) · m2r1 스킬(기 모으기→큰 준비→발동→마무리)
//  기존 8칸은 r1c0 피격 · r1c1 쓰러짐 · r1c2 승리만 씀 · 칸마다 보이는 초는 CONFIG.combat.anim
//  모든 시트는 머리를 72px로 맞춰 저장 → 모든 영웅에 같은 배율(CONFIG.combat.pxScale) = 얼굴 크기가 같고 키는 체격대로
const px = (id: string, dir: string): AnimSet => {
  const f = (...c: string[]) => c.map((k) => `${dir}:${k}`);
  const A = CONFIG.combat.anim;
  const four = (row: string) => f(`${row}c0`, `${row}c1`, `${row}c2`, `${row}c3`);
  // 스킬: 4칸을 한 번 재생하고 대기로 (POLISH_1017 ②) · 다단 히트면 c1→c2를 타격마다 짧게 되풀이한 뒤 c3
  const skill = (i: number, speed: number, lunge: number) => {
    const n = Math.max(1, ...HERO_BY_ID[id].skills[i].eff.map((e) => (e.k === 'dmg' ? e.n ?? 1 : 1)));
    const [s0, s1, s2, s3] = A.skill.map((d) => d / speed);
    if (n === 1) return { frames: four('m2r1'), fps: 1, loop: false, hit: [2], lunge, durs: [s0, s1, s2, s3] };
    const [m1, m2] = A.multiHit;
    const frames = [f('m2r1c0')[0], ...Array.from({ length: n }, () => f('m2r1c1', 'm2r1c2')).flat(), f('m2r1c3')[0]];
    const durs = [s0, ...Array.from({ length: n }, () => [m1, m2]).flat(), s3];
    return { frames, fps: 1, loop: false, hit: Array.from({ length: n }, (_, k) => 2 + k * 2), lunge, durs };
  };
  return {
    idle: { frames: four('m1r1'), fps: 1, loop: true, durs: four('m1r1').map(() => A.idle) },
    walk: { frames: four('m1r0'), fps: 1, loop: true, durs: four('m1r0').map(() => A.walk) },
    attack: { frames: four('m2r0'), fps: 1, loop: false, hit: [2], lunge: 10, durs: A.attack },
    skill1: skill(0, A.skill1Speed, 20),
    skill2: skill(1, 1, 30),
    skill3: skill(2, A.skill3Speed, 40),
    hurt: { frames: f('r1c0'), fps: 4, loop: false },
    down: { frames: f('r1c1'), fps: 1, loop: false },
    win: { frames: f('r1c2'), fps: 1, loop: false },
  };
};
const SHEETS: Record<string, AnimSet> = {};
/** 컷인 일러스트가 있는 영웅 (public/art/cutin/<id>.png) — 없으면 초상화 확대 */
export const CUTIN_ART = new Set(['aria', 'ayla', 'bube', 'ceres', 'elysia', 'gonu', 'grom', 'haeung', 'hwang', 'ichae', 'ikamolly', 'jaehi', 'jin', 'kkangto', 'kleine', 'leon', 'luna', 'mochi', 'momo2', 'moss', 'noel', 'nyx', 'panda', 'ryuka', 'scarlet', 'sermi', 'shinya', 'sylas', 'vael', 'veronica', 'vivian', 'walwal', 'warmnight', 'woongs', 'yeonhwa', 'yuwol']);
export interface HeroArt {
  anims: AnimSet;
  /** 전투 도트 시트 폴더 (public/art 아래 · 코스튬이면 코스튬 쪽) */
  dir: string;
  /** 컷인 그림 경로 (public/art 아래 · view.art.cutin 키) */
  cutin: string;
  /** 고화질 초상화 경로 (public/art 아래) */
  face: string;
  /** 화면 키 (논리 px) = 대기 첫 칸 키 × CONFIG.combat.pxScale */
  h: number;
  portrait: string;
}
/** 고화질 일러스트 초상화 (public/art/portraits_hd/<id>.png · 512 · 투명 · docs/ART_DONE_1017_2.md) — 메뉴 화면·컷인은 이걸, 전투에서 움직이는 캐릭터만 도트 */
export const HD_PORTRAIT = new Set(['aria', 'ayla', 'bube', 'ceres', 'elysia', 'gonu', 'grom', 'haeung', 'hwang', 'ichae', 'ikamolly', 'jaehi', 'jin', 'kkangto', 'kleine', 'leon', 'luna', 'mochi', 'momo2', 'moss', 'noel', 'nyx', 'panda', 'ryuka', 'scarlet', 'sermi', 'shinya', 'sylas', 'vael', 'veronica', 'vivian', 'walwal', 'warmnight', 'woongs', 'yeonhwa', 'yuwol']);
/** 멤버 영웅 초상화가 그려진 것 (public/art/portraits/member_<id>.png · ChatGPT로 뽑음) — 없는 멤버는 직업 기본 초상화 */
const MEMBER_ART = new Set(['sermi', 'ichae', 'mochi', 'jaehi']);
/** 대기 첫 칸 키 (시트 원본 px) — 시트를 불러온 뒤 setPxHeights로 채움 */
const PX_H: Record<string, number> = {};
export async function setPxHeights() {
  // 칸 정보(_parts.json)만으로 키를 앎 → 그림을 다 받기 전에도 전투 배치·크기가 맞음
  const dirs = [...HEROES.map((h) => `px2/${h.id}`), ...Object.keys(CONFIG.costume).flatMap((k) => CONFIG.costume[k].heroes.map((id) => artPath(id, 'px2', k)))];
  await Promise.all(dirs.map(async (d) => {
    const p = await loadParts(d);
    if (p?.r0c0) PX_H[d] = p.r0c0.h;
  }));
}
export type ArtKind = 'fullbody' | 'portrait' | 'px2' | 'cutin';
/** 영웅 그림 경로 (public/art 아래) — 코스튬 set을 입었으면 CONFIG.costume[set].dir 쪽을 먼저, 그 묶음에 없는 영웅이면 기본 그림
 *  전신·초상화·전투 도트·컷인 전부 이 함수 하나로 (10/18 · 코스튬 도트 시트가 없으면 sheet.ts loadInto가 기본 시트로 대신함) */
export function artPath(id: string, kind: ArtKind, set?: string | null): string {
  const c = set ? CONFIG.costume[set] : undefined;
  if (c?.heroes.includes(id)) return kind === 'px2' ? `${c.dir}/px2/${id}` : kind === 'fullbody' ? `${c.dir}/${id}.png` : `${c.dir}/portraits_hd/${id}.png`;
  if (kind === 'px2') return `px2/${id}`;
  if (kind === 'fullbody') return `fullbody/${id}.png`;
  return kind === 'cutin' && CUTIN_ART.has(id) ? `cutin/${id}.png` : `portraits_hd/${id}.png`;
}
/** 이 영웅들의 전투 도트 시트 폴더 */
export const heroDirs = (ids: string[]) => [...new Set(ids)].map((id) => `px2/${id}`);
/** set = 입은 코스튬 (없으면 기본 그림) */
export function artOf(h: HeroDef, set?: string | null): HeroArt {
  const dir = artPath(h.id, 'px2', set);
  const anims = (SHEETS[dir] ??= px(h.id, dir));
  const portrait = h.fiveStar ? `star_${h.id}` : h.origin === 'legend' ? `legend_${h.id}` : MEMBER_ART.has(h.id) ? `member_${h.id}` : `mc_${JOBS[h.job].mc}_${h.gender}`;
  return { anims, dir, cutin: artPath(h.id, 'cutin', set), face: artPath(h.id, 'portrait', set), h: (PX_H[dir] ?? PX_H[`px2/${h.id}`] ?? CONFIG.combat.pxFallbackH) * CONFIG.combat.pxScale, portrait };
}
/** 모든 시트 폴더 이름 (불러오기용) */
export const sheetDirs = () => HEROES.map((h) => `px2/${h.id}`);
