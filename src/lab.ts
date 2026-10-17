// 그림 실험실: 영웅 도트 동작 보기 · GIF/띠 캡처 (?hero=woongs&act=idle&t=0.3 · window.__at(t))
import { artOf, heroOf } from './data/heroes';
import { MOB_KINDS } from './data/mobs';
import { animOf, drawFrame, frameAt, heightOf, loadSheets, type Act } from './sprite/sheet';

const q = new URLSearchParams(location.search);
const cv = document.getElementById('cv') as HTMLCanvasElement;
const ctx = cv.getContext('2d')!;
const W = +(q.get('w') ?? 320);
const H = +(q.get('h') ?? 260);
cv.width = W;
cv.height = H;
const id = q.get('hero') ?? 'woongs';
const def = heroOf(id) ?? null;
const mob = def ? null : MOB_KINDS[id as keyof typeof MOB_KINDS];
const anims = def ? artOf(def).anims : mob!.anims;
const dirs = [...new Set(Object.values(anims).flatMap((a) => a!.frames.map((f) => f.split(':')[0])))];
const sheet = await loadSheets(dirs);
let act = (q.get('act') ?? 'idle') as Act;
const hgt = +(q.get('hgt') ?? (def ? 160 : mob!.h));
const ref = anims.idle!.frames[0];
const k = hgt / heightOf(sheet, ref);
const bar = document.getElementById('bar')!;
if (q.get('bar') === '0') bar.hidden = true;
for (const a of Object.keys(anims) as Act[]) {
  const b = document.createElement('button');
  b.textContent = a;
  b.onclick = () => ((act = a), (t0 = performance.now()));
  bar.appendChild(b);
}
let t0 = performance.now();
function frame(t: number) {
  ctx.fillStyle = '#a8d8ff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#86c46e';
  ctx.fillRect(0, H * 0.85, W, H);
  const { def: a } = animOf(anims, act);
  const fi = frameAt(a, t);
  drawFrame(ctx, sheet, a.frames[fi], W * 0.42, H * 0.86, k, mob ? -1 : 1);
  ctx.strokeStyle = 'rgba(255,0,0,0.5)';
  ctx.beginPath();
  ctx.moveTo(W * 0.42, 0);
  ctx.lineTo(W * 0.42, H);
  ctx.stroke();
}
Object.assign(window, { __at: frame, __ready: true, __len: (a: Act) => animOf(anims, a).def.frames.length / animOf(anims, a).def.fps });
function loop() {
  if (!q.has('frozen')) frame((performance.now() - t0) / 1000);
  requestAnimationFrame(loop);
}
loop();
