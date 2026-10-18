// 전투 그리기 (논리 높이 390 · 너비는 창 비율): 시차 배경(장마다 색 바꾸기) · HD 도트 유닛(깊이 순 · 잔상 · 번쩍 · 자리표시자 색 바꾸기+이름표)
//  · 이펙트(빛줄기·기둥·파티클·흔들림·번쩍임) · 피해 숫자(만·억 · 겹침 없음은 sim.placeNum) · 일러스트 컷인 · 인연 말풍선
//  색·글꼴은 전부 theme/tokens 에서
import { CONFIG } from '../config';
import groundJson from '../../public/art/bgs/_ground.json';
import { animOf, drawFrame, frameAt, heightOf, lenOf, type Sheet } from '../sprite/sheet';
import { canvasFace, canvasFont, elemColor, iconText, T } from '../theme/tokens';
import { has, shortNum, type Battle, type Fx, type Unit } from './sim';
import { view } from '../ui/view';
import { getPref } from '../core/save';
import { drawFxImg, type FxArt } from './fxart';

export const GROUND = CONFIG.view.ground;
const B = T.battle;
const F = T.font.canvas;

export interface Art {
  sheet: Sheet;
  bg: HTMLImageElement | null;
  /** 컷인 일러스트 (영웅 id → 그림) · 없으면 초상화 확대 */
  cutin: Record<string, HTMLImageElement | HTMLCanvasElement>;
  /** 콘텐츠 전투 배경 (탑·레이드·결투장·던전·요일 · docs/ART_DONE_1017_3.md §5) */
  bgs?: Record<string, HTMLImageElement>;
  /** 치명타 폭발 별 (public/art/ui/battle/crit_burst.png) */
  critBurst?: HTMLImageElement | null;
  /** 스킬 이펙트 그림 14종 (public/art/fx · 뒤에서 받음 · ANIM_1017 ②) */
  fx?: FxArt | null;
}
/** 이 전투 배경 그림 · 전용 배경이면 지역 색 안 씀 */
const bgOf = (art: Art, key?: string) => (key && art.bgs?.[key] ? { im: art.bgs[key], own: true } : { im: art.bg, own: false });
/** 배경 그림의 땅 띠(public/art/bgs/_ground.json · 그림 높이 비율)를 화면 발 띠(CONFIG.ui.groundScreen)에 맞춘 그림 높이·위 y (FINAL §3-4)
 *  화면을 다 덮도록 (위 y ≤ 0 · 아래 ≥ 화면 높이) */
const GR = groundJson as unknown as Record<string, [number, number]>;
/** 화면이 기본(CONFIG.view.h)보다 높을 때(폴드 등) 전장을 그만큼 아래로 → 영웅 발밑과 스킬 칸 사이가 늘 같은 간격 (고느끼 10/18 「캐릭터들이 밑으로 좀」) */
export const fieldDy = () => Math.max(0, view.h - CONFIG.view.h);
/** 배경 땅 띠는 그 절반만 내림 → 캐릭터가 숲 끝선이 아니라 땅 안쪽에 섬 (웅스 10/18 토벌 「아직 위에 있어요」 · 형철 「뒷 배경을 위로 조금」) */
const bgDy = () => Math.round(fieldDy() * CONFIG.ui.bgDyRate);
export function bgFit(key?: string) {
  const [t, bt] = (key && GR[key]) || GR._default;
  const sy0 = CONFIG.ui.groundScreen[0] + bgDy();
  const sy1 = CONFIG.ui.groundScreen[1] + bgDy();
  let h = (sy1 - sy0) / (bt - t);
  let y0 = sy0 - t * h;
  if (y0 > 0) ((h = sy0 / t), (y0 = 0));
  if (y0 + h < view.h) h = view.h - y0;
  return { h, y0 };
}

