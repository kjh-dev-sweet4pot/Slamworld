-- 보딩패스 실시간 동기화 상태 (중복 실행 방지용 잠금)
create table if not exists sync_state (
  id text primary key,
  started_at timestamptz not null default 'epoch',
  finished_at timestamptz,
  ok boolean,
  message text
);
alter table sync_state enable row level security;
insert into sync_state (id) values ('boardingpass') on conflict do nothing;

-- 마지막 시작 후 min_gap 초가 지났으면 시작 시각을 찍고 true. 동시에 여러 요청이 와도 하나만 통과한다
create or replace function claim_sync(p_id text, min_gap int)
returns boolean language sql security definer set search_path = public as $$
  with u as (
    update sync_state set started_at = now()
    where id = p_id and started_at < now() - make_interval(secs => min_gap)
    returning 1
  )
  select exists (select 1 from u)
$$;
revoke all on function claim_sync(text, int) from public, anon, authenticated;
