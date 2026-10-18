// 실유저 기록 (서버 star_board · supabase/star_expedition.sql 3) — 랭킹·윈드 길드에 AI 대신 (형철 10/18 「실유저만」)
//  내 줄은 빼고 둠: 내 기록은 늘 이 기기 값(더 최신)으로 붙임
export interface RealRow {
  me: boolean;
  name: string;
  avatar: string | null;
  lv: number;
  tower_week: string | null;
  tower: number;
  arena: number;
  world_week: string | null;
  world: number;
  guild: string | null;
  contrib_week: string | null;
  contrib: number;
  raid: number;
}
export let REAL: RealRow[] = [];
export const setReal = (rows: RealRow[]) => (REAL = rows.filter((r) => !r.me));