// 보조 캔버스는 화면 해상도(view.dpr)로 — 1배로 그린 뒤 늘리면 도트가 뭉개지고 2~3px씩 툭툭 끊김 (SPRITE_RES_1017 §A)
//  그 안은 논리 px로 그리고(setTransform dpr) 본 캔버스엔 논리 크기를 지정해 붙인다
//  크기: 스킬 칸은 이펙트 때문에 넓어서 360이면 잘림 → 520 넘게 (ANIM_1017 ①) · 발은 (AX, AY)
const OW = 560;
const OH = 560;
const AX = OW / 2;
const AY = 440;
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
  const dur = lenOf(def);
  if (def.lunge && u.busy > 0) x += def.lunge * lungeCurve(Math.min(1, u.at / dur));
  // 걷기: 대기 2칸을 번갈아 + 살짝 들썩임
  // 걷기 그림이 2칸뿐인 것(몹 등)만 살짝 들썩임 · 영웅은 4칸 걷기 그림 (ANIM_1017)
  if (as === 'walk' && def.frames.length <= 2) y -= CONFIG.combat.walkBob * Math.abs(Math.sin(u.at * def.fps * Math.PI));
  // 몹이 쓰러짐: 지역 몹 = 피격 칸으로 0.4초 동안 가라앉으며 사라짐 · 장 보스 = 비틀거림 칸으로 흔들리며 사라짐 (ANIM_1017 ③)
  if (u.side === 'mob' && u.dead) {
    const MD = CONFIG.combat.mobDie;
    const sec = u.mob?.boss ? MD.bossSec : MD.sec;
    alpha = Math.max(0, 1 - u.deadT / sec);
    y += Math.min(1, u.deadT / sec) * MD.sink;
    if (u.mob?.boss) x += Math.sin(u.deadT * 50) * MD.shake;
  }
  if (alpha <= 0) return;
  // 쓰러진 영웅: 누운 몸 길이만큼 그림자를 옆으로 넓게 (발밑 작은 그림자만 떠 보이던 것 · 10/18)
  shadow(ctx, x + (u.mob?.boss ? 10 : 0), u.y, u.mob?.boss ? 95 : 26 * (H / 100) * (u.hero && u.dead ? 1.8 : 1));
  const k = H / heightOf(art.sheet, ref);
  const fi = frameAt(def, u.at);
  // 그릴 칸: 장 보스 경고 중이면 준비 칸 + 살짝 떨림 · 지역 몹은 맞는 순간 피격 칸
  let cell = def.frames[fi];
  if (u.prep && !u.dead) {
    cell = `${ref.split(':')[0]}:${u.prep}`;
    x += Math.sin(now * 45) * CONFIG.combat.mobDie.shake * 0.5;
  } else if (u.mob && !u.mob.boss && !u.dead && as === 'idle' && u.flash > CONFIG.combat.mobDie.hurtFlash && u.anims.hurt) cell = u.anims.hurt.frames[0];
  const filter = filterOf(u);
  // 잔상: 스킬 중 지난 프레임 2~3장을 색 입혀 뒤에
  if (u.trail > 0 && as !== 'idle') {
    for (let j = 3; j >= 1; j--) {
      const pf = Math.max(0, fi - j);
      auxReady(off, ox, OW, OH);
      drawFrame(ox, art.sheet, def.frames[pf], AX, AY, k, face);
      ox.globalCompositeOperation = 'source-atop';
      ox.fillStyle = sp ? elemColor(sp.def.elem) : B.white;
      ox.fillRect(0, 0, OW, OH);
      ox.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.18 * (4 - j) * alpha;
      ctx.drawImage(off, x - AX - j * 10 * face, y - AY, OW, OH);
    }
    ctx.globalAlpha = 1;
  }
  auxReady(off, ox, OW, OH);
  // 피격: 흰색 덮기 대신 살짝 밝게 (최대 hitFlash.max · 0.08초 안에 꺼짐) — 유령처럼 하얗게 바래 보이던 것 (§D)
  const HF = CONFIG.combat.hitFlash;
  const fl = Math.min(HF.max, u.flash);
  ox.filter = fl > 0.02 ? `${filter === 'none' ? '' : filter} brightness(${1 + HF.bright * fl})`.trim() : filter;
  drawFrame(ox, art.sheet, cell, AX, AY, k, face);
  ox.filter = 'none';
  ctx.globalAlpha = u.hero && u.dead ? 0.85 : alpha;
  if (u.hero && u.dead && as !== 'down') {
    // 쓰러짐 동작이 없는 영웅: 대기 그림을 뒤로 눕힌다
    const r = Math.min(1, u.deadT / 0.35);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((-Math.PI / 2) * r);
    ctx.filter = 'brightness(0.7)';
    ctx.drawImage(off, -AX, -AY + r * 12, OW, OH);
    ctx.restore();
  } else {
    // 대기 숨쉬기: 발 기준 세로 1.000↔1.012 (1.6초 · 유닛마다 위상 다름)
    const BR = CONFIG.combat.breathe;
    const sy = as === 'idle' && !u.dead && def.frames.length <= 2 ? 1 + (BR.amp / 2) * (1 + Math.sin(((now + u.uid * 0.37) / BR.sec) * Math.PI * 2)) : 1;
    ctx.drawImage(off, x - AX, y - AY * sy, OW, OH * sy);
  }
  ctx.globalAlpha = 1;
  if (u.dead) return;
  // 발밑·머리 위 맨글씨 이름표는 그리지 않음 (FINAL §3-2 · 결투장 「그롬」 등)
  // 보호막 · 기절 · 침묵 · 화상
  // 보호막이 남아 있는 동안: 그림 1↔2를 shieldLoopSec마다 · 알파 0.7로 몸에 겹침 (그림이 없으면 예전 타원)
  const FA = CONFIG.combat.fxArt;
  if (u.shield > 0 && !drawFxImg(ctx, art.fx, 'shield', 1 + (Math.floor(now / FA.shieldLoopSec) % 2), x, y + 4, Math.max(FA.minBottom, H * FA.bottomK), B.fxShield, FA.shieldAlpha)) {
    ctx.strokeStyle = B.shield;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - H * 0.48, H * 0.36, H * 0.56, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // 기절: 머리 위에서 stun 그림 반복
  if (has(u, 'stun')) drawFxImg(ctx, art.fx, 'stun', Math.floor(now / FA.frameSec) % 4, x, y - H - FA.stunH * 0.3, FA.stunH, B.stun);
  if (!u.mob?.boss) headHp(ctx, u, x, y, H);
}
/** 설정 「머리 위 체력 바 늘 보기」 (전투 화면이 들어올 때 다시 읽음) */
export const headHpPref = { always: getPref('hpAlways', false) };
/** 상태 아이콘 순서 (디버프 먼저) */
const ST_ICONS = ['stun', 'silence', 'burn', 'slow', 'atkDown', 'taunt', 'guard', 'atkUp', 'spdUp', 'critUp', 'regen'] as const;
/** 머리 위 작은 체력 바 (아군 초록 · 적 빨강 · 맞은 뒤 잠깐) + 그 위 상태 아이콘 한 줄 (MOBILE_REF §3-A-1) */
function headHp(ctx: CanvasRenderingContext2D, u: Unit, x: number, y: number, H: number) {
  const HH = CONFIG.combat.headHp;
  const w = Math.max(HH.minW, Math.round(H * HH.wOfH));
  const top = y - H - (u.mob ? 10 : 6);
  const show = headHpPref.always || u.hurtT < HH.showSec;
  if (show) {
    ctx.globalAlpha = headHpPref.always ? 1 : Math.min(1, (HH.showSec - u.hurtT) * 3);
    ctx.fillStyle = B.hpBar;
    ctx.fillRect(x - w / 2 - 1, top - 1, w + 2, 6);
    ctx.fillStyle = u.side === 'hero' ? B.hpAlly : has(u, 'slow') ? B.slowBar : B.hpMob;
    ctx.fillRect(x - w / 2, top, w * (u.hp / u.max), 4);
    if (u.shield > 0) {
      ctx.fillStyle = B.numShield;
      ctx.fillRect(x - w / 2, top, Math.min(w, w * (u.shield / u.max)), 1.5);
    }
    ctx.globalAlpha = 1;
  }
  const marks = ST_ICONS.filter((k) => has(u, k)).slice(0, HH.icons);
  if (!marks.length) return;
  // 상태 그림 (UI v2): 글자 기호 대신 art/buffs 그림 · 둥근 받침(좋은 것 초록 · 나쁜 것 빨강) · 살짝 떠오름
  const S = HH.markPx;
  const bob = Math.sin(performance.now() / 260) * 1.5;
  marks.forEach((k, i) => {
    const cx = x + (i - (marks.length - 1) / 2) * (S + 3);
    const cy = top - S / 2 - 4 + bob;
    ctx.beginPath();
    ctx.arc(cx, cy, S / 2 + 1.5, 0, Math.PI * 2);
    ctx.fillStyle = MARK_BAD.has(k) ? B.markBad : B.markGood;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = B.markEdge;
    ctx.stroke();
    const im = stImg(k);
    if (im.complete && im.naturalWidth) ctx.drawImage(im, cx - S / 2 + 1, cy - S / 2 + 1, S - 2, S - 2);
  });
}
const MARK_ART: Record<(typeof ST_ICONS)[number], string> = { stun: 'stun', silence: 'silence', burn: 'burn', slow: 'freeze', atkDown: 'mark', taunt: 'taunt', guard: 'defUp', atkUp: 'atkUp', spdUp: 'speedUp', critUp: 'mark', regen: 'regen' };
const MARK_BAD = new Set<string>(['stun', 'silence', 'burn', 'slow', 'atkDown']);
const stIms: Record<string, HTMLImageElement> = {};
const stImg = (k: (typeof ST_ICONS)[number]) => (stIms[k] ??= Object.assign(new Image(), { src: `${import.meta.env.BASE_URL}art/ui2/buffs/${MARK_ART[k]}.png` }));

