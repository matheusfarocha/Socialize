create extension if not exists pgcrypto;

create or replace function public.format_presence_coordinate(value double precision)
returns text
language sql
immutable
as $$
  select case
    when value is null then 'na'
    else to_char(round(value::numeric, 2), 'FM999999990.00')
  end;
$$;

create or replace function public.build_presence_table_id_sql(
  zone_id uuid,
  identifier text,
  pos_x double precision,
  pos_y double precision
)
returns text
language sql
immutable
as $$
  select zone_id::text
    || ':' || identifier
    || ':' || public.format_presence_coordinate(pos_x)
    || ':' || public.format_presence_coordinate(pos_y);
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  initials text not null default '',
  occupation text not null default '',
  interests text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles
  alter column initials set default '',
  alter column occupation set default '',
  alter column interests set default '',
  alter column created_at set default now();

create table if not exists public.cafe_tables (
  id text primary key,
  label text not null,
  capacity integer not null default 0,
  current_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.cafe_tables
  alter column capacity set default 0,
  alter column current_count set default 0,
  alter column created_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cafe_tables_capacity_check'
      and conrelid = 'public.cafe_tables'::regclass
  ) then
    alter table public.cafe_tables
      add constraint cafe_tables_capacity_check check (capacity >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cafe_tables_current_count_check'
      and conrelid = 'public.cafe_tables'::regclass
  ) then
    alter table public.cafe_tables
      add constraint cafe_tables_current_count_check check (current_count >= 0);
  end if;
end
$$;

create table if not exists public.active_users (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null,
  user_id uuid not null,
  session_id uuid not null,
  initials text not null,
  occupation text not null,
  interests text not null,
  table_id text,
  status text not null default 'active',
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.active_users
  add column if not exists venue_id uuid,
  add column if not exists user_id uuid,
  add column if not exists session_id uuid,
  add column if not exists initials text,
  add column if not exists occupation text,
  add column if not exists interests text,
  add column if not exists table_id text,
  add column if not exists status text,
  add column if not exists last_seen timestamptz,
  add column if not exists created_at timestamptz;

alter table public.active_users
  alter column venue_id set not null,
  alter column user_id set not null,
  alter column session_id set not null,
  alter column initials set not null,
  alter column occupation set not null,
  alter column interests set not null,
  alter column status set default 'active',
  alter column status set not null,
  alter column last_seen set default now(),
  alter column last_seen set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'active_users_status_check'
      and conrelid = 'public.active_users'::regclass
  ) then
    alter table public.active_users
      add constraint active_users_status_check check (status in ('active', 'idle'));
  end if;
end
$$;

create unique index if not exists active_users_session_id_idx
  on public.active_users (session_id);

create index if not exists active_users_user_id_idx
  on public.active_users (user_id);

create index if not exists active_users_last_seen_idx
  on public.active_users (last_seen);

create index if not exists active_users_venue_id_idx
  on public.active_users (venue_id);

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

drop trigger if exists sync_cafe_table_counts_on_active_users on public.active_users;

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

do $$
begin
  if to_regclass('public.tables') is not null then
    insert into public.cafe_tables (id, label, capacity, current_count)
    select
      public.build_presence_table_id_sql(t.zone_id, t.identifier, t.pos_x, t.pos_y),
      t.identifier,
      greatest(coalesce(t.seat_count, 0), 0),
      0
    from public.tables t
    on conflict (id) do update
    set
      label = excluded.label,
      capacity = excluded.capacity;
  end if;
end
$$;

update public.cafe_tables
set current_count = 0;

with live_counts as (
  select table_id, count(*)::integer as occupant_count
  from public.active_users
  where table_id is not null
  group by table_id
)
update public.cafe_tables cafe_tables
set current_count = live_counts.occupant_count
from live_counts
where cafe_tables.id = live_counts.table_id;

alter table public.profiles enable row level security;
alter table public.active_users enable row level security;
alter table public.cafe_tables enable row level security;

grant select, insert, update on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.active_users to anon, authenticated;
grant select on public.cafe_tables to anon, authenticated;
grant execute on function public.cleanup_active_users() to anon, authenticated;

drop policy if exists "profiles are readable by everyone" on public.profiles;
create policy "profiles are readable by everyone"
on public.profiles
for select
using (true);

drop policy if exists "profiles can be created by qr sessions" on public.profiles;
create policy "profiles can be created by qr sessions"
on public.profiles
for insert
with check (true);

drop policy if exists "profiles can be updated by qr sessions" on public.profiles;
create policy "profiles can be updated by qr sessions"
on public.profiles
for update
using (true)
with check (true);

drop policy if exists "active users are readable by everyone" on public.active_users;
create policy "active users are readable by everyone"
on public.active_users
for select
using (true);

drop policy if exists "active users can be inserted by qr sessions" on public.active_users;
create policy "active users can be inserted by qr sessions"
on public.active_users
for insert
with check (true);

drop policy if exists "active users can be updated by qr sessions" on public.active_users;
create policy "active users can be updated by qr sessions"
on public.active_users
for update
using (true)
with check (true);

drop policy if exists "active users can be deleted by qr sessions" on public.active_users;
create policy "active users can be deleted by qr sessions"
on public.active_users
for delete
using (true);

drop policy if exists "cafe tables are readable by everyone" on public.cafe_tables;
create policy "cafe tables are readable by everyone"
on public.cafe_tables
for select
using (true);

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'active_users'
  ) then
    execute 'alter publication supabase_realtime add table public.active_users';
  end if;
end
$$;

-- Cleanup query for a scheduled job or edge function:
-- select public.cleanup_active_users();
