// 「용사님, 체크인하실게요~」 src/net/server.ts (연결 부분) 에서 복사해 온 모듈 (별의 원정대용으로 import만 고침)
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined;
/** 같은 세계 → 같은 Supabase 프로젝트 (공개 키) · 설정이 없으면 null = 로컬로만 */
export const sb: SupabaseClient | null =
  URL && KEY ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'star-expedition-auth' } }) : null;
export const online = () => !!sb;