// ───────── 배경 (그림 1장을 장마다 색 바꾸기) ─────────
function background(ctx: CanvasRenderingContext2D, art: Art, s: number, W: number, region: number, key?: string) {
  const { im, own } = bgOf(art, key);
  if (im) {
    const { h, y0 } = bgFit(own ? key : undefined);
    const w = (im.width / im.height) * h;
    const o = -((s * 0.25) % w);
    ctx.filter = own ? 'none' : (B.region[region] ?? 'none');
    for (let x = o; x < W; x += w) ctx.drawImage(im, Math.floor(x), y0, Math.ceil(w) + 1, h);
    ctx.filter = 'none';
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, view.h);
    g.addColorStop(0, B.sky[0]);
    g.addColorStop(1, B.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, view.h);
  }
  // 전용 배경 그림은 그 그림의 땅 그대로 (덧칠 길·자갈·풀 막대 없음 · FINAL §3-1 「초록 세로 막대」)
  if (own) return;
  const gy = GROUND - 30 + bgDy();
  const road = ctx.createLinearGradient(0, gy, 0, view.h);
  road.addColorStop(0, B.road0);
  road.addColorStop(0.15, B.road1);
  road.addColorStop(1, B.road2);
  ctx.fillStyle = road;
  ctx.fillRect(0, gy, W, view.h - gy);
  ctx.fillStyle = B.pebble;
  for (let i = 0; i < 30; i++) {
    const x = ((((i * 97 - s) % (W + 60)) + W + 60) % (W + 60)) - 30;
    const y = gy + 24 + ((i * 53) % 80);
    ctx.fillRect(Math.round(x), Math.round(y), 4 + (i % 3) * 2, 2);
  }
  for (let i = 0; i < 18; i++) {
    const x = ((((i * 131 - s * 1.5) % (W + 80)) + W + 80) % (W + 80)) - 40;
    const y = view.h - 2;
    ctx.fillStyle = i % 5 === 0 ? B.grass[2] : i % 2 ? B.grass[0] : B.grass[1];
    for (let j = 0; j < 5; j++) ctx.fillRect(Math.round(x + j * 4), y - 8 - ((j * 7 + i) % 9), 3, 12);
  }
}

