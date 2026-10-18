// 영웅 서사 (형철 10/18 · 킹스레이드 「영웅 이야기」식): 그 영웅을 키우면 한 칸씩 열리는 업적 + 보상
//  칸 = [키, 제목, 조건, 보상] · 받은 칸은 s.saga[id] · 대사는 그 영웅 voice/concept에서
import { heroOf } from '../data/heroes';
import { affLv } from './inn';
import { addCur, S, type Save } from './state';

export interface SagaStep { k: string; name: string; goal: string; ok: (id: string, s: Save) => boolean; give: Record<string, number> }
const hs = (id: string, s: Save) => s.heroes[id];
export const SAGA: SagaStep[] = [
  { k: 'lv10', name: '함께 걷는 길', goal: '레벨 10', ok: (id, s) => (hs(id, s)?.lv ?? 0) >= 10, give: { stardust: 30, exShard: 3 } },
  { k: 'aff3', name: '마음을 열다', goal: '여관 인연 3단계', ok: (id, s) => affLv(id, s) >= 3, give: { stardust: 40 } },
  { k: 'skill9', name: '손에 익은 기술', goal: '스킬 레벨 합 9', ok: (id, s) => (hs(id, s)?.skill ?? [0, 0, 0]).reduce((a, b) => a + b, 0) >= 9, give: { skillBook: 3, exShard: 3 } },
  { k: 'star3', name: '빛나는 별', goal: '별 3', ok: (id, s) => (hs(id, s)?.star ?? 0) >= 3, give: { stardust: 60, exShard: 5 } },
  { k: 'lv30', name: '이름이 알려지다', goal: '레벨 30', ok: (id, s) => (hs(id, s)?.lv ?? 0) >= 30, give: { stardust: 80, gold: 50000 } },
  { k: 'awaken1', name: '한계를 넘어', goal: '각성 1', ok: (id, s) => (hs(id, s)?.awaken ?? 0) >= 1, give: { awakenStone: 3, exShard: 5 } },
  { k: 'side', name: '나만의 이야기', goal: '영웅 외전 끝까지', ok: (id, s) => !!s.treasure?.[id], give: { stardust: 100 } },
  { k: 'aff10', name: '평생의 동료', goal: '여관 인연 10단계', ok: (id, s) => affLv(id, s) >= 10, give: { stardust: 150, transStone: 1 } },
  { k: 'star5', name: '전설이 되다', goal: '별 5', ok: (id, s) => (hs(id, s)?.star ?? 0) >= 5, give: { stardust: 200, exShard: 10 } },
];
export const sagaGot = (id: string, s: Save = S) => (s.saga ??= {})[id] ?? [];
export const sagaReady = (id: string, s: Save = S) => SAGA.filter((x) => !sagaGot(id, s).includes(x.k) && !!s.heroes[id] && x.ok(id, s));
/** 한 칸 받기 → 받은 보상 · 못 받으면 null */
export function claimSaga(id: string, k: string, s: Save = S): Record<string, number> | null {
  const st = SAGA.find((x) => x.k === k);
  if (!st || sagaGot(id, s).includes(k) || !s.heroes[id] || !st.ok(id, s)) return null;
  (s.saga ??= {})[id] = [...sagaGot(id, s), k];
  for (const [c, n] of Object.entries(st.give)) {
    if (c === 'exShard') s.exShards[id] = (s.exShards[id] ?? 0) + n;
    else addCur(c, n, s);
  }
  return st.give;
}
/** 칸마다 한 줄 이야기 (그 영웅 말투) */
export function sagaLine(id: string, i: number) {
  const h = heroOf(id);
  const v = h.voice ?? [];
  return v[i % Math.max(1, v.length)] ?? h.concept.split('.')[0];
}
