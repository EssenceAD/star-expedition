// 상점 (STAR_PLAN_v2 §2 · 현금 결제 없음 · 전부 사냥으로 얻는 재화)
//  영웅 상점 = 미보유 영웅을 별가루로 확정 구매 (킹스레이드 6,000 루비 구조) · 재화·소모품 · 꾸러미(한 번) · 장비 소환은 game/gear.ts summon
import { CONFIG } from '../config';
import { HEROES, heroOf } from '../data/heroes';
import { JOBS, ZONES, type Zone } from '../data/jobs';
import { join, owned } from './heroes';
import { addCur, capLeft, S, spend, track, type Save } from './state';

const SH = CONFIG.shop;
/** 이번 주 영입 (기간 영입 이벤트): 주마다 한 명 · 값 SH.weekly 배 */
export function weeklyHero(s: Save = S, now = Date.now()) {
  const left = HEROES.filter((h) => !owned(h.id, s));
  if (!left.length) return null;
  const w = Math.floor((now / 86400000 + 3) / 7);
  return left[w % left.length].id;
}
export const heroPrice = (id: string) => SH.hero[heroOf(id).origin];
/** 실제로 내는 값 (이번 주 영입이면 할인) */
export const heroCost = (id: string, s: Save = S) => Math.round(heroPrice(id) * (weeklyHero(s) === id ? SH.weekly : 1));
/** 이름으로 정하는 고정 섞기 값 (멤버·오리지널이 몰리지 않게) */
const mixKey = (id: string) => [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 9973;
/** 영웅 상점 진열 (B 보강 §3): 아직 없는 영웅 · 전방→중앙→후방 차례로 한 명씩 돌려 역할이 골고루 섞이게 · zone을 주면 그 위치만
 *  (장 클리어로 합류하는 영웅도 미리 살 수 있음) */
export function heroStock(s: Save = S, zone?: Zone) {
  const left = HEROES.filter((h) => !owned(h.id, s) && (!zone || JOBS[h.job].zone === zone));
  const by = ZONES.map((z) => left.filter((h) => JOBS[h.job].zone === z).sort((a, b) => mixKey(a.id) - mixKey(b.id)));
  const out: typeof left = [];
  for (let i = 0; out.length < left.length; i++) for (const g of by) if (g[i]) out.push(g[i]);
  return out;
}
/** price: 화면에서 살 때는 heroCost(이번 주 할인 포함) · 시뮬·시험은 기본값 */
export function buyHero(id: string, s: Save = S, price: number = heroPrice(id)): 'owned' | 'poor' | 'ok' {
  if (owned(id, s)) return 'owned';
  if (!spend('stardust', price, s)) return 'poor';
  join(id, s);
  track('hero', 1, s);
  return 'ok';
}
const give = (g: Record<string, number>, s: Save) => Object.entries(g).forEach(([k, v]) => addCur(k, v, s));
/** 주간 상한에 걸려 다 못 받는 물건이면 안 팖 (재화만 날리지 않게) */
export const overCap = (g: Record<string, number>, s: Save = S) => Object.entries(g).some(([k, v]) => capLeft(k, s) < v);
export function buyItem(id: string, s: Save = S): 'poor' | 'ok' | 'none' | 'cap' {
  const it = SH.items.find((x) => x.id === id);
  if (!it) return 'none';
  if (overCap(it.give, s)) return 'cap';
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
/** 특수 재화 상점 (결투장·탑 코인) */
export function buyCoin(id: string, s: Save = S): 'poor' | 'ok' | 'none' | 'cap' {
  const it = SH.coins.find((x) => x.id === id);
  if (!it) return 'none';
  if (overCap(it.give, s)) return 'cap';
  if (!spend(it.coin, it.price, s)) return 'poor';
  give(it.give, s);
  return 'ok';
}