// ───────── 이펙트 ─────────
/** 그림 이펙트 한 개 (칸 진행 · bolt는 날아감 · meteor는 위 오른쪽에서 떨어짐) — 그림이 없으면 false */
function imgFx(ctx: CanvasRenderingContext2D, art: Art, f: Fx): boolean {
  const FA = CONFIG.combat.fxArt;
  const h = f.h ?? 100;
  if (f.img === 'bolt' && f.x2 !== undefined && f.y2 !== undefined) {
    // 0~2를 돌며 날아가고 도착하면 3
    if (f.t < FA.boltTravel) {
      const p = f.t / FA.boltTravel;
      return drawFxImg(ctx, art.fx, 'bolt', Math.floor(f.t / FA.frameSec) % 3, f.x + (f.x2 - f.x) * p, f.y + (f.y2 - f.y) * p, h, f.color);
    }
    return drawFxImg(ctx, art.fx, 'bolt', 3, f.x2, f.y2, h * 1.3, f.color, Math.max(0, 1 - (f.t - FA.boltTravel) / (FA.frameSec * 2)));
  }
  const seq = f.seq ?? [0, 1, 2, 3];
  const i = Math.floor(f.t / FA.frameSec);
  const len = seq.length * FA.frameSec;
  // 마지막 칸은 남은 시간 동안 흐려지며 사라짐
  const alpha = f.t <= len ? 1 : Math.max(0, 1 - (f.t - len) / Math.max(0.05, f.dur - len));
  let { x, y } = f;
  if (f.img === 'meteor' && i < 2) {
    const p = 1 - f.t / (FA.frameSec * 2);
    x += FA.meteorDrop[0] * p;
    y += FA.meteorDrop[1] * p;
  }
  return drawFxImg(ctx, art.fx, f.img!, seq[Math.min(seq.length - 1, i)], x, y, h, f.color, alpha);
}
function drawFx(ctx: CanvasRenderingContext2D, b: Battle, art: Art) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // 그림 이펙트는 최신 maxOn개만 (많이 겹치면 lighter로 화면이 하얗게 탐)
  const imgs = b.fx.filter((f) => f.img);
  const skip = new Set(imgs.slice(0, Math.max(0, imgs.length - (b.raid ? CONFIG.combat.fxArt.maxOnRaid : CONFIG.combat.fxArt.maxOn))));
  for (const f of b.fx) {
    if (skip.has(f)) continue;
    if (f.img && art.fx && imgFx(ctx, art, f)) continue;
    const u = f.t / f.dur;
    ctx.globalAlpha = Math.max(0, 1 - u);
    ctx.strokeStyle = f.color;
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 14;
    switch (f.kind) {
      case 'dome': {
        // 궁극기 범위: 바닥에서 솟는 반투명 반구 (속성색) · 처음 0.15초 차오르고 사라짐
        const grow = Math.min(1, u / 0.25);
        const r = (f.r ?? 120) * (0.6 + 0.4 * grow);
        ctx.globalAlpha = CONFIG.combat.ultDome.alpha * (1 - u * 0.8);
        const g = ctx.createRadialGradient(f.x, f.y, r * 0.2, f.x, f.y, r);
        g.addColorStop(0, B.clear);
        g.addColorStop(0.75, f.color);
        g.addColorStop(1, B.white);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, r, r * 0.8, 0, Math.PI, 0);
        ctx.ellipse(f.x, f.y, r, r * 0.25, 0, 0, Math.PI);
        ctx.fill();
        ctx.globalAlpha = Math.max(0, 1 - u) * 0.8;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }
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
    // 크기 위계 (MOBILE_REF §3-A-2): 일반 작게 · 치명타 = 일반 × 1.6 주황 · 회복 초록 +n · 보호막 하늘색
    const normal = F.num * N.normalScale;
    const base = crit ? normal * N.critMul : n.big ? F.numBig * N.normalScale : n.kind === 'hurt' || n.kind === 'burn' || n.kind === 'shield' ? normal * 0.85 : normal;
    const size = base * pop;
    const y = n.y - n.t * N.rise;
    const text = (n.kind === 'heal' ? '+' : '') + shortNum(n.v);
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
    ctx.strokeStyle = n.kind === 'heal' ? B.numHealStroke : n.kind === 'shield' ? B.numShieldStroke : crit ? B.numCritStroke : B.numStroke;
    ctx.strokeText(text, n.x, y);
    if (crit) {
      const g = ctx.createLinearGradient(0, y - size * 0.8, 0, y);
      g.addColorStop(0, B.numCrit[0]);
      g.addColorStop(0.5, B.numCrit[1]);
      g.addColorStop(1, B.numCrit[2]);
      ctx.fillStyle = g;
    } else ctx.fillStyle = n.kind === 'heal' ? B.numHeal : n.kind === 'shield' ? B.numShield : n.kind === 'hurt' ? B.numMob : n.kind === 'burn' ? B.burn : B.numText;
    ctx.fillText(text, n.x, y);
  }
  ctx.globalAlpha = 1;
}
/** 결투장 감정 표현: 머리 위 흰 말풍선 + 아이콘 (톡 튀어나옴) */
function drawEmotes(ctx: CanvasRenderingContext2D, b: Battle) {
  for (const e of b.emotes) {
    const u = [...b.heroes, ...b.mobs].find((x) => x.uid === e.uid);
    if (!u || u.dead) continue;
    const k = e.t < 0.15 ? 0.5 + (e.t / 0.15) * 0.6 : e.t < 0.3 ? 1.1 - ((e.t - 0.15) / 0.15) * 0.1 : 1;
    const x = u.x;
    const y = u.y - u.h - 34;
    ctx.globalAlpha = Math.min(1, (CONFIG.ui.arenaShow.emoteSec - e.t) * 4);
    ctx.fillStyle = B.white;
    ctx.beginPath();
    ctx.arc(x, y, 17 * k, 0, Math.PI * 2);
    ctx.moveTo(x - 5, y + 14 * k);
    ctx.lineTo(x, y + 23 * k);
    ctx.lineTo(x + 5, y + 14 * k);
    ctx.fill();
    ctx.font = canvasFace(Math.round(20 * k));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iconText(e.key), x, y + 1);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.globalAlpha = 1;
}
/** 마지막 일격 흰 번쩍 (MOBILE_REF §3-A-7) */
function drawWhite(ctx: CanvasRenderingContext2D, b: Battle, W: number) {
  if (b.white <= 0) return;
  ctx.globalAlpha = Math.min(1, b.white / CONFIG.combat.lastHit.flash) * 0.85;
  ctx.fillStyle = B.white;
  ctx.fillRect(0, 0, W, view.h);
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
  ctx.fillRect(0, 0, W, view.h);
  ctx.translate(W / 2, view.h * 0.44);
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
  const im = art.cutin[c.u.hero!.art.cutin];
  // 컷인 그림은 고화질 일러스트 → 부드럽게 줄임 (도트 전투와 다름)
  ctx.imageSmoothingEnabled = true;
  if (im) {
    // 그림은 띠 오른쪽 끝에 붙여 얼굴(그림 오른쪽)이 화면 안에 · 글씨는 왼쪽 빈 띠에 (얼굴을 가리던 것 · 고느끼 10/18)
    const ih = bh * 1.9;
    const iw = (im.width / im.height) * ih;
    const ix = W / 2 - iw + (1 - ein) * W * 0.3 - u * 30;
    ctx.drawImage(im, ix, -ih * 0.42, iw, ih);
  }
  ctx.restore();
  ctx.fillStyle = B.cutBar;
  ctx.fillRect(-bw / 2, -bh / 2 - 3, bw * ein, 3);
  ctx.fillRect(-bw / 2, bh / 2, bw * ein, 3);
  // 스킬 이름: 화면 왼쪽 띠에 (그림 얼굴을 가리지 않게 · 길면 글씨를 줄임 · POLISH_1017 ③-3)
  const room = W * CONFIG.combat.cutText.maxW;
  ctx.font = canvasFace(F.cutName);
  const tw = ctx.measureText(c.skill.name).width;
  if (tw > room) ctx.font = canvasFace(Math.floor((F.cutName * room) / tw));
  ctx.textAlign = 'left';
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = B.cutStroke;
  const tx = -W / 2 + CONFIG.combat.cutText.left - (1 - ein) * 60;
  ctx.strokeText(c.skill.name, tx, 22);
  ctx.fillStyle = B.white;
  ctx.fillText(c.skill.name, tx, 22);
  ctx.font = canvasFace(F.cutHero + 3);
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
  ctx.translate(0, fieldDy());
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
  drawFx(ctx, b, art);
  // 전투 중 혼잣말 말풍선은 끔 — 대사는 스킬 컷인에만 (PLAYTEST §2)
  drawNums(ctx, b, art);
  drawEmotes(ctx, b);
  ctx.restore();
  if (b.flash > 0) {
    ctx.fillStyle = `${B.flash}${b.flash * 0.55})`;
    ctx.fillRect(0, 0, W, view.h);
  }
  drawWhite(ctx, b, W);
  drawCut(ctx, art, b, W);
}

