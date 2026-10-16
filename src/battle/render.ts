// 전투 그리기 (논리 높이 390 · 너비는 창 비율): 시차 배경(장마다 색 바꾸기) · HD 도트 유닛(깊이 순 · 잔상 · 번쩍 · 자리표시자 색 바꾸기+이름표)
//  · 이펙트(빛줄기·기둥·파티클·흔들림·번쩍임) · 피해 숫자(만·억 · 겹침 없음은 sim.placeNum) · 일러스트 컷인 · 인연 말풍선
//  색·글꼴은 전부 theme/tokens 에서
import { CONFIG } from '../config';
import { animOf, drawFrame, frameAt, heightOf, type Sheet } from '../sprite/sheet';
import { canvasFont, elemColor, iconText, T } from '../theme/tokens';
import { has, shortNum, type Battle, type Unit } from './sim';

export const LH = CONFIG.view.h;
export const GROUND = CONFIG.view.ground;
const B = T.battle;
const F = T.font.canvas;

export interface Art {
  sheet: Sheet;
  bg: HTMLImageElement | null;
  /** 컷인 일러스트 (영웅 id → 그림) · 없으면 초상화 확대 */
  cutin: Record<string, HTMLImageElement | HTMLCanvasElement>;
}

const off = document.createElement('canvas');
off.width = 360;
off.height = 360;
const ox = off.getContext('2d')!;

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.fillStyle = B.shadow;
  ctx.beginPath();
  ctx.ellipse(x, y + 2, w, w * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
}
const filterOf = (u: Unit) => (u.hero ? (u.hero.art.tint >= 0 ? B.tint[u.hero.art.tint] : 'none') : B.mobTint[u.mob!.tint] ?? 'none');

/** 유닛 하나 (도트 프레임 · 앞으로 내딛기 · 잔상 · 피격 번쩍 · 상태 표시) */
function drawUnit(ctx: CanvasRenderingContext2D, art: Art, u: Unit, now: number) {
  const face = 1;
  const H = u.h;
  const { def, as } = animOf(u.anims, u.act);
  const ref = u.anims.idle!.frames[0];
  if (!art.sheet.img[ref]) return;
  let x = u.x + u.knock;
  let y = u.y;
  let alpha = 1;
  const dur = def.frames.length / def.fps;
  if (def.lunge && u.busy > 0) x += def.lunge * Math.sin(Math.min(1, u.at / dur) * Math.PI);
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
      ox.setTransform(1, 0, 0, 1, 0, 0);
      ox.clearRect(0, 0, off.width, off.height);
      drawFrame(ox, art.sheet, def.frames[pf], 180, 300, k, face);
      ox.globalCompositeOperation = 'source-atop';
      ox.fillStyle = u.hero ? elemColor(u.hero.def.elem) : B.white;
      ox.fillRect(0, 0, off.width, off.height);
      ox.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.18 * (4 - j) * alpha;
      ctx.drawImage(off, x - 180 - j * 10 * face, y - 300);
    }
    ctx.globalAlpha = 1;
  }
  ox.setTransform(1, 0, 0, 1, 0, 0);
  ox.clearRect(0, 0, off.width, off.height);
  ox.filter = filter;
  drawFrame(ox, art.sheet, def.frames[fi], 180, 300, k, face);
  ox.filter = 'none';
  if (u.flash > 0.05) {
    ox.globalCompositeOperation = 'source-atop';
    ox.fillStyle = `${B.hitFlash}${0.8 * u.flash})`;
    ox.fillRect(0, 0, off.width, off.height);
    ox.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = u.hero && u.dead ? 0.85 : alpha;
  if (u.hero && u.dead && as !== 'down') {
    // 쓰러짐 동작이 없는 영웅: 대기 그림을 뒤로 눕힌다
    const r = Math.min(1, u.deadT / 0.35);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-Math.PI / 2) * r);
    ctx.filter = 'brightness(0.7)';
    ctx.drawImage(off, -180, -300 + r * 12);
    ctx.restore();
  } else ctx.drawImage(off, x - 180, y - 300);
  ctx.globalAlpha = 1;
  if (u.dead) return;
  // 자리표시자 영웅: 이름표 (그림이 아직 없다는 표시)
  if (u.hero?.art.placeholder) tag(ctx, u.hero.def.name, x, y + 12);
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
function background(ctx: CanvasRenderingContext2D, art: Art, s: number, W: number, region: number) {
  if (art.bg) {
    const im = art.bg;
    const y0 = -160;
    const h = LH - y0;
    const w = (im.width / im.height) * h;
    const o = -((s * 0.25) % w);
    ctx.filter = B.region[region] ?? 'none';
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

function drawNums(ctx: CanvasRenderingContext2D, b: Battle) {
  const N = CONFIG.combat.nums;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (const n of b.nums) {
    const crit = n.kind === 'crit';
    const pop = n.t < 0.08 ? 0.6 + (n.t / 0.08) * 0.55 : 1.15 - Math.min(0.15, (n.t - 0.08) * 0.8);
    const base = crit ? F.numCrit : n.big ? F.numBig : n.kind === 'hurt' || n.kind === 'burn' ? F.num * 0.8 : F.num;
    const size = base * pop;
    const y = n.y - n.t * N.rise;
    const text = shortNum(n.v) + (n.kind === 'heal' ? '+' : '');
    ctx.globalAlpha = Math.min(1, (N.life - n.t) * 4);
    ctx.font = canvasFont(Math.round(size));
    ctx.lineWidth = crit ? 7 : 4;
    ctx.strokeStyle = n.kind === 'heal' ? B.numHealStroke : crit ? B.numCritStroke : B.numStroke;
    ctx.strokeText(text, n.x, y);
    if (crit) {
      const g = ctx.createLinearGradient(0, y - size, 0, y);
      g.addColorStop(0, B.numCrit[0]);
      g.addColorStop(0.5, B.numCrit[1]);
      g.addColorStop(1, B.numCrit[2]);
      ctx.fillStyle = g;
    } else ctx.fillStyle = n.kind === 'heal' ? B.numHeal : n.kind === 'hurt' ? B.numMob : n.kind === 'burn' ? B.burn : B.numText;
    ctx.fillText(text, n.x, y);
    if (crit) {
      ctx.font = canvasFont(F.critLabel, 'black', false);
      ctx.lineWidth = 4;
      ctx.strokeText('치명타', n.x, y - size + 1);
      ctx.fillStyle = B.numCritLabel;
      ctx.fillText('치명타', n.x, y - size + 1);
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
  ctx.font = canvasFont(F.cutName);
  ctx.textAlign = 'right';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = B.cutStroke;
  const tx = W * 0.42 + (1 - ein) * 160;
  ctx.strokeText(c.skill.name, tx, 22);
  ctx.fillStyle = B.white;
  ctx.fillText(c.skill.name, tx, 22);
  ctx.font = canvasFont(F.cutHero, 'bold', false);
  ctx.lineWidth = 5;
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
  const W = b.w;
  ctx.save();
  if (b.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * b.shake * 2), Math.round((Math.random() - 0.5) * b.shake * 2));
  background(ctx, art, b.scroll, W, b.setup.region);
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
  drawNums(ctx, b);
  ctx.restore();
  if (b.flash > 0) {
    ctx.fillStyle = `${B.flash}${b.flash * 0.55})`;
    ctx.fillRect(0, 0, W, LH);
  }
  drawCut(ctx, art, b, W);
}
