// 전투 그리기 (논리 높이 390 · 너비는 창 비율): 시차 배경(장마다 색 바꾸기) · HD 도트 유닛(깊이 순 · 잔상 · 번쩍 · 자리표시자 색 바꾸기+이름표)
//  · 이펙트(빛줄기·기둥·파티클·흔들림·번쩍임) · 피해 숫자(만·억 · 겹침 없음은 sim.placeNum) · 일러스트 컷인 · 인연 말풍선
//  색·글꼴은 전부 theme/tokens 에서
import { CONFIG } from '../config';
import { animOf, drawFrame, frameAt, heightOf, type Sheet } from '../sprite/sheet';
import { canvasFace, canvasFont, elemColor, iconText, T } from '../theme/tokens';
import { has, shortNum, type Battle, type Unit } from './sim';
import { view } from '../ui/view';

export const LH = CONFIG.view.h;
export const GROUND = CONFIG.view.ground;
const B = T.battle;
const F = T.font.canvas;

export interface Art {
  sheet: Sheet;
  bg: HTMLImageElement | null;
  /** 컷인 일러스트 (영웅 id → 그림) · 없으면 초상화 확대 */
  cutin: Record<string, HTMLImageElement | HTMLCanvasElement>;
  /** 보스 전장 보스 그림 (부서지기 전 · 후) — 없으면 골렘 시트 */
  raidBoss?: { intact: HTMLImageElement | null; broken: HTMLImageElement | null };
  /** 콘텐츠 전투 배경 (탑·레이드·결투장·던전·요일 · docs/ART_DONE_1017_3.md §5) */
  bgs?: Record<string, HTMLImageElement>;
  /** 치명타 폭발 별 (public/art/ui/battle/crit_burst.png) */
  critBurst?: HTMLImageElement | null;
}
/** 이 전투 배경 그림 · 전용 배경이면 지역 색 안 씀 */
const bgOf = (art: Art, key?: string) => (key && art.bgs?.[key] ? { im: art.bgs[key], own: true } : { im: art.bg, own: false });

