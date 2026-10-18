// 계정 · 클라우드 저장 · 채팅 서버 (STAR_PLAN_v2 §4 · ROADMAP §9)
//  「체크인」과 같은 Supabase · 같은 계정: 아이디 → 아이디@players.legacy-of-adventure.app 로 로그인 (「체크인」 server.ts emailOf 그대로) · 게스트 = 익명 로그인
//  저장은 새 테이블 star_saves (supabase/star_expedition.sql — 형철이 적용) · 테이블이 없으면 「서버 준비 전」 = 이 기기 저장만
import { CONFIG } from '../../config';
import { sb } from './supabase';
import { getPref, setPref } from '../save';

const C = CONFIG.social.cloud;
export const emailOf = (loginId: string) => `${loginId}@${C.emailDomain}`;
export interface Who {
  uid: string;
  guest: boolean;
  /** 「체크인」 아이디 (게스트면 null) */
  login: string | null;
}
/** 개발·자동 시험 브라우저에선 진짜 서버에 쓰지 않는다 (「체크인」 ensureGuest와 같은 규칙) */
const sandbox = () => import.meta.env.DEV || import.meta.env.MODE === 'test' || (typeof navigator !== 'undefined' && navigator.webdriver);
const why = (e: { code?: string; message?: string } | null | undefined) =>
  !e ? null : e.code === '42P01' || /relation .* does not exist/.test(e.message ?? '') ? '서버 준비 전이에요 (star_expedition.sql 적용 필요)' : (e.message ?? '서버 오류');

export async function who(): Promise<Who | null> {
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getUser();
    const u = data.user;
    if (!u) return null;
    const login = u.email?.endsWith(`@${C.emailDomain}`) ? u.email.split('@')[0] : null;
    return { uid: u.id, guest: !!u.is_anonymous || !login, login };
  } catch {
    return null;
  }
}
/** 「체크인」 아이디·비밀번호로 로그인 → 실패 이유 (null = 됨) */
export async function login(loginId: string, pw: string): Promise<string | null> {
  if (!sb) return '서버 설정이 없어요';
  if (!loginId || !pw) return '아이디와 비밀번호를 넣어 주세요';
  const { error } = await sb.auth.signInWithPassword({ email: emailOf(loginId.trim()), password: pw });
  return error ? '아이디나 비밀번호가 맞지 않아요' : null;
}
export async function guest(): Promise<string | null> {
  if (!sb) return '서버 설정이 없어요';
  if (sandbox()) return '시험 브라우저에선 게스트 계정을 만들지 않아요';
  const { error } = await sb.auth.signInAnonymously();
  return error ? '게스트 로그인이 꺼져 있어요' : null;
}
/** 회원가입 (「체크인」과 같은 계정 규칙 · profiles · 복구 코드) → { err } 또는 { code: 복구 코드 }
 *  게스트로 들어와 있으면 그 계정을 그대로 정식 계정으로 바꿈(클라우드 저장 유지) · 아니면 새로 만듦 · 서버는 메일 인증 없이 바로 로그인 */
export async function signup(loginId: string, pw: string, nick: string): Promise<{ err: string } | { code: string }> {
  if (!sb) return { err: '서버 설정이 없어요' };
  if (sandbox()) return { err: '시험 브라우저에선 가입하지 않아요' };
  const id = loginId.trim().toLowerCase();
  const nm = nick.trim();
  if (!/^[a-z0-9_]{4,16}$/.test(id) || id.startsWith(C.guestPrefix)) return { err: '아이디는 영어 소문자·숫자·_ 4~16자예요' };
  if (pw.length < 6 || pw.length > 72) return { err: '비밀번호는 6자 이상이에요' };
  if ([...nm].length < 2 || [...nm].length > 8) return { err: '닉네임은 2~8자예요' };
  const taken = async (col: string, v: string) => !!(await sb!.from('profiles').select('id').eq(col, v).maybeSingle()).data;
  if (await taken('login_id', id)) return { err: '이미 있는 아이디예요' };
  if (await taken('nickname', nm)) return { err: '이미 있는 닉네임이에요' };
  const w = await who();
  const email = emailOf(id);
  const r = w?.guest ? await sb.auth.updateUser({ email, password: pw }) : await sb.auth.signUp({ email, password: pw });
  if (r.error) return { err: /registered|exists/i.test(r.error.message) ? '이미 있는 아이디예요' : '가입에 실패했어요 · 잠시 뒤 다시 해 주세요' };
  const uid = r.data.user?.id;
  if (!uid) return { err: '가입에 실패했어요 · 잠시 뒤 다시 해 주세요' };
  const { error: pe } = await sb.from('profiles').insert({ id: uid, login_id: id, nickname: nm });
  if (pe) return { err: '계정은 만들었는데 프로필 저장에 실패했어요 · 제보해 주세요' };
  // 복구 코드 (비밀번호를 잊으면 「체크인」 계정 찾기에 씀 · 서버엔 해시만)
  const code = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('').replace(/(.{4})(?!$)/g, '$1-');
  await sb.rpc('set_recovery_code', { p_code: code });
  return { code };
}
export async function logout() {
  await sb?.auth.signOut();
}
/** 「체크인」 닉네임 (profiles · 없으면 null) */
export async function nickname(uid: string): Promise<string | null> {
  if (!sb) return null;
  const { data } = await sb.from('profiles').select('nickname').eq('id', uid).maybeSingle();
  return (data?.nickname as string | undefined) ?? null;
}
/** 클라우드에 올리기 → 실패 이유 */
export async function push(data: { version: number; savedAt: number }): Promise<string | null> {
  if (!sb) return '서버 설정이 없어요';
  if (sandbox()) return '시험 브라우저에선 올리지 않아요';
  const w = await who();
  if (!w) return '로그인이 필요해요';
  const { error } = await sb.from('star_saves').upsert({ user_id: w.uid, version: data.version, data, updated_at: new Date(data.savedAt).toISOString() });
  return why(error);
}
/** 클라우드에서 받기 → 저장 · 시각 (없으면 null) · 실패면 문자열 */
export async function pull(): Promise<{ data: unknown; at: number } | null | string> {
  if (!sb) return '서버 설정이 없어요';
  const w = await who();
  if (!w) return '로그인이 필요해요';
  const { data, error } = await sb.from('star_saves').select('data,updated_at').eq('user_id', w.uid).maybeSingle();
  if (error) return why(error)!;
  return data ? { data: data.data, at: Date.parse(data.updated_at as string) } : null;
}
/** 채팅 올리기 (로그인했을 때만 · 실패해도 이 기기엔 남음) */
export async function postChat(line: { ch: 'world' | 'guild'; guild: string | null; name: string; title?: string; text: string }): Promise<string | null> {
  if (!sb || sandbox()) return '이 기기에만';
  if (!(await who())) return '로그인하면 다른 사람에게도 보여요';
  const { error } = await sb.from('star_chat').insert({ ch: line.ch, guild: line.guild, name: line.name.slice(0, 16), title: line.title ?? null, text: line.text.slice(0, 60) });
  return why(error);
}
/** 최근 채팅 (실유저) */
export async function recentChat(since: number): Promise<{ name: string; title: string | null; text: string; at: number; ch: 'world' | 'guild'; guild: string | null }[]> {
  if (!sb || sandbox() || !(await who())) return [];
  const { data, error } = await sb.from('star_chat').select('name,title,text,created_at,ch,guild').gt('created_at', new Date(since).toISOString()).order('created_at', { ascending: true }).limit(30);
  if (error || !data) return [];
  return data.map((r) => ({ name: r.name as string, title: (r.title as string | null) ?? null, text: r.text as string, at: Date.parse(r.created_at as string), ch: r.ch as 'world' | 'guild', guild: (r.guild as string | null) ?? null }));
}

