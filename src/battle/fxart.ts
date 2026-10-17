// 스킬 이펙트 그림 14종 (docs/ANIM_1017.md ②): public/art/fx/<이름>/0~3.jpg + _fx.json
//  검은 배경 · 흰 그림 → 보조 캔버스에 그리고 속성색을 multiply로 입힌 뒤 본 캔버스엔 lighter (검정은 사라짐)
//  앵커: center = 대상 몸통 가운데 · bottom = 발밑 · 그림이 아직 없으면 render.ts의 예전 선 그리기로
import { CONFIG } from '../config';
import { view } from '../ui/view';

export interface FxArt {
  meta: Record<string, { frames: number; anchor: 'center' | 'bottom' }>;
  img: Record<string, HTMLImageElement[]>;
}
export const FX_NAMES = ['slash', 'smash', 'pierce', 'bolt', 'burst', 'meteor', 'ring', 'heal', 'shield', 'pillar', 'hit', 'crit', 'buff', 'stun'] as const;
export type FxName = (typeof FX_NAMES)[number];

/** 뒤에서 받아 둠 (전투 중 아직 없으면 선 그리기) */
export async function loadFxArt(): Promise<FxArt | null> {
  const B = import.meta.env.BASE_URL;
  const r = await fetch(`${B}art/fx/_fx.json`).catch(() => null);
  if (!r?.ok) return null;
  const meta = (await r.json()) as FxArt['meta'];
  const img: FxArt['img'] = {};
  await Promise.all(
    Object.entries(meta).map(async ([name, m]) => {
      img[name] = await Promise.all(
        Array.from({ length: m.frames }, (_, i) => new Promise<HTMLImageElement>((ok) => {
          const im = new Image();
          im.onload = im.onerror = () => ok(im);
          im.src = `${B}art/fx/${name}/${i}.jpg`;
        })),
      );
    }),
  );
  return { meta, img };
}

const fc = document.createElement('canvas');
const fcx = fc.getContext('2d')!;
/**
 * 이펙트 한 칸: (x, y) = 앵커 자리 · h = 화면 높이(논리 px) · color = 속성색
 *  그림이 없거나 덜 받았으면 false (부른 쪽이 선 그리기로)
 */
export function drawFxImg(ctx: CanvasRenderingContext2D, A: FxArt | null | undefined, name: string, i: number, x: number, y: number, h: number, color: string, alpha = 1): boolean {
  const im = A?.img[name]?.[i];
  if (!im || !im.naturalWidth) return false;
  const FA = CONFIG.combat.fxArt;
  // 회복 기둥은 대상 몸통 폭 정도로 좁게 (영웅 둘을 덮던 것 · POLISH_1017 ①)
  const w = (im.naturalWidth / im.naturalHeight) * h * (name === 'heal' ? FA.healW : 1);
  const top = A!.meta[name].anchor === 'bottom' ? y - h : y - h / 2;
  // 화면 해상도(dpr)로 보조 캔버스에 그림 + 속성색 multiply
  const d = view.dpr;
  const pw = Math.max(1, Math.round(w * d));
  const ph = Math.max(1, Math.round(h * d));
  if (fc.width !== pw || fc.height !== ph) ((fc.width = pw), (fc.height = ph));
  fcx.globalCompositeOperation = 'source-over';
  fcx.drawImage(im, 0, 0, pw, ph);
  fcx.globalCompositeOperation = 'multiply';
  fcx.fillStyle = color;
  fcx.fillRect(0, 0, pw, ph);
  fcx.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * (FA.soft[name] ?? FA.alpha);
  ctx.shadowBlur = 0;
  ctx.drawImage(fc, x - w / 2, top, w, h);
  ctx.restore();
  return true;
}
