// 같은 사람으로 보이나: 「체크인」 star_ 초상화(×6) | 시트에서 고른 프레임 확대(최근접) | 시트 전체(줄임)
//  node tools/compare.mjs <id> <잘린 폴더> <시트.png> <out.png> [프레임들 r0c0,r2c3,...]
import fs from 'node:fs';
import { PNG } from 'pngjs';
const [id, dir, sheetPath, out, framesArg] = process.argv.slice(2);
const ref = PNG.sync.read(fs.readFileSync(`art_raw/ref/star_${id}_x6.png`));
const sheet = PNG.sync.read(fs.readFileSync(sheetPath));
const frames = (framesArg ?? 'r0c0,r2c3').split(',').map((k) => PNG.sync.read(fs.readFileSync(`${dir}/${k}.png`)));
const H = Math.max(ref.height, 420);
// 시트 줄이기 (H 높이로 · 박스 평균)
const sk = H / sheet.height;
const sw = Math.round(sheet.width * sk);
const small = new PNG({ width: sw, height: H });
for (let y = 0; y < H; y++)
  for (let x = 0; x < sw; x++) {
    const s = ((Math.floor(y / sk) * sheet.width + Math.floor(x / sk)) * 4);
    const d = (y * sw + x) * 4;
    for (let q = 0; q < 4; q++) small.data[d + q] = sheet.data[s + q];
  }
// 프레임 확대 (키 H*0.9에 맞춘 정수배 근사)
const big = frames.map((f) => {
  const k = Math.max(1, Math.floor((H * 0.95) / f.height)) || 1;
  const o = new PNG({ width: f.width * k, height: f.height * k });
  for (let y = 0; y < o.height; y++)
    for (let x = 0; x < o.width; x++) {
      const s = (Math.floor(y / k) * f.width + Math.floor(x / k)) * 4;
      const d = (y * o.width + x) * 4;
      const a = f.data[s + 3] / 255;
      for (let q = 0; q < 3; q++) o.data[d + q] = Math.round(f.data[s + q] * a + 236 * (1 - a));
      o.data[d + 3] = 255;
    }
  return o;
});
const W = ref.width + 12 + big.reduce((s, b) => s + b.width + 12, 0) + sw;
const img = new PNG({ width: W, height: H });
img.data.fill(236);
let x = 0;
PNG.bitblt(ref, img, 0, 0, ref.width, ref.height, x, 0);
x += ref.width + 12;
for (const b of big) {
  PNG.bitblt(b, img, 0, 0, b.width, Math.min(b.height, H), x, H - Math.min(b.height, H));
  x += b.width + 12;
}
PNG.bitblt(small, img, 0, 0, sw, H, x, 0);
fs.writeFileSync(out, PNG.sync.write(img));
console.log('saved', out, W, H);
