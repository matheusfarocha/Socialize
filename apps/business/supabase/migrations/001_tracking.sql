-- Socialize tracking tables
-- Run this in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- 1. QR scans: one row per distinct scan session.
create table if not exists public.qr_scans (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  session_id text not null,
  table_identifier text,
  scanned_at timestamptz not null default now(),
  user_agent text
);

create index if not exists qr_scans_venue_scanned_at_idx
  on public.qr_scans (venue_id, scanned_at desc);

create unique index if not exists qr_scans_venue_session_unique
  on public.qr_scans (venue_id, session_id);

-- 2. Customer sessions: time spent per table.
create table if not exists public.customer_sessions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  table_identifier text,
  session_id text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  order_total numeric(10,2),
  order_count integer not null default 0
);

create index if not exists customer_sessions_venue_started_at_idx
  on public.customer_sessions (venue_id, started_at desc);

create index if not exists customer_sessions_venue_table_idx
  on public.customer_sessions (venue_id, table_identifier);

-- RLS: anon clients can insert + read their own tracking rows.
alter table public.qr_scans enable row level security;
alter table public.customer_sessions enable row level security;

drop policy if exists qr_scans_anon_all on public.qr_scans;
create policy qr_scans_anon_all on public.qr_scans
  for all to anon, authenticated using (true) with check (true);

drop policy if exists customer_sessions_anon_all on public.customer_sessions;
create policy customer_sessions_anon_all on public.customer_sessions
  for all to anon, authenticated using (true) with check (true);
