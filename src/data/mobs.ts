// 몬스터 — 그림은 파일럿의 3종(슬라임·고블린·늑대) + 이끼 골렘을 장마다 이름·색만 바꿔 돌려 쓴다 (1단계: 새 그림 금지)
//  능력치 = CONFIG.story.mob × 이 배수 × grow^p
import type { AnimSet } from '../sprite/sheet';

export interface MobKind {
  id: 'slime' | 'goblin' | 'wolf' | 'uniq1' | 'uniq2' | 'elite' | 'golem';
  hp: number;
  atk: number;
  def: number;
  rate: number;
  /** 화면 키 (논리 px) */
  h: number;
  anims: AnimSet;
}
const mobRow = (r: number): AnimSet => ({
  idle: { frames: [`mobs_px:r${r}c0`, `mobs_px:r${r}c1`], fps: 3, loop: true },
  attack: { frames: [`mobs_px:r${r}c2`, `mobs_px:r${r}c3`, `mobs_px:r${r}c2`], fps: 7, loop: false, hit: [1], lunge: -18 },
});
export const MOB_KINDS: Record<MobKind['id'], MobKind> = {
  slime: { id: 'slime', hp: 0.7, atk: 0.7, def: 0.6, rate: 1.6, h: 46, anims: mobRow(0) },
  goblin: { id: 'goblin', hp: 1, atk: 1, def: 1.2, rate: 1.4, h: 70, anims: mobRow(1) },
  wolf: { id: 'wolf', hp: 1.1, atk: 1.25, def: 0.9, rate: 1.1, h: 64, anims: mobRow(2) },
  // 10/18 지역 고유 몹 2종 + 정예 (mobs2/<지역>/ r3·r4·r5) — 그림은 지역마다 다름, 능력치 배수만 공통
  uniq1: { id: 'uniq1', hp: 1.05, atk: 1.1, def: 1.0, rate: 1.3, h: 62, anims: mobRow(1) },
  uniq2: { id: 'uniq2', hp: 0.95, atk: 1.2, def: 0.9, rate: 1.2, h: 58, anims: mobRow(2) },
  elite: { id: 'elite', hp: 2.6, atk: 1.6, def: 1.4, rate: 1.6, h: 104, anims: mobRow(1) },
  golem: {
    id: 'golem', hp: 1, atk: 1, def: 1, rate: 2.2, h: 250,
    anims: {
      idle: { frames: ['boss:r0c0', 'boss:r0c1', 'boss:r0c2', 'boss:r0c3'], fps: 4, loop: true },
      attack: { frames: ['boss:r1c0', 'boss:r1c1', 'boss:r1c2', 'boss:r1c3'], fps: 6, loop: false, hit: [2], lunge: -16 },
    },
  },
};

/**
 * 지역 몹 그림 (docs/ANIM_1017.md ③): public/art/mobs2/<지역>/ 5열×3행 · r0 슬라임 · r1 고블린 · r2 늑대
 *  c0·c1 대기 · c2 공격 준비 · c3 공격(hit) · c4 피격 (죽을 때도 c4 → 가라앉으며 사라짐) · 모두 왼쪽을 봄 · 색 바꾸기(mobTint) 안 씀
 */
export type RegionMobId = 'slime' | 'goblin' | 'wolf' | 'uniq1' | 'uniq2' | 'elite';
export const MOB_ROW: Record<RegionMobId, number> = { slime: 0, goblin: 1, wolf: 2, uniq1: 3, uniq2: 4, elite: 5 };
export function regionMob(region: string, row: number): AnimSet {
  const f = (c: number) => `mobs2/${region}:r${row}c${c}`;
  return {
    idle: { frames: [f(0), f(1)], fps: 3, loop: true },
    attack: { frames: [f(2), f(3), f(2)], fps: 7, loop: false, hit: [1], lunge: -18 },
    hurt: { frames: [f(4)], fps: 4, loop: false },
    down: { frames: [f(4)], fps: 1, loop: false },
  };
}
/**
 * 장 보스 그림: public/art/bosses2/<지역>/ 4×2 · r0c0·c1 대기 · r0c2→r0c3 내려찍기(slam·quake) · r1c0→r1c1 광선(beam·focus) · r1c2 포효(roar) · r1c3 비틀거림(쓰러질 때)
 *  경고(warn) 동안은 준비 칸(BOSS_PREP)을 붙들고 살짝 떨림 → 언제 때리는지 보임
 */
