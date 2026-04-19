create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  public_order_code text not null unique,
  customer_name text not null,
  customer_email text not null,
  notes text not null default '',
  fulfillment_type text not null check (fulfillment_type in ('dine_in', 'pickup')),
  table_identifier text,
  payment_method text not null check (payment_method in ('card', 'apple_pay', 'cash')),
  payment_label text,
  subtotal numeric(10, 2) not null default 0,
  service_fee numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  status text not null default 'submitted' check (status in ('submitted', 'preparing', 'ready', 'completed', 'cancelled')),
  placed_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name text not null,
  description text not null default '',
  category_name text not null default 'Other',
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0),
  line_total numeric(10, 2) not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists orders_venue_id_idx on public.orders (venue_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_placed_at_idx on public.orders (placed_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_menu_item_id_idx on public.order_items (menu_item_id);

create or replace function public.set_order_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.create_order_with_items(
  p_order_id uuid,
  p_venue_id uuid,
  p_public_order_code text,
  p_customer_name text,
  p_customer_email text,
  p_notes text,
  p_fulfillment_type text,
  p_table_identifier text,
  p_payment_method text,
  p_payment_label text,
  p_subtotal numeric,
  p_service_fee numeric,
  p_total numeric,
  p_placed_at timestamptz,
  p_items jsonb
)
returns void
language plpgsql
as $$
declare
  item jsonb;
begin
  insert into public.orders (
    id,
    venue_id,
    public_order_code,
    customer_name,
    customer_email,
    notes,
    fulfillment_type,
    table_identifier,
    payment_method,
    payment_label,
    subtotal,
    service_fee,
    total,
    status,
    placed_at,
    updated_at
  )
  values (
    p_order_id,
    p_venue_id,
    p_public_order_code,
    p_customer_name,
    p_customer_email,
    coalesce(p_notes, ''),
    p_fulfillment_type,
    p_table_identifier,
    p_payment_method,
    p_payment_label,
    p_subtotal,
    p_service_fee,
    p_total,
    'submitted',
    coalesce(p_placed_at, timezone('utc', now())),
    coalesce(p_placed_at, timezone('utc', now()))
  );

  for item in
    select value
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    insert into public.order_items (
      order_id,
      menu_item_id,
      name,
      description,
      category_name,
      unit_price,
      quantity,
      line_total
    )
    values (
      p_order_id,
      nullif(item ->> 'menu_item_id', '')::uuid,
      item ->> 'name',
      coalesce(item ->> 'description', ''),
      coalesce(item ->> 'category_name', 'Other'),
      coalesce((item ->> 'unit_price')::numeric, 0),
      greatest(coalesce((item ->> 'quantity')::integer, 1), 1),
      coalesce((item ->> 'line_total')::numeric, 0)
    );
  end loop;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_order_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

grant select, insert, update on public.orders to anon, authenticated;
grant select, insert on public.order_items to anon, authenticated;
grant execute on function public.create_order_with_items(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  timestamptz,
  jsonb
) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'public_can_insert_orders'
  ) then
    create policy public_can_insert_orders
      on public.orders
      for insert
      to anon, authenticated
      with check (venue_id is not null and public_order_code <> '');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'owners_can_read_orders'
  ) then
    create policy owners_can_read_orders
      on public.orders
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.venues v
          where v.id = venue_id
            and v.owner_id = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'owners_can_update_orders'
  ) then
    create policy owners_can_update_orders
      on public.orders
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.venues v
          where v.id = venue_id
            and v.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.venues v
          where v.id = venue_id
            and v.owner_id = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_items'
      and policyname = 'public_can_insert_order_items'
  ) then
    create policy public_can_insert_order_items
      on public.order_items
      for insert
      to anon, authenticated
      with check (
        exists (
          select 1
          from public.orders o
          where o.id = order_id
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'order_items'
      and policyname = 'owners_can_read_order_items'
  ) then
    create policy owners_can_read_order_items
      on public.order_items
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.orders o
          join public.venues v on v.id = o.venue_id
          where o.id = order_id
            and v.owner_id = auth.uid()
        )
      );
  end if;
end
$$;
