// PNG → JPEG (브라우저 캔버스로 인코딩) : node tools/tojpg.mjs <in.png> <out.jpg> [품질 0.85]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [src, out, q = '0.85'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
const data = 'data:image/png;base64,' + fs.readFileSync(src).toString('base64');
const jpg = await p.evaluate(async ([d, q]) => { const i = new Image(); i.src = d; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d').drawImage(i, 0, 0); return c.toDataURL('image/jpeg', +q); }, [data, q]);
fs.writeFileSync(out, Buffer.from(jpg.split(',')[1], 'base64'));
await b.close();
console.log('saved', out, fs.statSync(out).size);