export function regionBoss(region: string): AnimSet {
  const f = (r: number, c: number) => `bosses2/${region}:r${r}c${c}`;
  return {
    idle: { frames: [f(0, 0), f(0, 1)], fps: 2.5, loop: true },
    // 평타: 예전 골렘과 같은 시간(4칸 · 6fps · hit 2)
    attack: { frames: [f(0, 2), f(0, 2), f(0, 3), f(0, 3)], fps: 6, loop: false, hit: [2], lunge: -16 },
    skill1: { frames: [f(0, 3), f(0, 3)], fps: 3, loop: false },
    skill2: { frames: [f(1, 1), f(1, 1)], fps: 3, loop: false },
    skill3: { frames: [f(1, 2), f(1, 2)], fps: 3, loop: false },
    down: { frames: [f(1, 3)], fps: 1, loop: false },
  };
}
/**
 * 레이드 「잿날개」 · 월드 보스 「불꽃 날개 마왕」 (ANIM_1017 ④): public/art/<raidboss|worldboss>/anim1 · anim2 (4×2)
 *  anim1 = 장 보스와 같은 배치 (대기 2 · 내려찍기 2 · 광선 2 · 포효 · 그로기) · anim2 = 피격 움찔 · 부위 파괴 후 대기 2 · 분노 대기 · 분노 휩쓸기 · 쓰러짐→무너짐→잔해
 *  상태별 칸 고르기는 render.drawRaidBoss (그로기·움찔·경고·분노·부위 파괴)
 */
export function bigBoss(dir: 'raidboss' | 'worldboss' | 'graidboss'): AnimSet {
  const a = (r: number, c: number) => `${dir}/anim1:r${r}c${c}`;
  const z = (r: number, c: number) => `${dir}/anim2:r${r}c${c}`;
  return {
    idle: { frames: [a(0, 0), a(0, 1)], fps: 2.5, loop: true },
    attack: { frames: [a(0, 2), a(0, 2), a(0, 3), a(0, 3)], fps: 6, loop: false, hit: [2], lunge: -16 },
    skill1: { frames: [a(0, 3), a(0, 3)], fps: 3, loop: false },
    skill2: { frames: [a(1, 1), a(1, 1)], fps: 3, loop: false },
    skill3: { frames: [a(1, 2), a(1, 2)], fps: 3, loop: false },
    // 길드 레이드 「서리 용」은 anim1만 있음 → 쓰러짐은 비틀거림 칸
    down: dir === 'graidboss' ? { frames: [a(1, 3)], fps: 1, loop: false } : { frames: [z(1, 1), z(1, 2), z(1, 3)], fps: 1, loop: false, durs: [0.4, 0.4, 0.4] },
  };
}
/** 탑·요일·외전 전용 몹 이름 (mobs2/<모드> r0 · r1 · r2 = 슬라임·고블린·늑대 자리) */
export const OWN_MOBS = {
  tower: ['가고일', '빈 갑옷 기사', '마법서'],
  daily: ['금화 슬라임', '경험치 물약', '수정 거북'],
  side: ['그림자 정령', '그림자 병사', '그림자 사냥개'],
} as const;
/** 패턴 → 경고 동안 보여 줄 준비 칸 · 터질 때 동작 */
export const BOSS_PREP: Record<'slam' | 'beam' | 'focus' | 'roar' | 'quake', { cell: string; act: 'skill1' | 'skill2' | 'skill3' }> = {
  slam: { cell: 'r0c2', act: 'skill1' },
  quake: { cell: 'r0c2', act: 'skill1' },
  beam: { cell: 'r1c0', act: 'skill2' },
  focus: { cell: 'r1c0', act: 'skill2' },
  roar: { cell: 'r1c2', act: 'skill3' },
};

