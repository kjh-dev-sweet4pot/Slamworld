-- 요청사항: C-level · 실무자가 우리 회사에 바라는 것 (제목 + 내용)
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  requester text not null check (requester in ('C-level', '실무자')),
  requester_name text,
  created_at timestamptz not null default now()
);
alter table requests add column if not exists requester_name text;
alter table requests enable row level security;

drop policy if exists requests_read on requests;
create policy requests_read on requests for select to anon, authenticated using (true);
-- 쓰기·삭제는 서버(service role)만. 공개 anon 키로는 읽기만
drop policy if exists requests_insert on requests;
drop policy if exists requests_delete on requests;
