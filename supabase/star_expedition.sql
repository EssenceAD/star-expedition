-- 「별의 원정대」 서버 테이블 (STAR_PLAN_v2 §4 · ROADMAP §9: 「체크인」과 같은 Supabase · 같은 계정(게스트 포함) · 저장은 별도 테이블)
-- 적용: 형철이 Supabase SQL 편집기에서 이 파일을 한 번 실행 (여러 번 실행해도 안전 · 「체크인」 테이블은 건드리지 않음)
-- 클라이언트: src/core/net/cloud.ts — 테이블이 없으면 「서버 준비 전」으로 알리고 이 기기 저장만 씀

-- 1) 클라우드 저장: 계정(auth.users) 하나에 한 줄
create table if not exists public.star_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version int not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.star_saves enable row level security;
drop policy if exists star_saves_own_select on public.star_saves;
create policy star_saves_own_select on public.star_saves for select using (auth.uid() = user_id);
drop policy if exists star_saves_own_insert on public.star_saves;
create policy star_saves_own_insert on public.star_saves for insert with check (auth.uid() = user_id);
drop policy if exists star_saves_own_update on public.star_saves;
create policy star_saves_own_update on public.star_saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists star_saves_own_delete on public.star_saves;
create policy star_saves_own_delete on public.star_saves for delete using (auth.uid() = user_id);

-- 2) 월드·길드 채팅 (로그인한 사람만 쓰고 읽음 · 글 60자 · 이름 16자)
create table if not exists public.star_chat (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ch text not null check (ch in ('world', 'guild')),
  guild text,
  name text not null check (char_length(name) between 1 and 16),
  title text check (title is null or char_length(title) <= 16),
  text text not null check (char_length(text) between 1 and 60),
  created_at timestamptz not null default now()
);
create index if not exists star_chat_recent on public.star_chat (created_at desc);
alter table public.star_chat enable row level security;
drop policy if exists star_chat_read on public.star_chat;
create policy star_chat_read on public.star_chat for select to authenticated using (created_at > now() - interval '3 days');
drop policy if exists star_chat_write on public.star_chat;
create policy star_chat_write on public.star_chat for insert to authenticated with check (auth.uid() = user_id);
