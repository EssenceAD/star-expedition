// 전투 그리기 (논리 844×390 · 가로): 시차 3겹 배경 · HD 도트 유닛(깊이 순 · 잔상 · 번쩍) · 이펙트(빛줄기·기둥·파티클·흔들림·번쩍임) · 큰 피해 숫자(만·억) · 일러스트 컷인
import { animOf, drawFrame, frameAt, heightOf, type Sheet } from '../sprite/sheet';
import { type Battle, type Unit } from './sim';
import { COMBAT } from './data';

export const LW = 844;
export const LH = 390;
export const GROUND = 254;

export interface Art {
  sheet: Sheet;
  /** 도트 시트가 아직 없는 적: 그림 한 장 (GPT 일러스트 적) */
  mobImg: Record<string, HTMLImageElement>;
  bg: HTMLImageElement | null;
  /** 컷인 일러스트 (영웅 id → 그림) · 없으면 초상화 */
  cutin: Record<string, HTMLImageElement | HTMLCanvasElement>;
}

/** 만·억 단위 (킹스레이드 문법: 큰 숫자를 짧게) */
export function short(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(n >= 1e9 ? 1 : 2).replace(/\.?0+$/, '')}억`;
  if (n >= 1e4) return `${(n / 1e4).toFixed(n >= 1e5 ? 1 : 2).replace(/\.?0+$/, '')}만`;
  return Math.round(n).toLocaleString('ko-KR');
}

const off = document.createElement('canvas');
off.width = 360;
off.height = 360;
const ox = off.getContext('2d')!;

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  ctx.fillStyle = 'rgba(25,30,20,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, w, w * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** 유닛 하나 (도트 프레임 · 앞으로 내딛기 · 잔상 · 피격 번쩍) */
function drawUnit(ctx: CanvasRenderingContext2D, art: Art, u: Unit, now: number) {
  // 시트가 이미 방향대로 그려져 있음 (영웅 오른쪽 · 적 왼쪽)
  const face = 1;
  const H = u.hero?.h ?? u.mob!.h;
  const { def, as } = animOf(u.anims, u.act);
  const ref = u.anims.idle!.frames[0];
  const has = !!art.sheet.img[ref];
  let x = u.x + u.knock;
  let y = u.y;
  let alpha = 1;
  // 내딛기: 동작 진행에 맞춰 앞으로 갔다가 돌아옴
  const dur = def.frames.length / def.fps;
  if (def.lunge && u.busy > 0) x += def.lunge * Math.sin(Math.min(1, u.at / dur) * Math.PI);
  if (u.side === 'mob' && u.dead) {
    alpha = Math.max(0, 1 - u.deadT * 1.8);
    y += u.deadT * 24;
  }
  if (alpha <= 0) return;
  shadow(ctx, x + (u.mob?.boss ? 10 : 0), u.y, u.mob?.boss ? 95 : 26 * (H / 100));
  if (!has) {
    // 도트 시트가 아직 없는 적 → 일러스트 한 장 (숨쉬기)
    const im = u.mob ? art.mobImg[u.mob.id] : null;
    if (!im) return;
    const w = (im.width / im.height) * H;
    const sy = 1 + Math.sin(now * 4 + u.uid) * 0.03;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(1, sy);
    ctx.drawImage(im, -w / 2, -H, w, H);
    if (u.flash > 0.05) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * u.flash * 0.6;
      ctx.drawImage(im, -w / 2, -H, w, H);
    }
    ctx.restore();
    return;
  }
  const k = H / heightOf(art.sheet, ref);
  const fi = frameAt(def, u.at);
  // 잔상: 스킬 중 지난 프레임 2~3장을 색 입혀 뒤에
  if (u.trail > 0 && as !== 'idle') {
    for (let j = 3; j >= 1; j--) {
      const pf = Math.max(0, fi - j);
      ox.setTransform(1, 0, 0, 1, 0, 0);
      ox.clearRect(0, 0, off.width, off.height);
      drawFrame(ox, art.sheet, def.frames[pf], 180, 300, k, face);
      ox.globalCompositeOperation = 'source-atop';
      ox.fillStyle = u.hero?.color ?? '#fff';
      ox.fillRect(0, 0, off.width, off.height);
      ox.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.18 * (4 - j) * alpha;
      ctx.drawImage(off, x - 180 - j * 10 * face, y - 300);
    }
    ctx.globalAlpha = 1;
  }
  ox.setTransform(1, 0, 0, 1, 0, 0);
  ox.clearRect(0, 0, off.width, off.height);
  drawFrame(ox, art.sheet, def.frames[fi], 180, 300, k, face);
  if (u.flash > 0.05) {
    ox.globalCompositeOperation = 'source-atop';
    ox.fillStyle = `rgba(255,255,255,${0.8 * u.flash})`;
    ox.fillRect(0, 0, off.width, off.height);
    ox.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = u.hero && u.dead ? 0.85 : alpha;
  if (u.hero && u.dead && as !== 'down') {
    // 쓰러짐 동작이 없는 영웅(파일럿 3명): 대기 그림을 뒤로 눕힌다
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
  // 보호막 · 기절 · 느림
  if (u.shield > 0) {
    ctx.strokeStyle = 'rgba(170,225,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - H * 0.48, H * 0.36, H * 0.56, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (u.stun > 0) {
    ctx.fillStyle = '#ffe36b';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('★ ★ ★', x + Math.sin(now * 8) * 6, y - H - 8);
  }
  if (u.mob && !u.mob.boss) {
    const w = 46;
    ctx.fillStyle = 'rgba(20,16,30,0.8)';
    ctx.fillRect(x - w / 2 - 1, y - H - 7, w + 2, 6);
    ctx.fillStyle = u.slow > 0 ? '#66c8ff' : '#ff5a5a';
    ctx.fillRect(x - w / 2, y - H - 6, w * (u.hp / u.max), 4);
  }
}

// ───────── 배경 3겹 ─────────
function background(ctx: CanvasRenderingContext2D, art: Art, s: number) {
  if (art.bg) {
    const im = art.bg;
    // 그림 아래 30%(길)가 발밑에 오게 위로 올려 키움 (하늘 위쪽이 조금 잘림)
    const y0 = -160;
    const h = LH - y0;
    const w = (im.width / im.height) * h;
    const o = -((s * 0.25) % w);
    for (let x = o; x < LW; x += w) ctx.drawImage(im, Math.floor(x), y0, Math.ceil(w) + 1, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, LH);
    g.addColorStop(0, '#8fd0ff');
    g.addColorStop(1, '#d9f2ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, LW, LH);
  }
  const gy = GROUND - 30;
  const road = ctx.createLinearGradient(0, gy, 0, LH);
  road.addColorStop(0, 'rgba(190,156,100,0)');
  road.addColorStop(0.15, 'rgba(200,164,108,0.12)');
  road.addColorStop(1, 'rgba(120,90,60,0.35)');
  ctx.fillStyle = road;
  ctx.fillRect(0, gy, LW, LH - gy);
  ctx.fillStyle = 'rgba(110,84,56,0.35)';
  for (let i = 0; i < 26; i++) {
    const x = ((((i * 97 - s) % (LW + 60)) + LW + 60) % (LW + 60)) - 30;
    const y = gy + 24 + ((i * 53) % 80);
    ctx.fillRect(Math.round(x), Math.round(y), 4 + (i % 3) * 2, 2);
  }
  // 앞 겹 풀잎 (땅보다 빠르게)
  for (let i = 0; i < 16; i++) {
    const x = ((((i * 131 - s * 1.5) % (LW + 80)) + LW + 80) % (LW + 80)) - 40;
    const y = LH - 2;
    ctx.fillStyle = i % 5 === 0 ? '#ffd1e6' : i % 2 ? '#4f9e3e' : '#63b34c';
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
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        break;
      }
      case 'burst':
      case 'star': {
        const r = (f.r ?? 40) * (0.4 + u * 0.9);
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, f.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.fill();
        // 빛살
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + u;
          ctx.beginPath();
          ctx.moveTo(f.x + Math.cos(a) * r * 0.4, f.y + Math.sin(a) * r * 0.4);
          ctx.lineTo(f.x + Math.cos(a) * r * 1.3, f.y + Math.sin(a) * r * 1.3);
          ctx.stroke();
        }
        if (f.kind === 'star') {
          ctx.fillStyle = '#fff';
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
        if (f.kind === 'heal')
          for (let i = 0; i < 6; i++) ctx.fillRect(f.x + Math.sin(i * 2.1) * 26, f.y + 30 - u * 70 - i * 7, 3, 3);
        break;
      }
      case 'pillar': {
        // 빛기둥: 땅에서 하늘로
        const w = (f.r ?? 30) * (1 - u * 0.5);
        const g = ctx.createLinearGradient(f.x - w, 0, f.x + w, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.5, f.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(f.x - w, 0, w * 2, f.y);
        ctx.fillStyle = '#fff';
        ctx.fillRect(f.x - 2, 0, 4, f.y);
        break;
      }
      case 'beam': {
        // 빛줄기: 두 점 사이 굵은 광선
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
        ctx.strokeStyle = '#fff';
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
      case 'spark':
        break;
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
  ctx.textAlign = 'center';
  for (const n of b.nums) {
    const pop = n.t < 0.1 ? 0.5 + (n.t / 0.1) * 0.9 : 1.4 - Math.min(0.4, (n.t - 0.1) * 1.4);
    const size = (n.crit ? 34 : n.big ? 26 : 20) * pop;
    const y = n.y - n.t * 36;
    const text = (n.heal ? '+' : '') + short(n.v);
    ctx.globalAlpha = Math.min(1, (1.2 - n.t) * 3);
    ctx.font = `900 ${size}px "Segoe UI", system-ui, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = n.crit ? 7 : 5;
    ctx.strokeStyle = n.heal ? '#0b3d18' : n.crit ? '#4a0e00' : '#22140c';
    ctx.strokeText(text, n.x, y);
    if (n.crit) {
      const g = ctx.createLinearGradient(0, y - size, 0, y);
      g.addColorStop(0, '#fffbd0');
      g.addColorStop(0.5, '#ffcf3a');
      g.addColorStop(1, '#ff6a1a');
      ctx.fillStyle = g;
    } else ctx.fillStyle = n.heal ? '#7dff9b' : '#ffffff';
    ctx.fillText(text, n.x, y);
    if (n.crit) {
      ctx.font = '900 13px system-ui';
      ctx.lineWidth = 4;
      ctx.strokeText('치명타', n.x, y - size + 1);
      ctx.fillStyle = '#ffe36b';
      ctx.fillText('치명타', n.x, y - size + 1);
    }
  }
  ctx.globalAlpha = 1;
}