// 보조 캔버스는 화면 해상도(view.dpr)로 — 1배로 그린 뒤 늘리면 도트가 뭉개지고 2~3px씩 툭툭 끊김 (SPRITE_RES_1017 §A)
//  그 안은 논리 px로 그리고(setTransform dpr) 본 캔버스엔 논리 크기를 지정해 붙인다
const OW = 360;
const OH = 360;
const off = document.createElement('canvas');
const ox = off.getContext('2d')!;
/** 보조 캔버스를 지금 dpr 해상도로 맞추고 논리 px 기준으로 비움 */
function auxReady(cv: HTMLCanvasElement, c: CanvasRenderingContext2D, w: number, h: number) {
  const d = view.dpr;
  const pw = Math.round(w * d);
  const ph = Math.round(h * d);
  if (cv.width !== pw || cv.height !== ph) ((cv.width = pw), (cv.height = ph));
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, pw, ph);
  c.setTransform(d, 0, 0, d, 0, 0);
}
/** 내딛기 곡선 (§D): 들어갈 때 빠르게(ease-out) · 돌아올 때 천천히(ease-in-out) · 0~1 → 0~1~0 */
function lungeCurve(p: number) {
  const a = CONFIG.combat.lungeIn;
  if (p <= a) {
    const t = p / a;
    return 1 - (1 - t) * (1 - t);
  }
  const t = (p - a) / (1 - a);
  return 1 - (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.fillStyle = B.shadow;
  ctx.beginPath();
  ctx.ellipse(x, y + 2, w, w * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
}
const filterOf = (u: Unit) => {
  const sp = u.hero ?? u.pvp;
  return sp ? 'none' : (B.mobTint[u.mob!.tint] ?? 'none');
};

/** 유닛 하나 (도트 프레임 · 앞으로 내딛기 · 잔상 · 피격 번쩍 · 상태 표시) */
function drawUnit(ctx: CanvasRenderingContext2D, art: Art, u: Unit, now: number) {
  const face = u.flip ? -1 : 1;
  const H = u.h;
  const sp = u.hero ?? u.pvp;
  const { def, as } = animOf(u.anims, u.act);
  const ref = u.anims.idle!.frames[0];
  if (!art.sheet.img[ref]) return;
  let x = u.x + u.knock;
  let y = u.y;
  let alpha = 1;
  const dur = def.frames.length / def.fps;
  if (def.lunge && u.busy > 0) x += def.lunge * lungeCurve(Math.min(1, u.at / dur));
  // 걷기: 대기 2칸을 번갈아 + 살짝 들썩임
  if (as === 'walk') y -= CONFIG.combat.walkBob * Math.abs(Math.sin(u.at * def.fps * Math.PI));
  if (u.side === 'mob' && u.dead) {
    alpha = Math.max(0, 1 - u.deadT * 1.8);
    y += u.deadT * 24;
  }
  if (alpha <= 0) return;
  shadow(ctx, x + (u.mob?.boss ? 10 : 0), u.y, u.mob?.boss ? 95 : 26 * (H / 100));
  const k = H / heightOf(art.sheet, ref);
  const fi = frameAt(def, u.at);
  const filter = filterOf(u);
  // 잔상: 스킬 중 지난 프레임 2~3장을 색 입혀 뒤에
  if (u.trail > 0 && as !== 'idle') {
    for (let j = 3; j >= 1; j--) {
      const pf = Math.max(0, fi - j);
      auxReady(off, ox, OW, OH);
      drawFrame(ox, art.sheet, def.frames[pf], 180, 300, k, face);
      ox.globalCompositeOperation = 'source-atop';
      ox.fillStyle = sp ? elemColor(sp.def.elem) : B.white;
      ox.fillRect(0, 0, OW, OH);
      ox.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.18 * (4 - j) * alpha;
      ctx.drawImage(off, x - 180 - j * 10 * face, y - 300, OW, OH);
    }
    ctx.globalAlpha = 1;
  }
  auxReady(off, ox, OW, OH);
  // 피격: 흰색 덮기 대신 살짝 밝게 (최대 hitFlash.max · 0.08초 안에 꺼짐) — 유령처럼 하얗게 바래 보이던 것 (§D)
  const HF = CONFIG.combat.hitFlash;
  const fl = Math.min(HF.max, u.flash);
  ox.filter = fl > 0.02 ? `${filter === 'none' ? '' : filter} brightness(${1 + HF.bright * fl})`.trim() : filter;
  drawFrame(ox, art.sheet, def.frames[fi], 180, 300, k, face);
  ox.filter = 'none';
  ctx.globalAlpha = u.hero && u.dead ? 0.85 : alpha;
  if (u.hero && u.dead && as !== 'down') {
    // 쓰러짐 동작이 없는 영웅: 대기 그림을 뒤로 눕힌다
    const r = Math.min(1, u.deadT / 0.35);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-Math.PI / 2) * r);
    ctx.filter = 'brightness(0.7)';
    ctx.drawImage(off, -180, -300 + r * 12, OW, OH);
    ctx.restore();
  } else {
    // 대기 숨쉬기: 발 기준 세로 1.000↔1.012 (1.6초 · 유닛마다 위상 다름)
    const BR = CONFIG.combat.breathe;
    const sy = as === 'idle' && !u.dead ? 1 + (BR.amp / 2) * (1 + Math.sin(((now + u.uid * 0.37) / BR.sec) * Math.PI * 2)) : 1;
    ctx.drawImage(off, x - 180, y - 300 * sy, OW, OH * sy);
  }
  ctx.globalAlpha = 1;
  if (u.dead) return;
  // 자리표시자 영웅: 이름표 (그림이 아직 없다는 표시)
  if (sp && (u.ai || u.pvp)) tag(ctx, u.ai ? `${sp.def.name} (AI)` : sp.def.name, x, y + 12);
  // 보호막 · 기절 · 침묵 · 화상
  if (u.shield > 0) {
    ctx.strokeStyle = B.shield;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - H * 0.48, H * 0.36, H * 0.56, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.textAlign = 'center';
  const marks = [has(u, 'stun') && iconText('stun'), has(u, 'silence') && iconText('silence'), has(u, 'burn') && iconText('burn'), has(u, 'slow') && iconText('slow')].filter(Boolean) as string[];
  if (marks.length) {
    ctx.font = canvasFont(F.stun, 'bold', false);
    ctx.fillStyle = B.stun;
    ctx.fillText(marks.join(' '), x + Math.sin(now * 8) * 4, y - H - (u.mob && !u.mob.boss ? 12 : 4));
  }
  if (u.mob && !u.mob.boss) {
    const w = 46;
    ctx.fillStyle = B.hpBar;
    ctx.fillRect(x - w / 2 - 1, y - H - 7, w + 2, 6);
    ctx.fillStyle = has(u, 'slow') ? B.slowBar : B.hpMob;
    ctx.fillRect(x - w / 2, y - H - 6, w * (u.hp / u.max), 4);
  }
}
function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = canvasFont(F.tag, 'bold', false);
  ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 8;
  ctx.fillStyle = B.placeholderTag;
  ctx.fillRect(x - w / 2, y - 9, w, 13);
  ctx.fillStyle = B.tagText;
  ctx.fillText(text, x, y + 1);
}