/** 보스 패턴: 몇 초마다 · 경고 시간 · 배수 · 대상 · 상태이상 · 경고 문구({boss}) */
export interface BossPattern {
  key: 'slam' | 'beam' | 'focus' | 'roar' | 'quake';
  every: number;
  warn: number;
  mult: number;
  to: 'all' | 'back' | 'front';
  st?: { s: 'stun' | 'silence' | 'slow'; dur: number };
  text: string;
}
export const PATTERNS: Record<BossPattern['key'], BossPattern> = {
  slam: { key: 'slam', every: 9, warn: 1.6, mult: 1.5, to: 'all', text: '{boss}이(가) 「바위 내려찍기」를 준비합니다' },
  beam: { key: 'beam', every: 14, warn: 2.0, mult: 2.6, to: 'all', text: '{boss}의 눈에 빛이 모입니다 — 「광선」' },
  focus: { key: 'focus', every: 11, warn: 1.6, mult: 3.2, to: 'back', text: '{boss}이(가) 뒷줄을 노려봅니다 — 「저격」' },
  roar: { key: 'roar', every: 13, warn: 1.8, mult: 0.8, to: 'all', st: { s: 'silence', dur: 3 }, text: '{boss}이(가) 숨을 크게 들이쉽니다 — 「포효」 (침묵)' },
  quake: { key: 'quake', every: 12, warn: 1.8, mult: 1.6, to: 'front', st: { s: 'stun', dur: 1.5 }, text: '{boss}이(가) 땅을 구릅니다 — 「지진」 (앞줄 기절)' },
};

/** 장마다 몬스터 이름 · 보스 이름 · 보스 패턴 · 색 번호 (T.battle.mobTint · region) */
export interface ChapterMobs {
  names: Record<RegionMobId, string>;
  boss: string;
  patterns: BossPattern['key'][];
}
export const CHAPTER_MOBS: ChapterMobs[] = [
  { names: { slime: '민트 슬라임', goblin: '두건 고블린', wolf: '수정 늑대' , uniq1: '도토리 버섯병정', uniq2: '가시덩굴 뱀', elite: '정예 · 가시곰' }, boss: '이끼 골렘 「호박눈」', patterns: ['slam', 'beam'] },
  { names: { slime: '포자 슬라임', goblin: '늪 고블린', wolf: '진흙 늑대' , uniq1: '독두꺼비', uniq2: '갈대 도마뱀 창병', elite: '정예 · 진흙 트롤' }, boss: '버섯 골렘 「곰팡이왕」', patterns: ['slam', 'roar'] },
  { names: { slime: '녹슨 슬라임', goblin: '광부 고블린', wolf: '갱도 늑대' , uniq1: '곡괭이 두더지', uniq2: '광석 박쥐', elite: '정예 · 수정껍질 거북' }, boss: '광석 골렘 「녹슨 심장」', patterns: ['quake', 'beam'] },
  { names: { slime: '서리 슬라임', goblin: '설원 고블린', wolf: '눈보라 늑대' , uniq1: '서리 펭귄 전사', uniq2: '얼음 정령', elite: '정예 · 설인' }, boss: '얼음 골렘 「서리발」', patterns: ['slam', 'focus', 'roar'] },
  { names: { slime: '별조각 슬라임', goblin: '교단 고블린', wolf: '심연 늑대' , uniq1: '별교단 마법사', uniq2: '그림자 눈', elite: '정예 · 타락한 별기사' }, boss: '꺼진 별의 골렘 「잿빛눈」', patterns: ['beam', 'quake', 'focus'] },
  { names: { slime: '소금 슬라임', goblin: '해적 고블린', wolf: '파도 늑대' , uniq1: '큰집게 게', uniq2: '물고기 해적', elite: '정예 · 문어 선장' }, boss: '등대 골렘 「가라앉은 빛」', patterns: ['beam', 'roar', 'slam'] },
  { names: { slime: '모래 슬라임', goblin: '유적 고블린', wolf: '사막 늑대' , uniq1: '사막 전갈', uniq2: '붕대 미라', elite: '정예 · 자칼 수호병' }, boss: '모래시계 골렘 「거꾸로 시간」', patterns: ['quake', 'focus', 'beam'] },
  { names: { slime: '용암 슬라임', goblin: '잿불 고블린', wolf: '화염 늑대' , uniq1: '용암 도롱뇽', uniq2: '불씨 정령', elite: '정예 · 마그마 거인' }, boss: '화산 골렘 「잿불 심장」', patterns: ['slam', 'beam', 'roar'] },
  { names: { slime: '구름 슬라임', goblin: '바람 고블린', wolf: '하늘 늑대' , uniq1: '폭풍 하피', uniq2: '구름 해파리', elite: '정예 · 그리폰 기사' }, boss: '구름 골렘 「바람지기」', patterns: ['focus', 'roar', 'quake'] },
  { names: { slime: '심연 슬라임', goblin: '교단 사제', wolf: '삼켜진 늑대' , uniq1: '등불 아귀', uniq2: '해골 망령', elite: '정예 · 공허의 기사' }, boss: '「별을 삼킨 것」의 그림자', patterns: ['beam', 'quake', 'roar', 'focus'] },
];
