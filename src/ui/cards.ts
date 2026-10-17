// 영웅 카드 1종 (docs/UI_KIT_1018.md §7 · target_1018/heroes.jpg): 92×190 규격 · 틀 card_1..4(별: ★1·2 → 1 · ★3 → 2 · ★4 → 3 · ★5 → 4)
//  전신을 틀 안쪽 창(inset) 높이 ×1.05로 아래 맞춤 · 가운데 · 창 밖은 잘림 · 이름 8.5px(아래에서 22) · star 10px × 별 수(아래에서 12)
//  왼쪽 위 원(직업 자리)은 직업 아이콘 그림이 오면 넣음 (지금은 정답 화면처럼 비움)
//  같은 비율로 영웅 목록 · 편성 · 상점 · 결투장 상대에 씀 (w만 바꿈 · h = w × 190/92)
import { heroOf } from '../data/heroes';
import { owned } from '../game/heroes';
import { S } from '../game/state';
import { fullUrl } from './bust';
import { esc } from './core';
import { cardFrame, innerRect, kitPart } from './kit';

export const CARD_W = 92;
export const CARD_H = 190;
const n2 = (v: number) => Math.round(v * 100) / 100;
/** 카드 HTML · attrs = data-… · extra = 카드 위에 얹을 것(체크·자물쇠 등) */
export function heroCard(id: string, o: { w?: number; attrs?: string; cls?: string; extra?: string; star?: number } = {}) {
  const w = o.w ?? CARD_W;
  const k = w / CARD_W;
  const h = CARD_H * k;
  const own = owned(id);
  const star = o.star ?? S.heroes[id]?.star ?? 1;
  const frame = cardFrame(star);
  const r = innerRect(frame, w, h);
  const def = heroOf(id);
  const sw = 10 * k;
  const stars = Array.from({ length: star }, (_, s) => kitPart('star', sw, sw, 'cs', `left:${n2(w / 2 - (star * (sw + k) - k) / 2 + s * (sw + k))}px;top:${n2(h - 12 * k)}px`)).join('');
  return `<button class="hcard2${own ? '' : ' lock'} ${o.cls ?? ''}" ${o.attrs ?? ''} style="width:${n2(w)}px;height:${n2(h)}px;--k:${n2(k)}" title="${esc(def.name)}">
    <i class="cwin" style="left:${n2(r.x)}px;top:${n2(r.y)}px;width:${n2(r.w)}px;height:${n2(r.h)}px"><img data-cfb="${id}" data-ch="${n2(r.h * 1.05)}" alt="" style="height:${n2(r.h * 1.05)}px"></i>
    ${kitPart(frame, w, h, 'cf')}
    <span class="tx cname" style="top:${n2(h - 22 * k)}px">${esc(def.name)}</span>${stars}${o.extra ?? ''}</button>`;
}
/** 카드 전신 그림 채우기 (그린 다음 한 번) */
export function fillCards(root: ParentNode) {
  root.querySelectorAll<HTMLImageElement>('img[data-cfb]').forEach((im) => void fullUrl(im.dataset.cfb!, Math.ceil(Number(im.dataset.ch))).then((u) => (im.src = u)).catch(() => {}));
}
