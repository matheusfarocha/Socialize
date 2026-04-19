create or replace function public.can_insert_order_items(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders
    where id = p_order_id
  );
$$;

grant execute on function public.can_insert_order_items(uuid) to anon, authenticated;

drop policy if exists public_can_insert_order_items on public.order_items;

create policy public_can_insert_order_items
  on public.order_items
  for insert
  to anon, authenticated
  with check (public.can_insert_order_items(order_id));
