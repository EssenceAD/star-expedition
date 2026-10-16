// 상점 (STAR_PLAN_v2 §2 · 현금 결제 없음 · 전부 사냥으로 얻는 재화)
//  영웅 상점 = 미보유 영웅을 별가루로 확정 구매 (킹스레이드 6,000 루비 구조) · 재화·소모품 · 꾸러미(한 번) · 장비 소환은 game/gear.ts summon
import { CONFIG } from '../config';
import { HEROES, heroOf } from '../data/heroes';
import { join, owned } from './heroes';
import { addCur, S, spend, type Save } from './state';

const SH = CONFIG.shop;
export const heroPrice = (id: string) => SH.hero[heroOf(id).origin];
/** 영웅 상점 진열: 아직 없는 영웅 (장 클리어로 합류하는 전설도 미리 살 수 있음) */
export const heroStock = (s: Save = S) => HEROES.filter((h) => !owned(h.id, s));
export function buyHero(id: string, s: Save = S): 'owned' | 'poor' | 'ok' {
  if (owned(id, s)) return 'owned';
  if (!spend('stardust', heroPrice(id), s)) return 'poor';
  join(id, s);
  return 'ok';
}
const give = (g: Record<string, number>, s: Save) => Object.entries(g).forEach(([k, v]) => addCur(k, v, s));
export function buyItem(id: string, s: Save = S): 'poor' | 'ok' | 'none' {
  const it = SH.items.find((x) => x.id === id);
  if (!it) return 'none';
  const ok = it.gold ? spend('gold', it.gold, s) : spend('stardust', it.dust ?? 0, s);
  if (!ok) return 'poor';
  give(it.give, s);
  return 'ok';
}
export function buyPack(id: string, s: Save = S): 'poor' | 'ok' | 'done' | 'none' {
  const p = SH.packs.find((x) => x.id === id);
  if (!p) return 'none';
  if (p.once && s.shop.packs.includes(id)) return 'done';
  if (!spend('stardust', p.dust, s)) return 'poor';
  give(p.give, s);
  s.shop.packs.push(id);
  return 'ok';
}