/** 일러스트 컷인: 기울어진 띠 + 일러스트가 화면을 가로지름 */
function drawCut(ctx: CanvasRenderingContext2D, art: Art, b: Battle) {
  const c = b.cut;
  if (!c) return;
  const u = c.t / COMBAT.cutInSec;
  const ein = Math.min(1, u / 0.2);
  const eout = Math.max(0, (u - 0.78) / 0.22);
  ctx.save();
  ctx.globalAlpha = 1 - eout;
  ctx.fillStyle = 'rgba(8,8,24,0.42)';
  ctx.fillRect(0, 0, LW, LH);
  ctx.translate(LW / 2, LH * 0.44);
  ctx.rotate(-0.1);
  const bw = LW * 1.4;
  const bh = 150;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-bw / 2, -bh / 2, bw * ein, bh);
  ctx.clip();
  const g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
  g.addColorStop(0, '#0d0a20');
  g.addColorStop(0.45, c.skill.color);
  g.addColorStop(1, '#0d0a20');
  ctx.fillStyle = g;
  ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
  // 속도선
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const yy = -bh / 2 + ((i * 37) % bh);
    const xx = ((i * 211 + c.t * 2400) % bw) - bw / 2;
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.lineTo(xx + 120, yy);
    ctx.stroke();
  }
  const im = art.cutin[c.hero.id];
  if (im) {
    const ih = bh * 1.9;
    const iw = (im.width / im.height) * ih;
    const ix = -LW * 0.62 + ein * LW * 0.28 + u * 70;
    ctx.drawImage(im, ix, -ih * 0.42, iw, ih);
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(-bw / 2, -bh / 2 - 3, bw * ein, 3);
  ctx.fillRect(-bw / 2, bh / 2, bw * ein, 3);
  ctx.font = '900 38px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20,10,4,0.95)';
  const tx = LW * 0.42 + (1 - ein) * 160;
  ctx.strokeText(c.skill.name, tx, 22);
  ctx.fillStyle = '#fff';
  ctx.fillText(c.skill.name, tx, 22);
  ctx.font = '800 15px system-ui';
  ctx.lineWidth = 5;
  ctx.strokeText(c.hero.name, tx, -14);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(c.hero.name, tx, -14);
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, art: Art, b: Battle, now: number) {
  ctx.save();
  if (b.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * b.shake * 2), Math.round((Math.random() - 0.5) * b.shake * 2));
  background(ctx, art, b.scroll);
  // 보스 패턴 경고: 영웅 발밑이 붉게 깜빡
  if (b.pat.warn > 0)
    for (const h of b.heroes) {
      if (h.dead) continue;
      ctx.fillStyle = `rgba(255,50,30,${0.22 + 0.3 * Math.abs(Math.sin(now * 12))})`;
      ctx.beginPath();
      ctx.ellipse(h.x, h.y, 38, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  const units = [...b.heroes, ...b.mobs].sort((a, c) => (a.mob?.boss ? -1 : c.mob?.boss ? 1 : a.y - c.y));
  for (const u of units) drawUnit(ctx, art, u, now);
  drawFx(ctx, b);
  drawNums(ctx, b);
  ctx.restore();
  if (b.flash > 0) {
    ctx.fillStyle = `rgba(255,250,230,${b.flash * 0.55})`;
    ctx.fillRect(0, 0, LW, LH);
  }
  drawCut(ctx, art, b);
}
