// 파일럿 데이터: 영웅 4 (패시브 1 · 액티브 3 · 쿨타임) · 적 3 + 보스 · 웨이브 3 + 보스 · 도트 동작 정의
//  수치 규칙은 「체크인」 전투(combat/field.ts · CONFIG.combat)에서: 치명 15% ×2 · 받는 피해 × (1 − 방어/(방어+K)) 최대 40% · 히트스톱/넉백/흔들림
//  숫자 크기: 킹스레이드 문법대로 큰 숫자 (평타 수천~수만 · 스킬 치명 수십만) → 화면은 만·억 단위
import type { Act, AnimSet } from '../sprite/sheet';

export const COMBAT = {
  critChance: 0.15,
  critMult: 2,
  defK: 30000,
  defMax: 0.4,
  hitstop: { hit: 0.035, crit: 0.07, kill: 0.09 },
  knock: { hit: 5, crit: 10, kill: 18 },
  shake: { crit: 3, boss: 7 },
  /** 마나: 평타 맞힐 때 · 맞을 때 · 1초마다 */
  mana: { hit: 10, hurt: 4, regen: 4, max: 100 },
  cutInSlow: 0.15,
  cutInSec: 0.6,
  /** 제한 시간(초) */
  limit: 180,
};

export type Role = 'warrior' | 'mage' | 'priest' | 'knight';
export type SkillKind = 'slashAll' | 'smash' | 'pierce' | 'fireball' | 'meteor' | 'frost' | 'heal' | 'sanctuary' | 'barrier' | 'taunt' | 'shieldBash' | 'resolve';
export interface SkillDef {
  key: SkillKind;
  name: string;
  /** 마나 */
  cost: number;
  /** 쿨타임(초) */
  cd: number;
  mult: number;
  act: Act;
  icon: string;
  color: string;
  desc: string;
}
export interface HeroDef {
  id: string;
  name: string;
  role: Role;
  roleName: string;
  hp: number;
  atk: number;
  def: number;
  rate: number;
  ranged: boolean;
  slot: [number, number];
  /** 화면 키 (논리 px) */
  h: number;
  color: string;
  passive: { name: string; desc: string };
  skills: [SkillDef, SkillDef, SkillDef];
  sfx: string;
  anims: AnimSet;
}

const row = (sheet: string, r: number, n: number, from = 0) => Array.from({ length: n }, (_, i) => `${sheet}:r${r}c${from + i}`);
/** 대기 + 평타만 있는 영웅 (파일럿) */
const basic = (sheet: string): AnimSet => ({
  idle: { frames: row(sheet, 0, 6), fps: 8, loop: true },
  attack: { frames: row(sheet, 1, 6), fps: 13, loop: false, hit: [3], lunge: 8 },
});

export const HEROES: HeroDef[] = [
  {
    id: 'warmnight', name: '따뜻한밤', role: 'knight', roleName: '궁수', hp: 330000, atk: 11500, def: 7000, rate: 1.2, ranged: true,
    slot: [304, 270], h: 104, color: '#ffa040', sfx: 'skill_rogue', anims: basic('warmnight'),
    passive: { name: '밤의 등불', desc: '체력 50% 이하 아군의 받는 피해 −10%' },
    skills: [
      { key: 'shieldBash', name: '불씨 화살', cost: 30, cd: 6, mult: 3.0, act: 'skill1', icon: '🏹', color: '#ffa040', desc: '앞의 적에게 불화살 · 1.5초 기절' },
      { key: 'meteor', name: '별빛 화살비', cost: 50, cd: 14, mult: 1.9, act: 'skill2', icon: '☄', color: '#ffd36b', desc: '적 모두에게 화살비 세 번' },
      { key: 'resolve', name: '따뜻한 등불', cost: 70, cd: 20, mult: 0, act: 'skill3', icon: '🏮', color: '#ffcf7a', desc: '아군 모두 받는 피해 −30% 6초' },
    ],
  },
  {
    id: 'woongs', name: '웅스', role: 'warrior', roleName: '전사', hp: 520000, atk: 12000, def: 12000, rate: 1.0, ranged: false,
    slot: [374, 246], h: 108, color: '#ffb347', sfx: 'skill_warrior',
    anims: {
      idle: { frames: row('w1', 0, 6), fps: 8, loop: true },
      walk: { frames: row('w1', 1, 6), fps: 11, loop: true },
      attack: { frames: row('w1', 2, 6), fps: 15, loop: false, hit: [3], lunge: 14 },
      hurt: { frames: row('w1', 3, 2), fps: 8, loop: false },
      down: { frames: row('w1', 3, 4, 2), fps: 7, loop: false },
      skill1: { frames: row('w2', 0, 6), fps: 12, loop: false, hit: [2, 4], lunge: 20 },
      skill2: { frames: row('w2', 1, 6), fps: 10, loop: false, hit: [4], lunge: 30 },
      skill3: { frames: row('w2', 2, 6), fps: 12, loop: false, hit: [3], lunge: 60 },
      win: { frames: row('w2', 3, 6), fps: 8, loop: false },
    },
    passive: { name: '투지', desc: '체력 50% 이하면 공격력 +25%' },
    skills: [
      { key: 'slashAll', name: '회오리 베기', cost: 30, cd: 6, mult: 1.4, act: 'skill1', icon: '🌀', color: '#ffb347', desc: '적 모두에게 두 번' },
      { key: 'smash', name: '대지 가르기', cost: 50, cd: 12, mult: 3.4, act: 'skill2', icon: '⛰', color: '#ff7a3d', desc: '뛰어올라 내려찍기 · 주변 기절 1초' },
      { key: 'pierce', name: '별빛 관통', cost: 80, cd: 22, mult: 7, act: 'skill3', icon: '⚔', color: '#ffd36b', desc: '한 명에게 큰 피해 · 치명 확정' },
    ],
  },
  {
    id: 'ikamolly', name: '이카몰리', role: 'mage', roleName: '마법사', hp: 260000, atk: 13500, def: 5000, rate: 1.4, ranged: true,
    slot: [240, 240], h: 104, color: '#8fd0ff', sfx: 'skill_mage', anims: basic('ikamolly'),
    passive: { name: '마력 순환', desc: '스킬을 쓰면 마나 +12' },
    skills: [
      { key: 'fireball', name: '화염구', cost: 30, cd: 5, mult: 3.1, act: 'skill1', icon: '🔥', color: '#ff6b3d', desc: '한 명에게 불덩이' },
      { key: 'frost', name: '서리 고리', cost: 50, cd: 12, mult: 1.7, act: 'skill2', icon: '❄', color: '#8fe3ff', desc: '적 모두 · 4초 느리게' },
      { key: 'meteor', name: '별똥비', cost: 80, cd: 24, mult: 2.7, act: 'skill3', icon: '☄', color: '#c79bff', desc: '적 모두에게 별 세 번' },
    ],
  },
  {
    id: 'walwal', name: '왈왈콩선생', role: 'priest', roleName: '사제', hp: 280000, atk: 8000, def: 7000, rate: 1.5, ranged: true,
    slot: [184, 266], h: 100, color: '#fff3a8', sfx: 'skill_priest', anims: basic('walwal'),
    passive: { name: '축복', desc: '회복량 +15%' },
    skills: [
      { key: 'heal', name: '치유의 빛', cost: 30, cd: 6, mult: 3.4, act: 'skill1', icon: '✚', color: '#9dffb0', desc: '체력이 가장 낮은 아군 회복' },
      { key: 'sanctuary', name: '성역', cost: 50, cd: 14, mult: 0.75, act: 'skill2', icon: '❀', color: '#c8ffd0', desc: '아군 모두 5초 동안 회복' },
      { key: 'barrier', name: '수호의 날개', cost: 80, cd: 22, mult: 2.4, act: 'skill3', icon: '✧', color: '#fff3a8', desc: '아군 모두 보호막' },
    ],
  },
];