// ───────── 배경 (그림 1장을 장마다 색 바꾸기) ─────────
function background(ctx: CanvasRenderingContext2D, art: Art, s: number, W: number, region: number, key?: string) {
  const { im, own } = bgOf(art, key);
  if (im) {
    const y0 = -160;
    const h = LH - y0;
    const w = (im.width / im.height) * h;
    const o = -((s * 0.25) % w);
    ctx.filter = own ? 'none' : (B.region[region] ?? 'none');
    for (let x = o; x < W; x += w) ctx.drawImage(im, Math.floor(x), y0, Math.ceil(w) + 1, h);
    ctx.filter = 'none';
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, LH);
    g.addColorStop(0, B.sky[0]);
    g.addColorStop(1, B.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, LH);
  }
  const gy = GROUND - 30;
  const road = ctx.createLinearGradient(0, gy, 0, LH);
  road.addColorStop(0, B.road0);
  road.addColorStop(0.15, B.road1);
  road.addColorStop(1, B.road2);
  ctx.fillStyle = road;
  ctx.fillRect(0, gy, W, LH - gy);
  ctx.fillStyle = B.pebble;
  for (let i = 0; i < 30; i++) {
    const x = ((((i * 97 - s) % (W + 60)) + W + 60) % (W + 60)) - 30;
    const y = gy + 24 + ((i * 53) % 80);
    ctx.fillRect(Math.round(x), Math.round(y), 4 + (i % 3) * 2, 2);
  }
  for (let i = 0; i < 18; i++) {
    const x = ((((i * 131 - s * 1.5) % (W + 80)) + W + 80) % (W + 80)) - 40;
    const y = LH - 2;
    ctx.fillStyle = i % 5 === 0 ? B.grass[2] : i % 2 ? B.grass[0] : B.grass[1];
    for (let j = 0; j < 5; j++) ctx.fillRect(Math.round(x + j * 4), y - 8 - ((j * 7 + i) % 9), 3, 12);
  }
}

