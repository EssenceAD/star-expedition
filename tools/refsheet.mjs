// 「체크인」 개척자 초상화(star_·p_)를 크게(최근접) 모아 보기 + 하나씩 확대본 (ChatGPT 참고 이미지용)
import fs from 'node:fs';
import { PNG } from 'pngjs';
const L = 'C:/projects/legacy-of-adventure/public/assets/portraits';
const ids = ['woongs', 'gonu', 'ikamolly', 'walwal', 'warmnight'];
const K = +(process.argv[2] ?? 6);
const up = (p, k) => {
  const o = new PNG({ width: p.width * k, height: p.height * k });
  for (let y = 0; y < o.height; y++) for (let x = 0; x < o.width; x++) {
    const s = (((y / k) | 0) * p.width + ((x / k) | 0)) * 4, d = (y * o.width + x) * 4;
    const a = p.data[s + 3] / 255;
    // 투명은 흰 바탕으로
    for (let q = 0; q < 3; q++) o.data[d + q] = Math.round(p.data[s + q] * a + 255 * (1 - a));
    o.data[d + 3] = 255;
  }
  return o;
};
const tiles = [];
for (const id of ids) for (const pre of ['star_', 'p_']) {
  const p = PNG.sync.read(fs.readFileSync(`${L}/${pre}${id}.png`));
  const u = up(p, K);
  fs.writeFileSync(`art_raw/ref/${pre}${id}_x${K}.png`, PNG.sync.write(u));
  tiles.push({ id: pre + id, u, w: p.width, h: p.height });
}
console.log(tiles.map((t) => `${t.id} ${t.w}x${t.h}`).join(' · '));
const tw = Math.max(...tiles.map((t) => t.u.width)), th = Math.max(...tiles.map((t) => t.u.height));
const sheet = new PNG({ width: tw * 2 + 10, height: (th + 10) * ids.length });
sheet.data.fill(255);
tiles.forEach((t, i) => PNG.bitblt(t.u, sheet, 0, 0, t.u.width, t.u.height, (i % 2) * (tw + 10), Math.floor(i / 2) * (th + 10)));
fs.writeFileSync('art_raw/ref/_all.png', PNG.sync.write(sheet));