export interface MobDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  def: number;
  rate: number;
  /** 화면 키 (논리 px) */
  h: number;
  boss?: boolean;
  anims: AnimSet;
}
const mobRow = (r: number): AnimSet => ({
  idle: { frames: [`mobs_px:r${r}c0`, `mobs_px:r${r}c1`], fps: 3, loop: true },
  attack: { frames: [`mobs_px:r${r}c2`, `mobs_px:r${r}c3`, `mobs_px:r${r}c2`], fps: 7, loop: false, hit: [1], lunge: -18 },
});
export const MOBS: Record<string, MobDef> = {
  slime: { id: 'slime', name: '민트 슬라임', hp: 150000, atk: 5000, def: 3000, rate: 1.6, h: 46, anims: mobRow(0) },
  goblin: { id: 'goblin', name: '두건 고블린', hp: 200000, atk: 6500, def: 6000, rate: 1.4, h: 70, anims: mobRow(1) },
  wolf: { id: 'wolf', name: '수정 늑대', hp: 230000, atk: 7500, def: 5000, rate: 1.1, h: 64, anims: mobRow(2) },
  golem: {
    id: 'golem', name: '이끼 골렘 「호박눈」', hp: 3600000, atk: 15000, def: 14000, rate: 2.2, h: 250, boss: true,
    anims: {
      idle: { frames: ['boss:r0c0', 'boss:r0c1', 'boss:r0c2', 'boss:r0c3'], fps: 4, loop: true },
      attack: { frames: ['boss:r1c0', 'boss:r1c1', 'boss:r1c2', 'boss:r1c3'], fps: 6, loop: false, hit: [2], lunge: -16 },
    },
  },
};
export const MOB_SLOTS: [number, number][] = [
  [552, 244], [606, 268], [660, 240], [714, 264],
];
export const BOSS_SLOT: [number, number] = [664, 262];
export const WAVES: string[][] = [
  ['slime', 'slime', 'slime'],
  ['goblin', 'slime', 'goblin', 'slime'],
  ['wolf', 'goblin', 'wolf'],
  ['golem'],
];
/** 보스 패턴: 몇 초마다 · 경고 시간 · 배수 · 경고 문구 */
export const BOSS_PATTERNS = [
  { key: 'slam', every: 9, warn: 1.6, mult: 1.5, text: '이끼 골렘이 「바위 내려찍기」를 준비합니다' },
  { key: 'beam', every: 14, warn: 2.0, mult: 2.6, text: '이끼 골렘의 눈에 호박빛이 모입니다 — 「호박 광선」' },
] as const;
export const REWARDS = [
  { icon: '🪙', name: '금화', n: 24000 },
  { icon: '🧪', name: '경험치 물약', n: 3 },
  { icon: '✦', name: '별 조각', n: 5 },
  { icon: '🟠', name: '골렘의 호박석', n: 1 },
];
