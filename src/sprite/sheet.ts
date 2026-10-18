// HD 도트 프레임 시트: GPT 시트(마젠타 · 같은 칸 격자)를 tools/cut-sheet.mjs --grid 로 자른 칸 그림 + _parts.json
//  칸 이름 = r{줄}c{칸} · 줄마다 발 기준선(그 줄 그림들의 아래 끝 중 가장 아래)을 맞춰 그린다 → 프레임마다 키가 달라도 땅에 붙음
//  동작 정의(ANIM)는 영웅마다: 없는 동작은 대신할 동작으로 (나머지 3명은 대기·평타만 있는 파일럿)

export type Act = 'idle' | 'walk' | 'attack' | 'skill1' | 'skill2' | 'skill3' | 'hurt' | 'down' | 'win';
export const ACTS: Act[] = ['idle', 'walk', 'attack', 'skill1', 'skill2', 'skill3', 'hurt', 'down', 'win'];

export interface Cell { x: number; y: number; w: number; h: number; cw: number; ch: number; /** 몸 기준 x (칸 기준 · tools/cut-cells.mjs가 프레임끼리 맞춘 값) */ ax?: number; /** 발 기준선 (칸 안 y · 이펙트가 발밑으로 튀어나와도 안 뜨게 · ANIM_1017) */ by?: number }
export interface Sheet {
  /** 시트 묶음 이름 → 칸 이름 → 그림 */
  img: Record<string, HTMLImageElement>;
  cell: Record<string, Cell>;
  /** 줄 기준선 (칸 위에서 발까지) */
  base: Record<string, number>;
}
export interface AnimDef {
  /** "시트:칸" 목록 */
  frames: string[];
  fps: number;
  loop: boolean;
  /** 이 프레임에 맞힌다 (0부터) */
  hit?: number[];
  /** 앞으로 내딛는 거리(논리 px) — 프레임 진행에 맞춰 */
  lunge?: number;
  /** 칸마다 보이는 초 (있으면 fps 대신 · ANIM_1017 권장 타이밍) */
  durs?: number[];
}
export type AnimSet = Partial<Record<Act, AnimDef>>;
/** 없는 동작 대신 */
const FALLBACK: Record<Act, Act[]> = {
  idle: [],
  walk: ['idle'],
  attack: ['idle'],
  skill1: ['attack', 'idle'],
  skill2: ['skill1', 'attack', 'idle'],
  skill3: ['skill1', 'attack', 'idle'],
  hurt: ['idle'],
  down: ['hurt', 'idle'],
  win: ['idle'],
};
export function animOf(set: AnimSet, a: Act): { def: AnimDef; as: Act } {
  if (set[a]) return { def: set[a]!, as: a };
  for (const f of FALLBACK[a]) if (set[f]) return { def: set[f]!, as: f };
  return { def: set.idle!, as: 'idle' };
}
/** 칸 하나 길이(초) */
const durAt = (def: AnimDef, i: number) => def.durs?.[i] ?? 1 / def.fps;
/** 한 바퀴 길이(초) */
export const lenOf = (def: AnimDef) => (def.durs ? def.durs.reduce((a, d) => a + d, 0) : def.frames.length / def.fps);
export const durOf = (set: AnimSet, a: Act) => lenOf(animOf(set, a).def);
/** 맞히는 때 (hit 칸이 시작하는 순간 · 칸 시간이 없으면 칸 가운데) */
export const hitTimes = (set: AnimSet, a: Act) => {
  const { def } = animOf(set, a);
  return (def.hit ?? [Math.floor(def.frames.length / 2)]).map((i) => {
    let t = 0;
    for (let j = 0; j < i; j++) t += durAt(def, j);
    return def.durs ? t + 0.01 : t + 0.5 / def.fps;
  });
};
export function frameAt(def: AnimDef, t: number): number {
  if (def.durs) {
    const len = lenOf(def);
    let u = def.loop ? ((t % len) + len) % len : t;
    for (let i = 0; i < def.frames.length; i++) {
      if (u < def.durs[i]) return i;
      u -= def.durs[i];
    }
    return def.loop ? 0 : def.frames.length - 1;
  }
  const i = Math.floor(t * def.fps);
  return def.loop ? i % def.frames.length : Math.min(def.frames.length - 1, i);
}

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => no(new Error(src));
    i.src = src;
  });

