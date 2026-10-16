// 스킬·패시브 효과 정의 — 영웅 32명의 스킬은 이 효과 조합으로만 만든다 (전투 코드는 battle/sim.ts 한 곳에서 해석)
import type { Act } from '../sprite/sheet';

export type StatusKey = 'stun' | 'silence' | 'slow' | 'burn' | 'atkDown' | 'guard' | 'taunt' | 'regen' | 'atkUp' | 'spdUp' | 'critUp';
export type DebuffKey = 'stun' | 'silence' | 'slow' | 'burn' | 'atkDown';
export type BuffKey = 'atkUp' | 'spdUp' | 'guard' | 'critUp';
export type Eff =
  /** 피해: 대상 · 배수 · 횟수 · 치명 확정 · 상태이상(v = 화상은 초당 공격 배수, 공격력↓은 비율) */
  | { k: 'dmg'; to: 'front' | 'all' | 'random' | 'back'; m: number; n?: number; crit?: boolean; st?: { s: DebuffKey; dur: number; v?: number } }
  | { k: 'heal'; to: 'lowest' | 'allies' | 'self'; m: number }
  | { k: 'regen'; to: 'allies' | 'lowest'; m: number; dur: number }
  | { k: 'shield'; to: 'allies' | 'self' | 'lowest' | 'frontAllies'; m: number }
  | { k: 'buff'; to: 'allies' | 'self' | 'frontAllies'; s: BuffKey; v: number; dur: number }
  | { k: 'taunt'; dur: number }
  | { k: 'mana'; to: 'allies'; v: number };
export type Vfx = 'slash' | 'smash' | 'pierce' | 'bolt' | 'burst' | 'meteor' | 'ring' | 'heal' | 'shield' | 'pillar';
export interface SkillDef {
  name: string;
  cost: number;
  cd: number;
  /** T.icon 키 */
  icon: string;
  /** T.elem 키 */
  elem: string;
  vfx: Vfx;
  act: Act;
  eff: Eff[];
}
export type PassiveEff =
  | { k: 'stat'; s: 'atk' | 'hp' | 'def' | 'crit' | 'spd' | 'heal' | 'mana' | 'dmgCut'; v: number; team?: boolean }
  /** 체력 at 이하일 때 */
  | { k: 'lowHp'; s: 'atk' | 'spd' | 'dmgCut'; v: number; at: number }
  /** 스킬 쓰면 마나 */
  | { k: 'onCast'; mana: number }
  /** 체력 50% 이하 아군 받는 피해 −v */
  | { k: 'teamLowGuard'; v: number }
  /** 인연이 하나도 안 켜졌을 때 공격 +v (신야군 「독자노선」) */
  | { k: 'solo'; v: number };
export interface PassiveDef {
  name: string;
  p: PassiveEff;
}

/** 슬롯별 기본 마나·쿨타임 (1·2·3번 스킬) */
const SLOT = [
  { cost: 30, cd: 6, act: 'skill1' },
  { cost: 50, cd: 13, act: 'skill2' },
  { cost: 80, cd: 22, act: 'skill3' },
] as const;
/** 스킬 만들기: 슬롯(0~2) · 이름 · 아이콘 · 속성 · 그림 효과 · 효과들 */
export const sk = (slot: 0 | 1 | 2, name: string, icon: string, elem: string, vfx: Vfx, ...eff: Eff[]): SkillDef => ({ name, icon: `sk_${icon}`, elem, vfx, eff, ...SLOT[slot] });
export const pas = (name: string, p: PassiveEff): PassiveDef => ({ name, p });

const pct = (v: number) => `${Math.round(v * 100)}%`;
const TO: Record<string, string> = { front: '앞의 적', all: '적 모두', random: '아무 적', back: '맨 뒤 적', lowest: '체력이 가장 낮은 아군', allies: '아군 모두', self: '자신', frontAllies: '가장 앞 위치 아군' };
const ST: Record<string, string> = { stun: '기절', silence: '침묵', slow: '느리게', burn: '화상', atkDown: '공격력 감소' };
const BF: Record<string, string> = { atkUp: '공격력', spdUp: '공격 속도', guard: '받는 피해 감소', critUp: '치명타 확률' };
/** 스킬 설명 (데이터에서 자동 · 레벨 배수 lvMult) */
export function descSkill(s: SkillDef, lvMult = 1): string {
  return s.eff
    .map((e) => {
      switch (e.k) {
        case 'dmg':
          return `${TO[e.to]}에게 공격력 ${pct(e.m * lvMult)}${e.n && e.n > 1 ? ` × ${e.n}번` : ''}${e.crit ? ' (치명 확정)' : ''}${e.st ? ` · ${e.st.dur}초 ${ST[e.st.s]}${e.st.s === 'atkDown' ? ` ${pct(e.st.v ?? 0)}` : ''}` : ''}`;
        case 'heal':
          return `${TO[e.to]} 회복 (공격력 ${pct(e.m * lvMult)})`;
        case 'regen':
          return `${TO[e.to]} ${e.dur}초 동안 회복 (초당 ${pct(e.m * lvMult)})`;
        case 'shield':
          return `${TO[e.to]} 보호막 (공격력 ${pct(e.m * lvMult)})`;
        case 'buff':
          return `${TO[e.to]} ${BF[e.s]} +${pct(e.v)} ${e.dur}초`;
        case 'taunt':
          return `${e.dur}초 도발 (적이 나만 노림)`;
        case 'mana':
          return `${TO[e.to]} 마나 +${e.v}`;
      }
    })
    .join(' · ');
}
const PS: Record<string, string> = { atk: '공격력', hp: '체력', def: '방어력', crit: '치명타 확률', spd: '공격 속도', heal: '회복량', mana: '마나 회복', dmgCut: '받는 피해 감소' };
export function descPassive(p: PassiveDef): string {
  const e = p.p;
  switch (e.k) {
    case 'stat':
      return `${e.team ? '아군 모두 ' : ''}${PS[e.s]} +${pct(e.v)}`;
    case 'lowHp':
      return `체력 ${pct(e.at)} 이하면 ${PS[e.s]} +${pct(e.v)}`;
    case 'onCast':
      return `스킬을 쓰면 마나 +${e.mana}`;
    case 'teamLowGuard':
      return `체력 50% 이하 아군의 받는 피해 −${pct(e.v)}`;
    case 'solo':
      return `켜진 인연이 없으면 공격력 +${pct(e.v)}`;
  }
}
