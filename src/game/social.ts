// 소셜 (STAR_PLAN_v2 §4): 길드(실멤버 1 + AI 길드) · 친구(「체크인」 각별한 이웃 구조: 하루 선물) · 랭킹(탑·월드 보스·결투장·길드) + 랭커 칭호 · 우편 · 월드/길드 채팅
//  1단계: 서버 없이 이 기기 + AI — 실유저 데이터는 cloud.ts(같은 Supabase 새 테이블)가 붙으면 섞인다
import { CONFIG } from '../config';
import { CHAT_LINES, CHAT_NAMES } from '../data/chat';
import { HEROES } from '../data/heroes';
import { CHAPTER_MOBS } from '../data/mobs';
import { worldBoard } from './content';
import { addCur, dayKey, S, spend, track, weekOf, type ChatLine, type Mail, type Save } from './state';

const SO = CONFIG.social;
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const hashStr = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17) || 1;

// ───────── 길드 ─────────
export interface Guild {
  id: string;
  name: string;
  real: boolean;
  desc: string;
  lv: number;
  /** 멤버 이름 (실멤버 길드는 단톡방 창립 멤버 · AI 길드는 AI 이름) */
  members: string[];
}
const FOUNDERS = HEROES.filter((h) => h.origin === 'founder').map((h) => h.name);
export const GUILDS: Guild[] = [
  { id: 'real', name: '별의 원정대', real: true, desc: '단톡방 창립 멤버 길드 (실멤버 · 서버 연결 뒤 진짜 기록)', lv: 1, members: FOUNDERS },
  { id: 'ai1', name: '새벽등불 상단', real: false, desc: '매일 출석하는 성실파 AI 길드', lv: 7, members: CHAT_NAMES.slice(0, 6) },
  { id: 'ai2', name: '심연낚시 동호회', real: false, desc: '탑과 월드 보스에 진심인 AI 길드', lv: 9, members: CHAT_NAMES.slice(6, 12) },
  { id: 'ai3', name: '느긋한 여관', real: false, desc: '천천히 즐기는 AI 길드', lv: 4, members: [...CHAT_NAMES.slice(3, 9)] },
];
export const guildOf = (s: Save = S) => GUILDS.find((g) => g.id === s.guild.id) ?? null;
function rollGuild(s: Save, now: number) {
  if (s.guild.week !== weekOf(now)) ((s.guild.week = weekOf(now)), (s.guild.weekContrib = 0), (s.guild.raid = 0));
}
export function joinGuild(id: string, s: Save = S, now = Date.now()): boolean {
  if (!GUILDS.some((g) => g.id === id)) return false;
  s.guild.id = id;
  rollGuild(s, now);
  addMail(s, '길드', `「${GUILDS.find((g) => g.id === id)!.name}」에 들어왔어요`, '길드 출석·기여로 길드 코인을 모아 길드 상점에서 써요.', { guildCoin: 20 }, now);
  return true;
}
export const leaveGuild = (s: Save = S) => (s.guild.id = null);
export function guildAttend(s: Save = S, now = Date.now()): boolean {
  if (!s.guild.id || s.guild.attendDay === dayKey(now)) return false;
  rollGuild(s, now);
  s.guild.attendDay = dayKey(now);
  addCur('guildCoin', SO.guild.attendCoin, s);
  track('guildAttend', 1, s, now);
  return true;
}
/** 기여: 금화 → 기여 점수 · 길드 코인 (하루 한 번) */
export function donate(tier: number, s: Save = S, now = Date.now()): 'ok' | 'poor' | 'done' | 'none' {
  if (!s.guild.id) return 'none';
  if (s.guild.donateDay === dayKey(now)) return 'done';
  const [gold, pts, coin] = SO.guild.donate[tier];
  if (!spend('gold', gold, s)) return 'poor';
  rollGuild(s, now);
  s.guild.donateDay = dayKey(now);
  s.guild.contrib += pts;
  s.guild.weekContrib += pts;
  addCur('guildCoin', coin, s);
  track('guildDonate', 1, s, now);
  return 'ok';
}
/** 길드원 기여 순위 (AI 길드원은 그 주 씨앗으로 · 실멤버 길드는 서버 연결 전이라 나만) */
export function guildBoard(s: Save = S, now = Date.now()) {
  const g = guildOf(s);
  if (!g) return [];
  rollGuild(s, now);
  const r = seeded(hashStr(g.id + weekOf(now)));
  const days = Math.min(7, ((now - Date.parse(`${weekOf(now)}T00:00:00+09:00`)) / 86400e3) | 0) + 1;
  const others = g.real ? g.members.map((name) => ({ name, pts: 0, raid: 0, me: false })) : g.members.map((name) => ({ name, pts: Math.round((20 + r() * 60) * days), raid: Math.round(SO.guild.raidCoinPer * (0.3 + r() * 2) * days), me: false }));
  return [...others, { name: s.acc.name, pts: s.guild.weekContrib, raid: Math.round(s.guild.raid), me: true }].sort((a, b) => b.pts + b.raid / 1e5 - (a.pts + a.raid / 1e5));
}
/** 길드 레이드 보스: 이번 주 공용 체력 (길드원 피해 + 내 피해) */
export function guildBoss(s: Save = S, now = Date.now()) {
  const g = guildOf(s);
  const board = guildBoard(s, now);
  const dealt = board.reduce((a, x) => a + x.raid, 0);
  const max = SO.guild.raidHp * (g ? 1 + g.lv * 0.1 : 1);
  return { name: `길드 레이드 · ${CHAPTER_MOBS[hashStr(weekOf(now)) % CHAPTER_MOBS.length].boss}`, max, hp: Math.max(0, max - dealt) };
}
export const GUILD_SHOP = [
  { id: 'g_book', name: '스킬북 ×2', price: 60, give: { skillBook: 2 } },
  { id: 'g_tier', name: '티어 재료 ×5', price: 120, give: { tierMat: 5 } },
  { id: 'g_dust', name: '별가루 ×100', price: 150, give: { stardust: 100 } },
  { id: 'g_awaken', name: '각성석 ×5', price: 100, give: { awakenStone: 5 } },
];
export function buyGuild(id: string, s: Save = S): 'ok' | 'poor' | 'none' {
  const it = GUILD_SHOP.find((x) => x.id === id);
  if (!it) return 'none';
  if (!spend('guildCoin', it.price, s)) return 'poor';
  for (const [k, v] of Object.entries(it.give)) addCur(k, v, s);
  return 'ok';
}

