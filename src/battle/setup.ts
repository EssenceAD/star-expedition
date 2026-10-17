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
  /** 보스 전장: 부위 체력·페이즈를 잴 「한 판 기준 체력」 (공용 체력 보스는 최대 체력이 너무 커서) */
  partBase?: number;
  /** 결투장: 상대 영웅 (영웅 그림을 뒤집어 그리고 스킬도 씀) */
  hero?: HeroSpec;
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
  /** 레이드 8인: 같이 싸우는 AI·길드원 파티 (늘 자동 · 아래 패널엔 없음) */
  allies?: HeroSpec[];
  /** 보스 전장 (레이드·월드 보스·길드 레이드): 거대 보스 · 부위 · 2줄 · 그로기 · 페이즈 */
  arena?: boolean;
  /** 시간이 다 되면: 'lose'(기본) · 'win'(월드 보스처럼 준 피해로 끝) */
  timeUp?: 'lose' | 'win';
  /** 콘텐츠 전용 전투 배경 (public/art/bgs/<이것>.jpg · 없으면 스토리 배경 + region 색) */
  bg?: string;
}
