create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  initials text not null default '',
  occupation text not null default '',
  interests text not null default '',
  created_at timestamptz not null default now()
);

create table public.cafe_tables (
  id text primary key,
  label text not null,
  capacity integer not null check (capacity >= 0),
  current_count integer not null default 0 check (current_count >= 0),
  created_at timestamptz not null default now()
);

create table public.active_users (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null,
  user_id uuid not null,
  session_id uuid not null,
  initials text not null,
  occupation text not null,
  interests text not null,
  table_id text,
  status text not null default 'active' check (status in ('active', 'idle')),
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index active_users_session_id_idx on public.active_users (session_id);
create index active_users_user_id_idx on public.active_users (user_id);
create index active_users_last_seen_idx on public.active_users (last_seen);
create index active_users_venue_id_idx on public.active_users (venue_id);

create or replace function public.sync_cafe_table_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('delete', 'update') and old.table_id is not null then
    update public.cafe_tables
    set current_count = greatest(current_count - 1, 0)
    where id = old.table_id;
  end if;

  if tg_op in ('insert', 'update') and new.table_id is not null then
    update public.cafe_tables
    set current_count = current_count + 1
    where id = new.table_id;
  end if;

  if tg_op = 'delete' then
    return old;
  end if;

  return new;
end;
$$;

create trigger sync_cafe_table_counts_on_active_users
after insert or update of table_id or delete on public.active_users
for each row
execute function public.sync_cafe_table_counts();

create or replace function public.cleanup_active_users()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed_count integer;
begin
  with deleted_rows as (
    delete from public.active_users
    where last_seen < now() - interval '30 seconds'
    returning 1
  )
  select count(*)
  into removed_count
  from deleted_rows;

  return coalesce(removed_count, 0);
end;
$$;

alter table public.profiles enable row level security;
alter table public.active_users enable row level security;
alter table public.cafe_tables enable row level security;

grant select, insert, update on public.profiles to anon, authenticated;
grant select, insert, update on public.active_users to anon, authenticated;
grant select on public.cafe_tables to anon, authenticated;
grant execute on function public.cleanup_active_users() to anon, authenticated;

create policy "profiles are readable by everyone"
on public.profiles
for select
using (true);

create policy "profiles can be created by qr sessions"
on public.profiles
for insert
with check (true);

create policy "profiles can be updated by qr sessions"
on public.profiles
for update
using (true)
with check (true);

create policy "active users are readable by everyone"
on public.active_users
for select
using (true);

create policy "active users can be inserted by qr sessions"
on public.active_users
for insert
with check (true);

create policy "active users can be updated by qr sessions"
on public.active_users
for update
using (true)
with check (true);

create policy "cafe tables are readable by everyone"
on public.cafe_tables
for select
using (true);

alter publication supabase_realtime add table public.active_users;

-- Cleanup query for a scheduled job or edge function:
-- select public.cleanup_active_users();
