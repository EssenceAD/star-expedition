// 일러스트 한 장: 마젠타 빼기 + 줄이기(상자 평균) → 투명 PNG
//  node tools/key.mjs <in.png> <out.png> [가로 px=900]
import fs from 'node:fs';
import { PNG } from 'pngjs';
const [src, out, w = '900'] = process.argv.slice(2);
const p = PNG.sync.read(fs.readFileSync(src));
const { width: W, height: H, data } = p;
for (let i = 0; i < W * H; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
  const m = Math.max(0, Math.min(1, (Math.min(r, b) - g - 110) / 80)) * (Math.min(r, b) > 120 ? 1 : 0.5);
  data[i * 4 + 3] = Math.round(255 * (1 - m));
  if (m > 0 && m < 1) {
    const lim = Math.max(g, Math.min(r, b) * 0.6);
    data[i * 4] = Math.min(r, lim + Math.max(0, r - b));
    data[i * 4 + 2] = Math.min(b, lim);
  }
}
const OW = +w;
const k = W / OW;
const OH = Math.round(H / k);
const o = new PNG({ width: OW, height: OH });
for (let y = 0; y < OH; y++)
  for (let x = 0; x < OW; x++) {
    let s = [0, 0, 0, 0];
    let n = 0;
    for (let yy = Math.floor(y * k); yy < Math.min(H, Math.floor((y + 1) * k)); yy++)
      for (let xx = Math.floor(x * k); xx < Math.min(W, Math.floor((x + 1) * k)); xx++) {
        const i = (yy * W + xx) * 4;
        const a = data[i + 3];
        s[0] += data[i] * a; s[1] += data[i + 1] * a; s[2] += data[i + 2] * a; s[3] += a;
        n++;
      }
    const d = (y * OW + x) * 4;
    const A = s[3] || 1;
    o.data[d] = s[0] / A; o.data[d + 1] = s[1] / A; o.data[d + 2] = s[2] / A; o.data[d + 3] = s[3] / n;
  }
fs.mkdirSync(out.replace(/[^/\\]+$/, ''), { recursive: true });
fs.writeFileSync(out, PNG.sync.write(o));
console.log('saved', out, OW, OH);
