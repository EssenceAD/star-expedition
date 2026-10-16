// 도트 동작 시트 자르기 (칸을 넘는 칼끝·효과도 안 잘리게): 마젠타 빼기 → 덩어리 찾기 → 덩어리마다 「발이 선 칸」을 정해 칸끼리 묶기
//  칸 이름 r{줄}c{칸} · _parts.json 의 x,y = 칸 왼쪽 위 기준 (칸 밖으로 나가면 음수/칸보다 큼) · cw,ch = 칸 크기
//  실행: node tools/cut-cells.mjs <시트.png> <폴더> <열>x<줄> [--min 400]
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const args = process.argv.slice(2);
const mi = args.indexOf('--min');
const MIN = mi >= 0 ? +args.splice(mi, 2)[1] : 400;
const [src, out, grid] = args;
const [COLS, ROWS] = grid.split('x').map(Number);
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f.endsWith('.png')) fs.unlinkSync(path.join(out, f));
const png = PNG.sync.read(fs.readFileSync(src));
const { width: W, height: H, data } = png;
const CW = W / COLS;
const CH = H / ROWS;

// 마젠타 → 투명 (가장자리 번짐 빼기)
for (let i = 0; i < W * H; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  // 진짜 마젠타만 (분홍 머리·옷은 남게): r·b 둘 다 높고 g가 아주 낮을 때
  const m = Math.max(0, Math.min(1, (Math.min(r, b) - g - 110) / 80)) * (Math.min(r, b) > 120 ? 1 : 0.5);
  data[i * 4 + 3] = Math.round(255 * (1 - m));
  if (m > 0 && m < 1) {
    const lim = Math.max(g, Math.min(r, b) * 0.6);
    data[i * 4] = Math.min(r, lim + Math.max(0, r - b));
    data[i * 4 + 2] = Math.min(b, lim);
  }
}
const solid = (i) => data[i * 4 + 3] > 40;
// 덩어리 (8방향)
const lab = new Int32Array(W * H).fill(-1);
const comps = [];
for (let i = 0; i < W * H; i++) {
  if (!solid(i) || lab[i] >= 0) continue;
  const id = comps.length;
  const st = [i];
  lab[i] = id;
  let x0 = W, y0 = H, x1 = 0, y1 = 0, n = 0, sx = 0;
  while (st.length) {
    const k = st.pop();
    const x = k % W, y = (k / W) | 0;
    n++;
    sx += x;
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x + 1 > x1) x1 = x + 1;
    if (y + 1 > y1) y1 = y + 1;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nk = ny * W + nx;
        if (lab[nk] < 0 && solid(nk)) ((lab[nk] = id), st.push(nk));
      }
  }
  comps.push({ id, x0, y0, x1, y1, n, cx: sx / n });
}
// 칸 둘을 넘게 이어 붙은 덩어리(이펙트가 옆 프레임과 닿음)는 칸 경계에서 쪼갠다 → 칸마다 새 덩어리
for (const c of [...comps]) {
  if (c.x1 - c.x0 <= CW * 1.15 && c.y1 - c.y0 <= CH * 1.15) continue;
  const parts = new Map();
  for (let y = c.y0; y < c.y1; y++)
    for (let x = c.x0; x < c.x1; x++) {
      const k = y * W + x;
      if (lab[k] !== c.id) continue;
      const col = Math.floor(x / CW) + Math.floor(y / CH) * 1000;
      let p = parts.get(col);
      if (!p) parts.set(col, (p = { id: comps.length + parts.size, x0: W, y0: H, x1: 0, y1: 0, n: 0, sx: 0 }));
      lab[k] = p.id;
      p.n++; p.sx += x;
      if (x < p.x0) p.x0 = x; if (y < p.y0) p.y0 = y; if (x + 1 > p.x1) p.x1 = x + 1; if (y + 1 > p.y1) p.y1 = y + 1;
    }
  c.n = 0;
  // 옆 칸으로 조금 삐져나간 조각(남의 프레임 효과)은 버린다 — 가장 큰 조각의 30% 미만
  const mx = Math.max(...[...parts.values()].map((p) => p.n));
  for (const p of parts.values()) comps.push({ ...p, cx: p.sx / p.n, n: p.n < mx * 0.3 ? 0 : p.n });
}
// 큰 덩어리 = 몸통(칸 정하기) · 작은 덩어리(불꽃·먼지)는 가장 가까운 몸통 칸에 붙인다
const big = comps.filter((c) => c.n >= MIN);
const small = comps.filter((c) => c.n < MIN && c.n >= 6);
const cells = new Map();
const cellOf = (c) => {
  const col = Math.max(0, Math.min(COLS - 1, Math.floor(c.cx / CW)));
  const row = Math.max(0, Math.min(ROWS - 1, Math.floor((c.y1 - 4) / CH)));
  return `r${row}c${col}`;
};
for (const c of big) {
  const k = cellOf(c);
  (cells.get(k) ?? cells.set(k, []).get(k)).push(c);
}
for (const c of small) {
  let best = null, bd = Infinity;
  for (const [k, list] of cells)
    for (const b of list) {
      const d = Math.max(0, b.x0 - c.x1, c.x0 - b.x1) + Math.max(0, b.y0 - c.y1, c.y0 - b.y1);
      if (d < bd) ((bd = d), (best = k));
    }
  if (best && bd < 40) cells.get(best).push(c);
}
const meta = {};
const masks = {};
for (const [k, list] of [...cells].sort()) {
  const ids = new Set(list.map((c) => c.id));
  const x0 = Math.max(0, Math.min(...list.map((c) => c.x0)) - 1);
  const y0 = Math.max(0, Math.min(...list.map((c) => c.y0)) - 1);
  const x1 = Math.min(W, Math.max(...list.map((c) => c.x1)) + 1);
  const y1 = Math.min(H, Math.max(...list.map((c) => c.y1)) + 1);
  const o = new PNG({ width: x1 - x0, height: y1 - y0 });
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const s = y * W + x;
      if (!ids.has(lab[s])) continue;
      const d = ((y - y0) * o.width + (x - x0)) * 4;
      for (let q = 0; q < 4; q++) o.data[d + q] = data[s * 4 + q];
    }
  const [row, col] = k.slice(1).split('c').map(Number);
  // 발 x: 그림 아래 8줄의 평균 x (칼끝·효과가 칸 밖으로 나가도 몸이 제자리에 서게)
  let fs_ = 0, fn = 0;
  for (let y = y1 - 9; y < y1; y++) for (let x = x0; x < x1; x++) if (ids.has(lab[y * W + x])) ((fs_ += x), fn++);
  const foot = fn ? fs_ / fn : (x0 + x1) / 2;
  // 머리 x: 위 25% 줄의 평균 x (대기·걷기처럼 칼이 아래에 있을 때 가장 안정)
  let hs = 0, hn = 0;
  for (let y = y0; y < y0 + (y1 - y0) * 0.25; y++) for (let x = x0; x < x1; x++) if (ids.has(lab[y * W + x])) ((hs += x), hn++);
  const head = hn ? hs / hn : foot;
  meta[k] = { x: x0 - Math.round(col * CW), y: y0 - Math.round(row * CH), w: o.width, h: o.height, cw: Math.round(CW), ch: Math.round(CH), fx: Math.round(foot - col * CW), hx: Math.round(head - col * CW) };
  fs.writeFileSync(path.join(out, k + '.png'), PNG.sync.write(o));
  masks[k] = { png: o, x0: x0 - Math.round(col * CW), y1: y1 - Math.round(row * CH) };
}
// 같은 줄 프레임 맞추기: GPT가 칸 안에서 그림을 제멋대로 옮겨 그려서 → 프레임 0에 알파 모양이 가장 많이 겹치는 가로 이동을 찾는다
//  ax = 칸 기준 「몸 기준 x」 (줄 첫 프레임 = 발 x · 나머지 = 첫 프레임 ax + 이동)
function score(a, b, dx) {
  // 아래(발) 기준으로 맞춰, 2픽셀마다
  let s = 0;
  for (let y = 0; y < a.png.height; y += 2) {
    const ya = y;
    const yb = y - (a.y1 - a.png.height) + (b.y1 - b.png.height);
    if (yb < 0 || yb >= b.png.height) continue;
    for (let x = 0; x < a.png.width; x += 2) {
      if (a.png.data[(ya * a.png.width + x) * 4 + 3] < 128) continue;
      const xb = x + a.x0 - b.x0 + dx;
      if (xb < 0 || xb >= b.png.width) continue;
      if (b.png.data[(yb * b.png.width + xb) * 4 + 3] >= 128) s++;
    }
  }
  return s;
}
for (let r = 0; r < ROWS; r++) {
  const ref = masks[`r${r}c0`];
  if (!ref) continue;
  meta[`r${r}c0`].ax = meta[`r${r}c0`].fx;
  for (let c = 1; c < COLS; c++) {
    const k = `r${r}c${c}`;
    if (!masks[k]) continue;
    let best = 0, bs = -1;
    for (let dx = -60; dx <= 60; dx += 2) {
      const s = score(ref, masks[k], dx);
      if (s > bs) ((bs = s), (best = dx));
    }
    meta[k].ax = meta[`r${r}c0`].ax + best;
  }
}
fs.writeFileSync(path.join(out, '_parts.json'), JSON.stringify(meta, null, 1));
const want = COLS * ROWS;
console.log(`칸 ${Object.keys(meta).length}/${want}`, Object.keys(meta).length < want ? `빠진 칸: ${Array.from({ length: want }, (_, i) => `r${Math.floor(i / COLS)}c${i % COLS}`).filter((k) => !meta[k]).join(' ')}` : '');