// ───────── 친구 (하루 선물) ─────────
/** 친구 찾기: 추천 AI 원정대 (실유저는 서버 연결 뒤) */
export const friendSuggest = (s: Save = S) => CHAT_NAMES.filter((n) => !s.friends.list.includes(n));
export const friendLv = (name: string) => 5 + (hashStr(name) % 40);
function rollFriends(s: Save, now: number) {
  if (s.friends.day !== dayKey(now)) ((s.friends.day = dayKey(now)), (s.friends.sent = []), (s.friends.got = 0));
}
export function addFriend(name: string, s: Save = S) {
  if (s.friends.list.length >= SO.friends.max || s.friends.list.includes(name)) return false;
  s.friends.list.push(name);
  return true;
}
export const removeFriend = (name: string, s: Save = S) => (s.friends.list = s.friends.list.filter((x) => x !== name));
/** 선물 보내기 (하루 한 번씩) — AI 친구는 바로 답례(행동력)를 보냄 · 하루 받기 상한 */
export function gift(name: string, s: Save = S, now = Date.now()): 'ok' | 'done' | 'none' {
  rollFriends(s, now);
  if (!s.friends.list.includes(name)) return 'none';
  if (s.friends.sent.includes(name)) return 'done';
  s.friends.sent.push(name);
  track('gift', 1, s, now);
  if (s.friends.got < SO.friends.giftsPerDay) {
    s.friends.got++;
    s.sta.n += SO.friends.gift;
  }
  return 'ok';
}