/** 시트 칸 정보만 (_parts.json · 작아서 먼저 다 받아 둠) */
const partsCache: Record<string, Promise<Record<string, Cell> | null>> = {};
export function loadParts(dir: string) {
  return (partsCache[dir] ??= fetch(`${import.meta.env.BASE_URL}art/${dir}/_parts.json`)
    .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? (r.json() as Promise<Record<string, Cell>>) : null))
    .catch(() => null));
}
/** 이미 있는 Sheet에 시트 묶음을 더 불러 넣음 (이미 있으면 건너뜀) — 필요한 영웅만 그때그때 (SPRITE_RES_1017 §C) */
const loading: Record<string, Promise<void>> = {};
export function loadInto(s: Sheet, dirs: string[]) {
  const B = import.meta.env.BASE_URL;
  return Promise.all(
    dirs.map((d) =>
      (loading[d] ??= (async () => {
        // 코스튬 시트(…/px2/<id>)가 없으면 기본 시트(px2/<id>)를 같은 이름으로 넣음 → 그림이 빠져도 기본 옷으로 보임
        const alt = d.replace(/^.+\/(px2\/[^/]+)$/, '$1');
        let src = d;
        let meta = await loadParts(d);
        if (!meta && alt !== d) meta = await loadParts((src = alt));
        if (!meta) return;
        const keys = Object.keys(meta);
        const ims = await Promise.all(keys.map((k) => loadImg(`${B}art/${src}/${k}.png`).catch(() => null)));
        keys.forEach((k, i) => {
          if (!ims[i]) return;
          s.img[`${d}:${k}`] = ims[i]!;
          s.cell[`${d}:${k}`] = meta[k];
          const row = `${d}:${k.split('c')[0]}`;
          s.base[row] = Math.max(s.base[row] ?? 0, meta[k].y + meta[k].h);
        });
      })()),
    ),
  ).then(() => undefined);
}
/** 시트 묶음을 다 불러 넣었는지 */
export const hasSheet = (s: Sheet, dir: string) => Object.keys(s.cell).some((k) => k.startsWith(`${dir}:`));
/** public/art/<dir>/ 의 칸 그림들 (여러 시트 묶음을 한 Sheet로) */
export async function loadSheets(dirs: string[]): Promise<Sheet> {
  const s: Sheet = { img: {}, cell: {}, base: {} };
  const B = import.meta.env.BASE_URL;
  for (const d of dirs) {
    const r = await fetch(`${B}art/${d}/_parts.json`);
    // 아직 없는 시트는 건너뜀 (없는 동작은 animOf가 대신할 동작으로)
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) continue;
    const meta = (await r.json()) as Record<string, Cell>;
    const keys = Object.keys(meta);
    const ims = await Promise.all(keys.map((k) => loadImg(`${B}art/${d}/${k}.png`)));
    keys.forEach((k, i) => {
      s.img[`${d}:${k}`] = ims[i];
      s.cell[`${d}:${k}`] = meta[k];
      const row = `${d}:${k.split('c')[0]}`;
      s.base[row] = Math.max(s.base[row] ?? 0, meta[k].y + meta[k].h);
    });
  }
  return s;
}

/**
 * 그리기: (fx, fy) 발 바닥 · hgt = 「대기 첫 프레임 키」를 화면에서 몇 px로 · face 1 = 오른쪽
 *  ref = 키 잴 프레임 (보통 대기 첫 칸)
 */
export function drawFrame(ctx: CanvasRenderingContext2D, s: Sheet, key: string, fx: number, fy: number, k: number, face = 1, alpha = 1) {
  const im = s.img[key];
  const c = s.cell[key];
  if (!im || !c) return;
  const [d, name] = key.split(':');
  // 쓰러짐 칸(r1c1)은 누운 몸의 아래 끝을 발 자리에 → 서 있는 줄 기준선(by)에 맞추면 몸이 그림자 위로 붕 뜨던 것 (10/18)
  const base = name === 'r1c1' ? c.y + c.h : (c.by ?? s.base[`${d}:${name.split('c')[0]}`] ?? c.ch);
  ctx.save();
  ctx.globalAlpha *= alpha;
  // 줄일 땐 늘 부드럽게 (도트가 계단지지 않게) · 1.5배 넘게 키울 때만 픽셀 그대로 (SPRITE_RES_1017 §A)
  ctx.imageSmoothingEnabled = k < 1.5;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(fx, fy);
  ctx.scale(face * k, k);
  ctx.drawImage(im, c.x - (c.ax ?? c.cw / 2), c.y - base);
  ctx.restore();
}
/** 키 잴 프레임의 그림 높이 */
export const heightOf = (s: Sheet, key: string) => s.cell[key]?.h ?? 100;
