// 전투 한 판의 입력 — 스토리·탑·레이드 등 어떤 콘텐츠든 이것만 만들어 넘기면 같은 전투가 돈다
import type { BondDef } from '../data/bonds';
import type { HeroArt, HeroDef } from '../data/heroes';
import type { BossPattern, MobKind } from '../data/mobs';
import type { Stats } from '../game/heroes';
import type { Zone } from '../data/jobs';

export interface HeroSpec {
  def: HeroDef;
  art: HeroArt;
  /** 위치 3구역 (직업으로 정해짐) */
  zone: Zone;
  lv: number;
  st: Stats;
}
export interface MobSpec {
  kind: MobKind;
  name: string;
  boss: boolean;
  hp: number;
  atk: number;
  def: number;
  rate: number;
  /** T.battle.mobTint 번호 */
  tint: number;
  patterns?: BossPattern[];
  /** 보스 초상화 */
  portrait?: string;
}
export interface BattleSetup {
  heroes: HeroSpec[];
  waves: MobSpec[][];
  limit: number;
  starTime: number;
  bonds: BondDef[];
  /** 배경 색 바꾸기 번호 (T.battle.region) */
  region: number;
  title: string;
}