// ───────── 랭킹 · 랭커 칭호 ─────────
export type Board = 'tower' | 'world' | 'arena' | 'guild';
export const BOARD_NAME: Record<Board, string> = { tower: '도전의 탑 (주간)', world: '월드 보스 (주간)', arena: '결투장', guild: '길드 기여 (주간)' };
export const TITLE_OF: Record<Board, string> = { tower: '탑 정복자', world: '별 사냥꾼', arena: '결투의 별', guild: '길드의 기둥' };
export function board(b: Board, s: Save = S, now = Date.now()): { name: string; v: number; me: boolean }[] {
  if (b === 'world') return worldBoard(s, now).map((x) => ({ name: x.name, v: x.dmg, me: x.me }));
  if (b === 'guild') return guildBoard(s, now).map((x) => ({ name: x.name, v: x.pts, me: x.me }));
  const r = seeded(hashStr(b + weekOf(now)));
  const ais = CHAT_NAMES.map((name) => ({ name, v: b === 'tower' ? Math.round(3 + r() * 40) : Math.round(950 + r() * 600), me: false }));
  const mine = b === 'tower' ? (s.tower.week === weekOf(now) ? s.tower.weekBest : 0) : s.arena.score;
  return [...ais, { name: s.acc.name, v: mine, me: true }].sort((a, c) => c.v - a.v);
}
/** 내 순위 (0 = 없음 · 길드에 안 들었을 때) */
export const myRank = (b: Board, s: Save = S, now = Date.now()) => board(b, s, now).findIndex((x) => x.me) + 1;
/** 랭킹 상위면 칭호를 얻음 (한 번 얻으면 계속) → 새로 얻은 칭호 */
export function checkTitles(s: Save = S, now = Date.now()): string[] {
  const got: string[] = [];
  for (const b of Object.keys(BOARD_NAME) as Board[]) {
    const t = TITLE_OF[b];
    const val = board(b, s, now).find((x) => x.me)?.v ?? 0;
    if (val > 0 && myRank(b, s, now) <= SO.titleTop && !s.titles.own.includes(t)) {
      s.titles.own.push(t);
      got.push(t);
    }
  }
  return got;
}

// ───────── 우편 ─────────
export function addMail(s: Save, from: string, title: string, body: string, give: Record<string, number> = {}, now = Date.now()): Mail {
  const m: Mail = { id: s.mail.next++, from, title, body, give, at: now, got: !Object.keys(give).length };
  s.mail.list.unshift(m);
  s.mail.list = s.mail.list.slice(0, 50);
  return m;
}
export function claimMail(id: number, s: Save = S): boolean {
  const m = s.mail.list.find((x) => x.id === id);
  if (!m || m.got) return false;
  m.got = true;
  for (const [k, v] of Object.entries(m.give)) addCur(k, v, s);
  return true;
}
export const mailUnread = (s: Save = S) => s.mail.list.filter((m) => !m.got).length;
export const claimAllMail = (s: Save = S) => s.mail.list.filter((m) => !m.got).reduce((a, m) => a + (claimMail(m.id, s) ? 1 : 0), 0);

// ───────── 채팅 (월드 · 길드) ─────────
const pick = <X>(xs: X[]) => xs[Math.floor(Math.random() * xs.length)];
/** AI 한 줄 (말투는 「체크인」 chat_pool 참고 · 랭커면 칭호) */
export function aiLine(ch: ChatLine['ch'] = 'world', s: Save = S, now = Date.now()): ChatLine {
  const g = guildOf(s);
  const name = ch === 'guild' && g && !g.real ? pick(g.members) : pick(CHAT_NAMES);
  const text = pick(CHAT_LINES).replace('{영웅}', pick(HEROES).name).replace('{보스}', pick(CHAPTER_MOBS.slice(0, 3)).boss).replace('{장}', '숲 동굴');
  const top = (Object.keys(BOARD_NAME) as Board[]).find((b) => board(b, s, now).slice(0, SO.titleTop).some((x) => x.name === name));
  return { name, text, at: now, ch, title: top ? TITLE_OF[top] : undefined };
}
export function pushChat(line: ChatLine, s: Save = S) {
  s.chat.push(line);
  if (s.chat.length > SO.chat.keep) s.chat.splice(0, s.chat.length - SO.chat.keep);
}
/** 내 글 (1단계: 이 기기에만 · 서버가 붙으면 cloud.ts가 올림) */
export function sendChat(text: string, ch: ChatLine['ch'] = 'world', s: Save = S, now = Date.now()): ChatLine | null {
  const t = text.trim().slice(0, SO.chat.max);
  if (!t || (ch === 'guild' && !s.guild.id)) return null;
  const line: ChatLine = { name: s.acc.name, text: t, at: now, me: true, ch, title: s.titles.on ?? undefined };
  pushChat(line, s);
  return line;
}