// ───────── 이펙트 ─────────
function drawFx(ctx: CanvasRenderingContext2D, b: Battle) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const f of b.fx) {
    const u = f.t / f.dur;
    ctx.globalAlpha = Math.max(0, 1 - u);
    ctx.strokeStyle = f.color;
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 14;
    switch (f.kind) {
      case 'slash': {
        ctx.lineWidth = 9 * (1 - u) + 1;
        const r = 44 + u * 18;
        const d = f.r ?? 1;
        ctx.beginPath();
        ctx.arc(f.x - 10, f.y, r, -1.2 * d - 0.3, 0.9 * d + 0.3, d < 0);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = B.white;
        ctx.stroke();
        break;
      }
      case 'burst':
      case 'star': {
        const r = (f.r ?? 40) * (0.4 + u * 0.9);
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        g.addColorStop(0, B.white);
        g.addColorStop(0.35, f.color);
        g.addColorStop(1, B.clear);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + u;
          ctx.beginPath();
          ctx.moveTo(f.x + Math.cos(a) * r * 0.4, f.y + Math.sin(a) * r * 0.4);
          ctx.lineTo(f.x + Math.cos(a) * r * 1.3, f.y + Math.sin(a) * r * 1.3);
          ctx.stroke();
        }
        if (f.kind === 'star') {
          ctx.fillStyle = B.white;
          ctx.beginPath();
          const sx = f.x + 80 * (1 - Math.min(1, u * 3));
          const sy = f.y - 200 * (1 - Math.min(1, u * 3));
          ctx.arc(sx, sy, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'ring':
      case 'shield':
      case 'heal': {
        ctx.lineWidth = 3;
        const r = (f.r ?? 40) * (0.5 + u * 0.6);
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, r, f.kind === 'ring' ? r * 0.28 : r, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (f.kind === 'heal') for (let i = 0; i < 6; i++) ctx.fillRect(f.x + Math.sin(i * 2.1) * 26, f.y + 30 - u * 70 - i * 7, 3, 3);
        break;
      }
      case 'pillar': {
        const w = (f.r ?? 30) * (1 - u * 0.5);
        const g = ctx.createLinearGradient(f.x - w, 0, f.x + w, 0);
        g.addColorStop(0, B.clear);
        g.addColorStop(0.5, f.color);
        g.addColorStop(1, B.clear);
        ctx.fillStyle = g;
        ctx.fillRect(f.x - w, 0, w * 2, f.y);
        ctx.fillStyle = B.white;
        ctx.fillRect(f.x - 2, 0, 4, f.y);
        break;
      }
      case 'beam': {
        const p = Math.min(1, u * 3);
        const ex = f.x + ((f.x2 ?? f.x) - f.x) * p;
        const ey = f.y + ((f.y2 ?? f.y) - f.y) * p;
        ctx.lineCap = 'round';
        ctx.lineWidth = 22 * (1 - u) + 4;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.lineWidth = 6 * (1 - u) + 1;
        ctx.strokeStyle = B.white;
        ctx.stroke();
        break;
      }
      case 'bolt': {
        const p = Math.min(1, u * 1.4);
        const bx = f.x + ((f.x2 ?? f.x) - f.x) * p;
        const by = f.y + ((f.y2 ?? f.y) - f.y) * p;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - ((f.x2 ?? f.x) - f.x) * 0.18, by - ((f.y2 ?? f.y) - f.y) * 0.18);
        ctx.stroke();
        break;
      }
      case 'slam': {
        ctx.lineWidth = 10 * (1 - u) + 2;
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, (f.r ?? 100) * (0.3 + u), (f.r ?? 100) * 0.2 * (0.3 + u), 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
    }
  }
  ctx.shadowBlur = 0;
  for (const p of b.parts) {
    ctx.globalAlpha = Math.max(0, 1 - p.t / p.dur);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  }
  ctx.restore();
}

function drawNums(ctx: CanvasRenderingContext2D, b: Battle, art: Art) {
  const N = CONFIG.combat.nums;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (const n of b.nums) {
    const crit = n.kind === 'crit';
    // 치명타: critPop초 동안 커졌다(1.3배) 작아짐 · 일반: 짧게 톡 튀어나옴
    const pop = crit
      ? n.t < N.critPop * 0.35 ? 0.6 + (n.t / (N.critPop * 0.35)) * 0.7 : 1.3 - Math.min(0.3, ((n.t - N.critPop * 0.35) / (N.critPop * 0.65)) * 0.3)
      : n.t < 0.08 ? 0.6 + (n.t / 0.08) * 0.55 : 1.15 - Math.min(0.15, (n.t - 0.08) * 0.8);
    const base = crit ? F.numCrit : (n.big ? F.numBig : n.kind === 'hurt' || n.kind === 'burn' ? F.num * 0.8 : F.num) * N.normalScale;
    const size = base * pop;
    const y = n.y - n.t * N.rise;
    const text = shortNum(n.v) + (n.kind === 'heal' ? '+' : '');
    const alpha = Math.min(1, (N.life - n.t) * 4);
    ctx.globalAlpha = alpha;
    ctx.font = canvasFont(Math.round(size));
    // 치명타 폭발 별을 숫자 뒤에
    if (crit && art.critBurst) {
      const bw = ctx.measureText(text).width * N.burstW;
      const bh = (bw * art.critBurst.naturalHeight) / art.critBurst.naturalWidth;
      ctx.globalAlpha = alpha * Math.min(1, n.t * 10);
      ctx.drawImage(art.critBurst, n.x - bw / 2, y - size * 0.42 - bh / 2, bw, bh);
      ctx.globalAlpha = alpha;
    }
    // 외곽선은 가운데 기준으로 그어지니 두께 × 2
    ctx.lineWidth = (crit ? N.critStroke : N.stroke) * 2;
    ctx.strokeStyle = n.kind === 'heal' ? B.numHealStroke : crit ? B.numCritStroke : B.numStroke;
    ctx.strokeText(text, n.x, y);
    if (crit) {
      const g = ctx.createLinearGradient(0, y - size * 0.8, 0, y);
      g.addColorStop(0, B.numCrit[0]);
      g.addColorStop(0.5, B.numCrit[1]);
      g.addColorStop(1, B.numCrit[2]);
      ctx.fillStyle = g;
    } else ctx.fillStyle = n.kind === 'heal' ? B.numHeal : n.kind === 'hurt' ? B.numMob : n.kind === 'burn' ? B.burn : B.numText;
    ctx.fillText(text, n.x, y);
    if (crit) {
      // 「치명타」 = 숫자 위 작은 기운 리본
      ctx.save();
      ctx.translate(n.x - size * 0.5, y - size * 0.95);
      ctx.rotate(-0.14);
      ctx.font = canvasFace(F.critLabel, 'menu');
      const lw = ctx.measureText('치명타').width + 10;
      const lh = F.critLabel + 4;
      ctx.fillStyle = B.critRibbon;
      ctx.beginPath();
      ctx.roundRect(-lw / 2, -lh + 3, lw, lh, 3);
      ctx.fill();
      ctx.fillStyle = B.numCritLabel;
      ctx.fillText('치명타', 0, 0);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

/** 인연 말풍선 */
function drawSays(ctx: CanvasRenderingContext2D, b: Battle) {
  for (const s of b.says) {
    if (s.t < 0) continue;
    const u = b.heroes.find((h) => h.uid === s.uid);
    if (!u || u.dead) continue;
    ctx.globalAlpha = Math.min(1, s.t * 5, (s.dur - s.t) * 4);
    ctx.font = canvasFont(F.tag + 1, 'bold', false);
    ctx.textAlign = 'center';
    const w = ctx.measureText(s.text).width + 12;
    const x = Math.max(w / 2 + 4, u.x);
    const y = u.y - u.h - 22;
    ctx.fillStyle = B.placeholderTag;
    ctx.fillRect(x - w / 2, y - 12, w, 18);
    ctx.fillStyle = B.tagText;
    ctx.fillText(s.text, x, y + 1);
  }
  ctx.globalAlpha = 1;
}

/** 일러스트 컷인: 기울어진 띠 + 일러스트가 화면을 가로지름 */
function drawCut(ctx: CanvasRenderingContext2D, art: Art, b: Battle, W: number) {
  const c = b.cut;
  if (!c) return;
  const u = c.t / CONFIG.combat.cutInSec;
  const ein = Math.min(1, u / 0.2);
  const eout = Math.max(0, (u - 0.78) / 0.22);
  ctx.save();
  ctx.globalAlpha = 1 - eout;
  ctx.fillStyle = B.cutVeil;
  ctx.fillRect(0, 0, W, LH);
  ctx.translate(W / 2, LH * 0.44);
  ctx.rotate(-0.1);
  const bw = W * 1.4;
  const bh = 150;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-bw / 2, -bh / 2, bw * ein, bh);
  ctx.clip();
  const g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
  g.addColorStop(0, B.cutEdge);
  g.addColorStop(0.45, elemColor(c.skill.elem));
  g.addColorStop(1, B.cutEdge);
  ctx.fillStyle = g;
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  ctx.strokeStyle = B.cutLine;
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const yy = -bh / 2 + ((i * 37) % bh);
    const xx = ((i * 211 + c.t * 2400) % bw) - bw / 2;
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.lineTo(xx + 120, yy);
    ctx.stroke();
  }
  const im = art.cutin[c.u.hero!.def.id];
  // 컷인 그림은 고화질 일러스트 → 부드럽게 줄임 (도트 전투와 다름)
  ctx.imageSmoothingEnabled = true;
  if (im) {
    const ih = bh * 1.9;
    const iw = (im.width / im.height) * ih;
    const ix = -W * 0.62 + ein * W * 0.28 + u * 70;
    ctx.drawImage(im, ix, -ih * 0.42, iw, ih);
  }
  ctx.restore();
  ctx.fillStyle = B.cutBar;
  ctx.fillRect(-bw / 2, -bh / 2 - 3, bw * ein, 3);
  ctx.fillRect(-bw / 2, bh / 2, bw * ein, 3);
  ctx.font = canvasFace(F.cutName, 'title');
  ctx.textAlign = 'right';
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = B.cutStroke;
  const tx = W * 0.42 + (1 - ein) * 160;
  ctx.strokeText(c.skill.name, tx, 22);
  ctx.fillStyle = B.white;
  ctx.fillText(c.skill.name, tx, 22);
  ctx.font = canvasFace(F.cutHero + 3, 'hero');
  ctx.lineWidth = 6;
  ctx.strokeText(c.u.name, tx, -14);
  ctx.fillStyle = B.cutName;
  ctx.fillText(c.u.name, tx, -14);
  ctx.restore();
}

/** 전투 없이 배경만 (타이틀·로비 뒤) */
export function renderBg(ctx: CanvasRenderingContext2D, art: Art, scroll: number, W: number, region = 0) {
  background(ctx, art, scroll, W, region);
}
export function render(ctx: CanvasRenderingContext2D, art: Art, b: Battle, now: number) {
  if (b.raid) return renderRaid(ctx, art, b, now);
  const W = b.w;
  ctx.save();
  if (b.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * b.shake * 2), Math.round((Math.random() - 0.5) * b.shake * 2));
  background(ctx, art, b.scroll, W, b.setup.region, b.setup.bg);
  // 보스 패턴 경고: 영웅 발밑이 붉게 깜빡
  if (b.pat.warn > 0)
    for (const h of b.heroes) {
      if (h.dead) continue;
      ctx.fillStyle = `${B.warnFloor}${0.22 + 0.3 * Math.abs(Math.sin(now * 12))})`;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, 38, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  const units = [...b.heroes, ...b.mobs].sort((a, c) => (a.mob?.boss ? -1 : c.mob?.boss ? 1 : a.y - c.y));
  for (const u of units) drawUnit(ctx, art, u, now);
  drawFx(ctx, b);
  drawSays(ctx, b);
  drawNums(ctx, b, art);
  ctx.restore();
  if (b.flash > 0) {
    ctx.fillStyle = `${B.flash}${b.flash * 0.55})`;
    ctx.fillRect(0, 0, W, LH);
  }
  drawCut(ctx, art, b, W);
}

// ───────── 보스 전장 (레이드 · 월드 보스 · 길드 레이드) ─────────
const RA = CONFIG.raidArena;
const BW = 760;
const BH = 640;
const bossCv = document.createElement('canvas');
const bx = bossCv.getContext('2d')!;
/** 다층 배경 (멀수록 느리게 · 페이즈마다 색) */
function raidBackground(ctx: CanvasRenderingContext2D, art: Art, b: Battle, W: number) {
  const r = b.raid!;
  const { im, own } = bgOf(art, b.setup.bg);
  const tint = `${own ? 'none' : (B.region[b.setup.region] ?? 'none')} ${B.phaseTint[Math.min(r.phase, B.phaseTint.length - 1)]}`.replace(/none ?/g, '').trim() || 'none';
  if (im) {
    RA.parallax.forEach(([sp, sc], i) => {
      const h = (LH + 160) * sc;
      const w = (im.width / im.height) * h;
      const o = -(((b.t * 30 * sp) % w) + w) % w;
      ctx.globalAlpha = i === 0 ? 1 : 0.55;
      ctx.filter = `${tint === 'none' ? '' : tint} brightness(${0.7 + i * 0.15})`.trim();
      for (let x = o; x < W; x += w) ctx.drawImage(im, Math.floor(x), LH - h + (i === 0 ? 40 : 90 + i * 20), Math.ceil(w) + 1, h);
    });
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
  } else background(ctx, art, b.t * 10, W, b.setup.region, b.setup.bg);
  // 두 줄 바닥 + 경고 줄
  const half = Math.abs(RA.lanes[1] - RA.lanes[0]) / 2;
  RA.lanes.forEach((y, i) => {
    const warn = r.warnLane === i;
    ctx.fillStyle = warn ? `${B.laneWarn}${0.22 + 0.25 * Math.abs(Math.sin(b.t * 14))})` : B.laneBand;
    ctx.fillRect(0, y - half + 4, W * RA.bossX - 60, half * 2 - 8);
    ctx.fillStyle = B.laneEdge;
    ctx.fillRect(0, y + half - 5, W * RA.bossX - 60, 1);
    if (warn) {
      ctx.font = canvasFont(F.cutHero, 'black', false);
      ctx.textAlign = 'left';
      ctx.fillStyle = B.numCritLabel;
      ctx.fillText(`${iconText('warn')} ${i === 0 ? '위' : '아래'} 줄`, 10, y - half + 22);
    }
  });
}
/** 거대 보스 + 부서진 부위 (그림 두 장이 있으면 부서진 그림을 부위 자리만 · 없으면 골렘 시트에 코드로 금·구멍) */
function drawRaidBoss(ctx: CanvasRenderingContext2D, art: Art, u: Unit, b: Battle, now: number) {
  const r = b.raid!;
  const H = u.h;
  const { def } = animOf(u.anims, u.act);
  const fi = frameAt(def, u.at);
  const ref = u.anims.idle!.frames[0];
  const k = H / heightOf(art.sheet, ref);
  const cx = BW / 2;
  const fy = BH - 20;
  auxReady(bossCv, bx, BW, BH);
  const ri = art.raidBoss;
  const box = (p: { box: number[] }) => {
    const [px, up, w, h] = p.box;
    return [cx + px * H * 0.9, fy - up * H, w * H * 0.9, h * H] as const;
  };
  if (ri?.intact) {
    const w = (ri.intact.width / ri.intact.height) * H;
    bx.drawImage(ri.intact, cx - w / 2, fy - H, w, H);
    if (ri.broken)
      for (const p of r.parts.filter((x) => x.broken)) {
        const [x, y, w2, h2] = box(p);
        bx.save();
        bx.beginPath();
        bx.rect(x, y, w2, h2);
        bx.clip();
        bx.clearRect(x, y, w2, h2);
        bx.drawImage(ri.broken, cx - w / 2, fy - H, w, H);
        bx.restore();
      }
  } else {
    bx.filter = filterOf(u);
    drawFrame(bx, art.sheet, def.frames[fi], cx, fy, k, 1);
    bx.filter = 'none';
    // 부서진 부위: 들쭉날쭉한 구멍 + 금 + 안쪽 불빛
    for (const p of r.parts.filter((x) => x.broken)) {
      const [x, y, w, h] = box(p);
      bx.save();
      bx.globalCompositeOperation = 'destination-out';
      bx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const rr = 0.32 + ((i * 37) % 7) / 30;
        bx.lineTo(x + w / 2 + Math.cos(a) * w * rr, y + h / 2 + Math.sin(a) * h * rr);
      }
      bx.closePath();
      bx.fill();
      bx.restore();
      bx.strokeStyle = B.crackGlow;
      bx.lineWidth = 3;
      bx.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 6; i++) {
        bx.beginPath();
        bx.moveTo(x + w / 2, y + h / 2);
        bx.lineTo(x + w / 2 + Math.cos(i * 1.1) * w * 0.9, y + h / 2 + Math.sin(i * 1.1) * h * 0.9);
        bx.stroke();
      }
      bx.globalCompositeOperation = 'source-over';
    }
  }
  // 맞을 때 번쩍임: 보스는 8명이 계속 때려서 늘 켜져 있음 → 그림이 하얗게 바래 보였음 (ART_DONE_1017 남은 것 1) · 큰 타격(flash 큼)일 때만 살짝
  if (u.flash > RA.flashMin) {
    bx.globalCompositeOperation = 'source-atop';
    bx.fillStyle = `${B.hitFlash}${RA.flashMax * u.flash})`;
    bx.fillRect(0, 0, BW, BH);
    bx.globalCompositeOperation = 'source-over';
  }
  if (r.downT > 0) {
    bx.globalCompositeOperation = 'source-atop';
    bx.fillStyle = B.downVeil;
    bx.fillRect(0, 0, BW, BH);
    bx.globalCompositeOperation = 'source-over';
  }
  shadow(ctx, u.x, u.y, 170);
  const tilt = r.downT > 0 ? 0.08 : 0;
  ctx.save();
  ctx.translate(u.x + u.knock, u.y);
  ctx.rotate(tilt);
  ctx.globalAlpha = u.dead ? Math.max(0, 1 - u.deadT) : 1;
  ctx.drawImage(bossCv, -cx, -fy, BW, BH);
  ctx.restore();
  // 집중 공격 부위 테두리
  const fp = r.focus >= 0 ? r.parts[r.focus] : r.parts.find((p) => !p.broken);
  if (fp && !u.dead) {
    const [x, y, w, h] = box(fp);
    ctx.strokeStyle = B.focusRing;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(u.x - cx + x, u.y - fy + y, w, h);
    ctx.setLineDash([]);
  }
  if (r.downT > 0) {
    ctx.font = canvasFont(F.stun + 6, 'black', false);
    ctx.textAlign = 'center';
    ctx.fillStyle = B.stun;
    ctx.fillText(`${iconText('stun')} 다운 ${Math.ceil(r.downT)}`, u.x + Math.sin(now * 6) * 8, u.y - H - 6);
  }
}
/** 부위 화면 자리 (HUD 탭·시험용) */
export function partRect(b: Battle, i: number): [number, number, number, number] | null {
  const boss = b.mobs.find((m) => m.mob?.boss);
  if (!boss || !b.raid) return null;
  const [px, up, w, h] = b.raid.parts[i].box;
  return [boss.x + px * boss.h * 0.9, boss.y - up * boss.h, w * boss.h * 0.9, h * boss.h];
}
/** 협공 컷인: 두 영웅이 양쪽에서 맞붙음 + 조합 이름 */
function drawDuo(ctx: CanvasRenderingContext2D, art: Art, b: Battle, W: number) {
  const d = b.raid?.duo;
  if (!d) return;
  const u = d.t / 1.4;
  const ein = Math.min(1, u / 0.2);
  const eout = Math.max(0, (u - 0.8) / 0.2);
  ctx.save();
  ctx.globalAlpha = 1 - eout;
  ctx.fillStyle = B.cutVeil;
  ctx.fillRect(0, 0, W, LH);
  const side = (unit: Unit, left: boolean, color: string) => {
    ctx.save();
    ctx.translate(left ? W * 0.27 : W * 0.73, LH * 0.45);
    ctx.rotate(left ? -0.12 : 0.12);
    const bw = W * 0.62;
    const bh = 170;
    const off = (1 - ein) * W * (left ? -0.6 : 0.6);
    const g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    g.addColorStop(0, B.cutEdge);
    g.addColorStop(0.5, color);
    g.addColorStop(1, B.cutEdge);
    ctx.fillStyle = g;
    ctx.fillRect(-bw / 2 + off, -bh / 2, bw, bh);
    const im = art.cutin[unit.hero!.def.id];
    if (im) {
      const ih = bh * 1.5;
      const iw = (im.width / im.height) * ih;
      ctx.drawImage(im, -iw / 2 + off, -ih * 0.42, iw, ih);
    }
    ctx.font = canvasFont(F.cutHero, 'bold', false);
    ctx.textAlign = 'center';
    ctx.fillStyle = B.cutName;
    ctx.fillText(unit.name, off, bh / 2 - 8);
    ctx.restore();
  };
  side(d.a, true, B.duoA);
  side(d.b, false, B.duoB);
  ctx.font = canvasFont(F.cutName);
  ctx.textAlign = 'center';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = B.cutStroke;
  ctx.strokeText(d.name, W / 2, LH * 0.82);
  ctx.fillStyle = B.white;
  ctx.fillText(d.name, W / 2, LH * 0.82);
  ctx.font = canvasFont(F.cutHero, 'bold', false);
  ctx.lineWidth = 5;
  ctx.strokeText(`「${d.line}」`, W / 2, LH * 0.82 + 24);
  ctx.fillStyle = B.cutName;
  ctx.fillText(`「${d.line}」`, W / 2, LH * 0.82 + 24);
  ctx.restore();
}
function drawNote(ctx: CanvasRenderingContext2D, b: Battle, W: number) {
  const n = b.raid?.note;
  if (!n) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, n.t * 6, (2.6 - n.t) * 3);
  ctx.font = canvasFont(F.cutHero + 3, 'black', false);
  ctx.textAlign = 'center';
  const w = ctx.measureText(n.text).width + 30;
  ctx.fillStyle = B.noteBg;
  ctx.fillRect(W / 2 - w / 2, 92, w, 30);
  ctx.fillStyle = B.numCritLabel;
  ctx.fillText(n.text, W / 2, 113);
  ctx.restore();
}
/** 보스 전장 그리기 */
function renderRaid(ctx: CanvasRenderingContext2D, art: Art, b: Battle, now: number) {
  const W = b.w;
  const r = b.raid!;
  ctx.save();
  if (b.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * b.shake * 2.5), Math.round((Math.random() - 0.5) * b.shake * 2.5));
  // 카메라 줌 (필살기 · 페이즈 클로즈업)
  if (r.zoom) {
    const p = Math.sin(Math.min(1, r.zoom.t / r.zoom.dur) * Math.PI);
    const k = 1 + (r.zoom.k - 1) * p;
    ctx.translate(r.zoom.x, r.zoom.y);
    ctx.scale(k, k);
    ctx.translate(-r.zoom.x, -r.zoom.y);
  }
  raidBackground(ctx, art, b, W);
  const boss = b.mobs.find((m) => m.mob?.boss);
  if (boss) drawRaidBoss(ctx, art, boss, b, now);
  const units = [...b.heroes, ...b.mobs.filter((m) => !m.mob?.boss)].sort((a, c) => a.y - c.y);
  for (const u of units) drawUnit(ctx, art, u, now);
  drawFx(ctx, b);
  drawSays(ctx, b);
  drawNums(ctx, b, art);
  ctx.restore();
  if (b.flash > 0) {
    ctx.fillStyle = `${B.flash}${b.flash * 0.55})`;
    ctx.fillRect(0, 0, W, LH);
  }
  drawNote(ctx, b, W);
  drawCut(ctx, art, b, W);
  drawDuo(ctx, art, b, W);
}
