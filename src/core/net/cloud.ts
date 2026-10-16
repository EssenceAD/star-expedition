// 계정 · 클라우드 저장 · 채팅 서버 (STAR_PLAN_v2 §4 · ROADMAP §9)
//  「체크인」과 같은 Supabase · 같은 계정: 아이디 → 아이디@players.legacy-of-adventure.app 로 로그인 (「체크인」 server.ts emailOf 그대로) · 게스트 = 익명 로그인
//  저장은 새 테이블 star_saves (supabase/star_expedition.sql — 형철이 적용) · 테이블이 없으면 「서버 준비 전」 = 이 기기 저장만
import { CONFIG } from '../../config';
import { sb } from './supabase';

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