// ───────── 보스 전장 (레이드 · 월드 보스 · 길드 레이드) ─────────
const RA = CONFIG.raidArena;
const BW = 760;
const BH = 640;
/** 전투 표시 그림 (조준 · 부위 파괴) */
const markImg = (n: string) => Object.assign(new Image(), { src: `${import.meta.env.BASE_URL}art/ui2/icons/${n}.png` });
const MARK = { tgt: markImg('target'), brk: markImg('crit') };
const bossCv = document.createElement('canvas');
const bx = bossCv.getContext('2d')!;
/** 다층 배경 (멀수록 느리게 · 페이즈마다 색) */
function raidBackground(ctx: CanvasRenderingContext2D, art: Art, b: Battle, W: number) {
  const r = b.raid!;
  const { im, own } = bgOf(art, b.setup.bg);
  const tint = `${own ? 'none' : (B.region[b.setup.region] ?? 'none')} ${B.phaseTint[Math.min(r.phase, B.phaseTint.length - 1)]}`.replace(/none ?/g, '').trim() || 'none';
  if (im) {
    // 한 장만 고정으로 (같은 그림을 여러 겹 반투명으로 겹쳐 흐르게 하던 것 → 겹쳐 보인다는 피드백 · 10/18)
    const fit = bgFit(own ? b.setup.bg : undefined);
    const w = (im.width / im.height) * fit.h;
    ctx.filter = `${tint === 'none' ? '' : tint} brightness(0.85)`.trim();
    for (let x = Math.min(0, (W - w) / 2); x < W; x += w) ctx.drawImage(im, Math.floor(x), fit.y0, Math.ceil(w) + 1, fit.h);
    ctx.filter = 'none';
  } else background(ctx, art, b.t * 10, W, b.setup.region, b.setup.bg);
  // 두 줄 바닥 + 경고 줄
  const half = Math.abs(RA.lanes[1] - RA.lanes[0]) / 2;
  RA.lanes.forEach((ly, i) => {
    const y = ly + fieldDy();
    // 결과 화면에서는 경고 줄·글씨 없음 (FINAL §3-6)
    const warn = r.warnLane === i && b.phase !== 'win' && b.phase !== 'lose';
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
  const box = (p: { box: number[] }) => {
    const [px, up, w, h] = p.box;
    return [cx + px * H * 0.9, fy - up * H, w * H * 0.9, h * H] as const;
  };
  const dir = ref.split(':')[0].split('/')[0];
  const big = dir === 'raidboss' || dir === 'worldboss' || dir === 'graidboss';
  let bxShake = 0;
  if (big) {
    // 레이드·월드 보스 동작 (ANIM_1017 ④): 상태마다 칸을 고름
    const a = (rr: number, c: number) => `${dir}/anim1:r${rr}c${c}`;
    const z = (rr: number, c: number) => `${dir}/anim2:r${rr}c${c}`;
    const BA = CONFIG.raidArena.anim;
    const rage = u.hp / u.max < RA.phases[RA.phases.length - 1];
    const broke = r.parts.some((p) => p.broken);
    const loop2 = (c0: string, c1: string) => (Math.floor(now * BA.idleFps) % 2 ? c1 : c0);
    let cell: string;
    if (u.dead) cell = def.frames[fi];
    else if (r.downT > 0) cell = a(1, 3);
    else if (r.parts.some((p) => p.broken && (p.brokenT ?? 9) < BA.flinchSec)) cell = z(0, 0);
    else if (r.warnLane != null && r.warnT > 0) {
      // 경고: 준비 칸 + 떨림 · 줄 광선 = 기 모으기 · 두 줄 폭발 = 포효 · 나머지 = 팔 들기
      cell = r.warnKey === 'beam' ? a(1, 0) : r.warnKey === 'nova' ? a(1, 2) : a(0, 2);
      bxShake = Math.sin(now * 45) * 2;
    } else if (u.act === 'attack' && u.busy > 0) cell = rage ? z(1, 0) : r.warnKey === 'beam' ? a(1, 1) : a(0, 3);
    else cell = rage ? z(0, 3) : broke ? loop2(z(0, 1), z(0, 2)) : loop2(a(0, 0), a(0, 1));
    bx.filter = 'none';
    drawFrame(bx, art.sheet, art.sheet.img[cell] ? cell : def.frames[fi], cx + bxShake, fy, k, 1);
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
        const an = (i / 10) * Math.PI * 2;
        const rr = 0.32 + ((i * 37) % 7) / 30;
        bx.lineTo(x + w / 2 + Math.cos(an) * w * rr, y + h / 2 + Math.sin(an) * h * rr);
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
  // 그로기: 그림이 따로 없는 보스만 어둡게 + 기울임 (레이드·월드 보스는 그로기 칸)
  if (r.downT > 0 && !big) {
    bx.globalCompositeOperation = 'source-atop';
    bx.fillStyle = B.downVeil;
    bx.fillRect(0, 0, BW, BH);
    bx.globalCompositeOperation = 'source-over';
  }
  shadow(ctx, u.x, u.y, 170);
  const tilt = r.downT > 0 && !big ? 0.08 : 0;
  ctx.save();
  ctx.translate(u.x + u.knock, u.y);
  ctx.rotate(tilt);
  // 쓰러짐: 큰 보스는 쓰러짐→무너짐→잔해(1.2초)를 다 보여 준 뒤 사라짐
  const fadeAt = big ? CONFIG.raidArena.anim.dieSec : 0;
  ctx.globalAlpha = u.dead ? Math.max(0, 1 - Math.max(0, u.deadT - fadeAt) / CONFIG.raidArena.anim.fadeSec) : 1;
  ctx.drawImage(bossCv, -cx, -fy, BW, BH);
  ctx.restore();
  // 집중 공격 부위 테두리
  const fp = r.focus >= 0 ? r.parts[r.focus] : r.parts.find((p) => !p.broken);
  // 약점 표시: 점선 상자 대신 보스 몸 위 은은한 빨간 표적 링 (PLAYTEST §3) · 부서진 부위는 깨진 링이 잠깐
  for (const p of r.parts) {
    const [x, y, w, h] = box(p);
    const px = u.x - cx + x + w / 2;
    const py = u.y - fy + y + h / 2;
    const rr = Math.min(w, h) * 0.32;
    // 조준 그림 (ui/battle/target · 부서지면 part_break 잠깐) — CSS·선 그리기 대신 (FINAL §3-5)
    if (p.broken) {
      const t = p.brokenT ?? 0;
      if (t > 0.6 || !MARK.brk.complete) continue;
      ctx.globalAlpha = 1 - t / 0.6;
      const s2 = rr * 2.6 * (1 + t * 0.4);
      ctx.drawImage(MARK.brk, px - s2 / 2, py - s2 / 2, s2, s2);
      ctx.globalAlpha = 1;
      continue;
    }
    if (u.dead || !MARK.tgt.complete) continue;
    const on = p === fp;
    const pulse = 0.5 + 0.5 * Math.sin(now * 4);
    ctx.globalAlpha = on ? 0.7 + 0.3 * pulse : 0.35;
    const s2 = rr * 2.4 * (on ? 1 + 0.06 * pulse : 0.9);
    ctx.drawImage(MARK.tgt, px - s2 / 2, py - s2 / 2, s2, s2);
    ctx.globalAlpha = 1;
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
  ctx.fillRect(0, 0, W, view.h);
  const side = (unit: Unit, left: boolean, color: string) => {
    ctx.save();
    ctx.translate(left ? W * 0.27 : W * 0.73, view.h * 0.45);
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
    const im = art.cutin[unit.hero!.art.cutin];
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
  ctx.font = canvasFace(F.cutName);
  ctx.textAlign = 'center';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = B.cutStroke;
  ctx.strokeText(d.name, W / 2, view.h * 0.82);
  ctx.fillStyle = B.white;
  ctx.fillText(d.name, W / 2, view.h * 0.82);
  ctx.font = canvasFont(F.cutHero, 'bold', false);
  ctx.lineWidth = 5;
  ctx.strokeText(`「${d.line}」`, W / 2, view.h * 0.82 + 24);
  ctx.fillStyle = B.cutName;
  ctx.fillText(`「${d.line}」`, W / 2, view.h * 0.82 + 24);
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
  ctx.translate(0, fieldDy());
  const boss = b.mobs.find((m) => m.mob?.boss);
  if (boss) drawRaidBoss(ctx, art, boss, b, now);
  const units = [...b.heroes, ...b.mobs.filter((m) => !m.mob?.boss)].sort((a, c) => a.y - c.y);
  for (const u of units) drawUnit(ctx, art, u, now);
  drawFx(ctx, b, art);
  // 전투 중 혼잣말 말풍선은 끔 — 대사는 스킬 컷인에만 (PLAYTEST §2)
  drawNums(ctx, b, art);
  ctx.restore();
  if (b.flash > 0) {
    ctx.fillStyle = `${B.flash}${b.flash * 0.55})`;
    ctx.fillRect(0, 0, W, view.h);
  }
  drawWhite(ctx, b, W);
  drawNote(ctx, b, W);
  drawCut(ctx, art, b, W);
  drawDuo(ctx, art, b, W);
}
