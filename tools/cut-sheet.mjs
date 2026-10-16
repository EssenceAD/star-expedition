// GPT 그림 시트(마젠타 배경) → 물건마다 투명 PNG 자르기
//  「용사님 체크인」 tools/gpt_sheet.py 를 Node로 옮김 (이 PC엔 파이썬이 없어서): 마젠타 빼기 · 가장자리 분홍 번짐 지우기 · 덩어리 찾기 · 읽는 순서(위→아래, 왼→오)
//  실행: node tools/cut-sheet.mjs <시트.png> <내보낼 폴더> 이름1 이름2 …   (덩어리 수와 이름 수가 다르면 알려 줌)
//        --grid 4x4  → 덩어리 대신 같은 칸으로 나눔 (도트 프레임 시트)
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const args = process.argv.slice(2);
const gi = args.indexOf('--grid');
const grid = gi >= 0 ? args.splice(gi, 2)[1].split('x').map(Number) : null;
const bx = args.indexOf('--byx');
const byX = bx >= 0 && !!args.splice(bx, 1);
const [src, out, ...names] = args;
fs.mkdirSync(out, { recursive: true });
const png = PNG.sync.read(fs.readFileSync(src));
const { width: W, height: H, data } = png;

// 1) 마젠타 정도 (0 = 배경과 거리 멂, 1 = 완전 배경)
const mag = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  // 마젠타: r·b 높고 g 낮음
  const m = Math.min(r, b) - g;
  mag[i] = Math.max(0, Math.min(1, (m - 60) / 120));
}
// 2) 알파 + 분홍 번짐 빼기 (despill: g보다 큰 r·b를 g쪽으로)
for (let i = 0; i < W * H; i++) {
  const a = 1 - mag[i];
  data[i * 4 + 3] = Math.round(255 * a);
  if (a > 0 && mag[i] > 0) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const lim = Math.max(g, Math.min(r, b) * 0.6);
    if (r > lim && b > lim) {
      data[i * 4] = Math.min(r, lim + (r - b > 0 ? r - b : 0));
      data[i * 4 + 2] = Math.min(b, lim);
    }
  }
}
const solid = (i) => data[i * 4 + 3] > 40;

function crop(x0, y0, x1, y1, pad = 4, id = -1) {
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W, x1 + pad); y1 = Math.min(H, y1 + pad);
  const o = new PNG({ width: x1 - x0, height: y1 - y0 });
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const s = (y * W + x) * 4, d = ((y - y0) * o.width + (x - x0)) * 4;
    // 덩어리 자르기: 그 덩어리 픽셀만 (옆 덩어리가 상자에 걸쳐도 안 딸려 오게)
    if (id >= 0 && lab[y * W + x] !== id) continue;
    for (let k = 0; k < 4; k++) o.data[d + k] = data[s + k];
  }
  return { png: o, x: x0, y: y0, w: o.width, h: o.height };
}

const boxes = [];
const lab = new Int32Array(W * H).fill(-1);
if (grid) {
  // 같은 칸 나누기 → 칸마다 내용 테두리로 자르되, 발 기준을 맞추려 칸 안 위치(오프셋)도 기록
  const [cols, rows] = grid;
  const cw = W / cols, ch = H / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const X0 = Math.round(c * cw), Y0 = Math.round(r * ch), X1 = Math.round((c + 1) * cw), Y1 = Math.round((r + 1) * ch);
    boxes.push([X0, Y0, X1, Y1, true]);
  }
} else {
  // 덩어리 찾기 (조금 부풀려 떨어진 조각도 한 덩어리로)
  const R = 2;
  const near = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid(y * W + x)) {
    for (let dy = -R; dy <= R; dy += 1) for (let dx = -R; dx <= R; dx += 1) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) near[ny * W + nx] = 1;
    }
  }
  let n = 0;
  for (let i = 0; i < W * H; i++) {
    if (!near[i] || lab[i] >= 0) continue;
    const st = [i];
    lab[i] = n;
    let x0 = W, y0 = H, x1 = 0, y1 = 0, cnt = 0;
    while (st.length) {
      const k = st.pop();
      const x = k % W, y = (k / W) | 0;
      if (solid(k)) { cnt++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); }
      for (const nk of [k - 1, k + 1, k - W, k + W]) if (nk >= 0 && nk < W * H && near[nk] && lab[nk] < 0 && Math.abs((nk % W) - x) <= 1) { lab[nk] = n; st.push(nk); }
    }
    if (cnt > 600) boxes.push([x0, y0, x1, y1, false, n]);
    n++;
  }
  // 읽는 순서: 가운데 y로 줄 묶기
  boxes.sort((a, b) => (a[1] + a[3]) / 2 - (b[1] + b[3]) / 2);
  const rows = [];
  for (const b of boxes) {
    const cy = (b[1] + b[3]) / 2;
    const last = rows[rows.length - 1];
    if (last && Math.abs(cy - last.cy) < H * 0.09) last.items.push(b);
    else rows.push({ cy, items: [b] });
  }
  boxes.length = 0;
  for (const r of rows) boxes.push(...r.items.sort((a, b) => a[0] - b[0]));
  // --byx: 한 줄로 늘어선 시트 (키가 제각각이라 줄 묶기가 헷갈릴 때)
  if (byX) boxes.sort((a, b) => a[0] - b[0]);
}
console.log(`찾은 것 ${boxes.length}개 · 이름 ${names.length}개`);
const meta = {};
boxes.forEach((b, i) => {
  const name = names[i] ?? `part${i}`;
  let [x0, y0, x1, y1, cell, id] = b;
  if (cell) {
    // 칸 안 실제 내용 테두리
    let a = x1, c = y1, d = x0, e = y0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (solid(y * W + x)) { a = Math.min(a, x); c = Math.min(c, y); d = Math.max(d, x + 1); e = Math.max(e, y + 1); }
    const r = crop(a, c, d, e, 1);
    meta[name] = { x: r.x - x0, y: r.y - y0, w: r.w, h: r.h, cw: x1 - x0, ch: y1 - y0 };
    fs.writeFileSync(path.join(out, name + '.png'), PNG.sync.write(r.png));
  } else {
    const r = crop(x0, y0, x1, y1, 4, id);
    meta[name] = { x: r.x, y: r.y, w: r.w, h: r.h };
    fs.writeFileSync(path.join(out, name + '.png'), PNG.sync.write(r.png));
  }
});
fs.writeFileSync(path.join(out, '_parts.json'), JSON.stringify(meta, null, 1));
console.log(Object.entries(meta).map(([k, v]) => `${k} ${v.w}×${v.h}`).join(' · '));
