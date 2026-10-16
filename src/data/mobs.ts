// 몬스터 — 그림은 파일럿의 3종(슬라임·고블린·늑대) + 이끼 골렘을 장마다 이름·색만 바꿔 돌려 쓴다 (1단계: 새 그림 금지)
//  능력치 = CONFIG.story.mob × 이 배수 × grow^p
import type { AnimSet } from '../sprite/sheet';

export interface MobKind {
  id: 'slime' | 'goblin' | 'wolf' | 'golem';
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
  golem: {
    id: 'golem', hp: 1, atk: 1, def: 1, rate: 2.2, h: 250,
    anims: {
      idle: { frames: ['boss:r0c0', 'boss:r0c1', 'boss:r0c2', 'boss:r0c3'], fps: 4, loop: true },
      attack: { frames: ['boss:r1c0', 'boss:r1c1', 'boss:r1c2', 'boss:r1c3'], fps: 6, loop: false, hit: [2], lunge: -16 },
    },
  },
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
  names: Record<'slime' | 'goblin' | 'wolf', string>;
  boss: string;
  patterns: BossPattern['key'][];
}
export const CHAPTER_MOBS: ChapterMobs[] = [
  { names: { slime: '민트 슬라임', goblin: '두건 고블린', wolf: '수정 늑대' }, boss: '이끼 골렘 「호박눈」', patterns: ['slam', 'beam'] },
  { names: { slime: '포자 슬라임', goblin: '늪 고블린', wolf: '진흙 늑대' }, boss: '버섯 골렘 「곰팡이왕」', patterns: ['slam', 'roar'] },
  { names: { slime: '녹슨 슬라임', goblin: '광부 고블린', wolf: '갱도 늑대' }, boss: '광석 골렘 「녹슨 심장」', patterns: ['quake', 'beam'] },
  { names: { slime: '서리 슬라임', goblin: '설원 고블린', wolf: '눈보라 늑대' }, boss: '얼음 골렘 「서리발」', patterns: ['slam', 'focus', 'roar'] },
  { names: { slime: '별조각 슬라임', goblin: '교단 고블린', wolf: '심연 늑대' }, boss: '꺼진 별의 골렘 「잿빛눈」', patterns: ['beam', 'quake', 'focus'] },
  { names: { slime: '소금 슬라임', goblin: '해적 고블린', wolf: '파도 늑대' }, boss: '등대 골렘 「가라앉은 빛」', patterns: ['beam', 'roar', 'slam'] },
  { names: { slime: '모래 슬라임', goblin: '유적 고블린', wolf: '사막 늑대' }, boss: '모래시계 골렘 「거꾸로 시간」', patterns: ['quake', 'focus', 'beam'] },
  { names: { slime: '용암 슬라임', goblin: '잿불 고블린', wolf: '화염 늑대' }, boss: '화산 골렘 「잿불 심장」', patterns: ['slam', 'beam', 'roar'] },
  { names: { slime: '구름 슬라임', goblin: '바람 고블린', wolf: '하늘 늑대' }, boss: '구름 골렘 「바람지기」', patterns: ['focus', 'roar', 'quake'] },
  { names: { slime: '심연 슬라임', goblin: '교단 사제', wolf: '삼켜진 늑대' }, boss: '「별을 삼킨 것」의 그림자', patterns: ['beam', 'quake', 'roar', 'focus'] },
];
