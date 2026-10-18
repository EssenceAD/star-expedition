// 배경음악 (「체크인」 27곡 재활용 · docs/SOUND_PLAN.md A표): 화면·지역마다 곡 목록 → 섞어 틀기 · 곡이 바뀌면 1초 내리고 1.5초 올림
//  <audio> 두 개 → MediaElementSource → 배경음악 볼륨(engine bgmBus) · 첫 터치 전에는 아무것도 안 틈
import { bgmBus, ctx, onUnlock } from './engine';

const DIR = `${import.meta.env.BASE_URL}audio/bgm/`;
const F: Record<string, string> = {
  '01': '01_legacy_of_adventure', '02': '02_morning_firewood', '03': '03_inn_afternoon', '04': '04_market_day', '05': '05_breezy_hill',
  '06': '06_by_the_campfire', '07': '07_starlight_music_box', '08': '08_sleeping_inn', '09': '09_run_the_forest_path', '10': '10_into_the_deep',
  '11': '11_king_of_the_forest', '12': '12_final_strike', '13': '13_feathered_hat_march', '14': '14_neighbors_yard', '15': '15_night_face_to_face',
  '16': '16_old_map_in_the_attic', '17': '17_back_on_the_road', '18': '18_this_is_my_place', '19': '19_endless_abyss', '20': '20_wind_over_fields',
  '21': '21_salt_and_sand', '22': '22_ember_and_cloud', '23': '23_giants_footsteps', '24': '24_all_together', '25': '25_five_stars',
  '26': '26_rainy_window', '27': '27_lantern_lane',
};
/** 장면 → 곡 번호들 (27곡 모두 어딘가에 씀) */
export const MUSIC: Record<string, string[]> = {
  title: ['01'],
  lobby: ['02', '03', '05', '26'],
  night: ['06', '07', '08', '27'],
  shop: ['04'],
  hero: ['15', '18'],
  friends: ['14'],
  guild: ['24'],
  story: ['16'],
  recruit: ['13'],
  five: ['25'],
  clear: ['17'],
  // 지역 전투 (CHAPTERS region)
  forest: ['09'], swamp: ['20'], mine: ['10'], ice: ['05'], abyss: ['19'], coast: ['21'], dune: ['20'], ember: ['22'], sky: ['22'], deep: ['19'],
  boss: ['11', '23'],
  bossLow: ['12'],
  raid: ['23', '24'],
  world: ['23'],
  arena: ['12'],
  tower: ['19'],
  dungeon: ['10'],
};

interface Deck { el: HTMLAudioElement; g: GainNode | null }
const decks: Deck[] = [];
let cur = 0;
let want = '';
let playing = '';
let swapT = 0;
const last: Record<string, string> = {};

function deck(): Deck {
  const el = new Audio();
  el.preload = 'auto';
  el.loop = true;
  el.crossOrigin = 'anonymous';
  const d: Deck = { el, g: null };
  if (ctx) {
    d.g = ctx.createGain();
    d.g.gain.value = 0;
    ctx.createMediaElementSource(el).connect(d.g).connect(bgmBus);
  }
  return d;
}
function ramp(d: Deck, to: number, sec: number) {
  if (!ctx || !d.g) return;
  const t = ctx.currentTime;
  d.g.gain.cancelScheduledValues(t);
  d.g.gain.setValueAtTime(d.g.gain.value, t);
  d.g.gain.linearRampToValueAtTime(to, t + sec);
}
function pick(scene: string) {
  const list = MUSIC[scene] ?? MUSIC.lobby;
  const pool = list.length > 1 ? list.filter((x) => x !== last[scene]) : list;
  const n = pool[Math.floor(Math.random() * pool.length)];
  last[scene] = n;
  return n;
}
function apply() {
  if (!ctx || !want || want === playing) return;
  if (!decks.length) decks.push(deck(), deck());
  playing = want;
  const old = decks[cur];
  ramp(old, 0, 1);
  clearTimeout(swapT);
  const n = pick(want);
  swapT = window.setTimeout(() => {
    old.el.pause();
    cur = 1 - cur;
    const d = decks[cur];
    d.el.src = `${DIR}${F[n]}.mp3`;
    d.el.currentTime = 0;
    void d.el.play().catch(() => {});
    ramp(d, 1, 1.5);
  }, old.el.paused ? 0 : 1100);
}
/** 지금 장면의 곡 (같은 장면이면 그대로 이어서) */
export function music(scene: string) {
  want = scene;
  apply();
}
onUnlock(apply);
