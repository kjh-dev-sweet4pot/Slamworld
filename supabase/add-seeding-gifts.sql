-- 지점 무상 시딩: 약사가 「줬음」 체크한 기록 (요청 카드 × 인플루언서 핸들)
create table if not exists seeding_gifts (
  card_id text not null,
  handle text not null,
  given_at timestamptz not null default now(),
  primary key (card_id, handle)
);
alter table seeding_gifts enable row level security;

drop policy if exists seeding_gifts_read on seeding_gifts;
create policy seeding_gifts_read on seeding_gifts for select to anon, authenticated using (true);
drop policy if exists seeding_gifts_insert on seeding_gifts;
create policy seeding_gifts_insert on seeding_gifts for insert to anon, authenticated with check (true);
drop policy if exists seeding_gifts_delete on seeding_gifts;
create policy seeding_gifts_delete on seeding_gifts for delete to anon, authenticated using (true);