// ───────── 제보·건의 편지 · 운영자 답장 · 오류 기록 (「체크인」 bug_letters · my_letter_replies · log_events 그대로 · 같은 서버) ─────────
//  우리 게임 편지는 본문 앞에 [W.I.N.D] — 운영자 제보함(체크인 opsbox)에서 같이 보이고, 답장은 이 머리표가 붙은 것만 받아요
export const LETTER_TAG = '[W.I.N.D]';
/** 이 기기의 무작위 번호 (개인정보 아님) */
export function device(): string {
  let d = getPref<string>('device', '');
  if (!d) setPref('device', (d = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 36)));
  return d;
}
export type LetterResult = 'ok' | 'limit' | 'busy' | 'nosrv' | 'fail';
/** 편지 보내기: 로그인(체크인 계정)이면 답장 받음 · 아니면 손님 편지(기기 번호·화면 정보만) */
export async function sendLetter(kind: string, text: string, ver: string): Promise<LetterResult> {
  if (!sb || sandbox()) return 'fail';
  const body = `${LETTER_TAG}[${kind}] ${text}`;
  const w = await who();
  if (w && !w.guest) {
    const { error } = await sb.from('bug_letters').insert({ user_id: w.uid, body: body.slice(0, 1000), app_version: `wind-v${ver}` });
    return error ? 'fail' : 'ok';
  }
  const info = `${innerWidth}x${innerHeight}@${Math.round(devicePixelRatio * 100) / 100} ${matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse'}`;
  const { error } = await sb.from('bug_letters').insert({ user_id: null, body: body.slice(0, 320), app_version: `wind-v${ver}`.slice(0, 32), guest_device: device(), guest_info: info.slice(0, 120) });
  if (!error) return 'ok';
  const m = `${error.code ?? ''} ${error.message ?? ''}`;
  if (/guest_daily_limit/.test(m)) return 'limit';
  if (/guest_busy/.test(m)) return 'busy';
  if (/PGRST204|42703|42501|row-level security/.test(m)) return 'nosrv';
  return 'fail';
}
export interface ReplyRow { id: number; body: string; reply: string; status: string; ver_fixed: string | null; replied_at: string | null }
/** 내 편지에 온 답장 (우리 게임 편지만) */
export async function myReplies(): Promise<ReplyRow[]> {
  if (!sb || sandbox()) return [];
  const w = await who();
  if (!w || w.guest) return [];
  const { data, error } = await sb.rpc('my_letter_replies');
  if (error || !Array.isArray(data)) return [];
  return (data as ReplyRow[]).filter((r) => r.body?.startsWith(LETTER_TAG) && r.reply);
}
export async function markRepliesRead(ids: number[]) {
  if (!sb || !ids.length) return;
  await sb.rpc('mark_replies_read', { p_ids: ids });
}
/** 잡히지 않은 오류 → 서버 기록 (버전 앞에 wind- · 실패하면 버림 · 게임을 막지 않음) */
export function logEvents(events: { name: string; props: Record<string, unknown> }[], ver: string) {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined;
  if (!url || !key || sandbox() || !events.length) return;
  try {
    void fetch(`${url}/rest/v1/rpc/log_events`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_device: device(), p_version: `wind-${ver}`, p_session: SESSION, p_events: events }),
    }).catch(() => {});
  } catch {
    /* 버림 */
  }
}
const SESSION = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
