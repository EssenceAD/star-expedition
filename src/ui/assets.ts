// 그림 불러오기 (SPRITE_RES_1017 §C): 처음엔 꼭 필요한 것만 · 전투 전엔 그 전투 영웅만 기다림 · 나머지는 로비 뜬 뒤 뒤에서 천천히
import { CONFIG } from '../config';
import type { BattleSetup, HeroSpec } from '../battle/setup';
import { heroDirs, HEROES } from '../data/heroes';
import { hasSheet, loadInto } from '../sprite/sheet';
import { view } from './view';

const B = import.meta.env.BASE_URL;
export const img = (src: string) =>
  new Promise<HTMLImageElement>((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => no(new Error(src));
    i.src = src;
  });
const cutinLoad: Record<string, Promise<void>> = {};
/** 컷인 그림 (path = HeroArt.cutin · public/art 아래 · 코스튬이면 코스튬 초상화) — 처음 쓸 전투 전에 · 키도 path */
export function loadCutin(path: string) {
  return (cutinLoad[path] ??= img(`${B}art/${path}`)
    .then((im) => void (view.art.cutin[path] = im))
    .catch(() => {}));
}
/** 이 전투에 나오는 영웅(아군·AI 동료·결투장 상대) */
export const battleHeroes = (s: BattleSetup) => [...s.heroes, ...(s.allies ?? []), ...s.waves.flat().flatMap((m) => (m.hero ? [m.hero] : []))];
/** 아직 안 받은 시트·컷인이 있으면 받아서 끝날 때 알려 줌 · 다 있으면 null */
export function ensureHeroes(hs: HeroSpec[]): Promise<void> | null {
  const sheet = view.art.sheet;
  const need = [...new Set(hs.map((h) => h.art.dir))].filter((d) => !hasSheet(sheet, d));
  const cut = [...new Set(hs.map((h) => h.art.cutin))].filter((p) => !view.art.cutin[p]);
  if (!need.length && !cut.length) return null;
  return Promise.all([loadInto(sheet, need), ...cut.map(loadCutin)]).then(() => undefined);
}
/** 이 전투 몹·보스 시트 묶음 (지역 몹 mobs2/<지역> · 장 보스 bosses2/<지역> · ANIM_1017 ③) */
export const battleMobDirs = (s: BattleSetup) => [...new Set(s.waves.flat().flatMap((m) => Object.values(m.kind.anims).flatMap((d) => d!.frames.map((f) => f.split(':')[0]))))];
const bgLoad: Record<string, Promise<void>> = {};
/** 전투 전에 기다릴 그림: 영웅 시트·컷인 + 몹·보스 시트 + 전용 배경(지역 배경) · 다 있으면 null */
export function ensureBattleArt(s: BattleSetup): Promise<void> | null {
  const sheet = view.art.sheet;
  const mobs = battleMobDirs(s).filter((d) => !hasSheet(sheet, d));
  const bg = s.bg && !view.art.bgs?.[s.bg] ? (bgLoad[s.bg] ??= img(`${B}art/bgs/${s.bg}.jpg`).then((im) => void ((view.art.bgs ??= {})[s.bg!] = im)).catch(() => {})) : null;
  const heroes = ensureHeroes(battleHeroes(s));
  if (!mobs.length && !bg && !heroes) return null;
  return Promise.all([loadInto(sheet, mobs), bg, heroes]).then(() => undefined);
}
/** 나머지 영웅 시트를 뒤에서 천천히 (동시 몇 개만) */
export function preloadRest() {
  const queue = HEROES.map((h) => h.id).filter((id) => !hasSheet(view.art.sheet, `px2/${id}`));
  const next = (): Promise<void> | undefined => {
    const id = queue.shift();
    if (id) return loadInto(view.art.sheet, heroDirs([id])).then(next);
  };
  for (let i = 0; i < CONFIG.ui.preloadAtOnce; i++) void next();
}
