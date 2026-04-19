do $$
declare
  v_venue_id uuid;
  v_fallback_image text := 'https://cdn.pixabay.com/photo/2021/02/06/19/29/pancakes-5989136_1280.jpg';
begin
  select v.id
  into v_venue_id
  from public.venues v
  left join auth.users u on u.id = v.owner_id
  where v.slug = 'demo-venue'
     or u.email = 'demo@socialize.app'
  order by case when v.slug = 'demo-venue' then 0 else 1 end
  limit 1;

  if v_venue_id is null then
    raise notice 'Skipping missing menu image fill because no demo venue was found.';
    return;
  end if;

  update public.menu_items mi
  set image_path = case
    when mi.name = 'hi' then 'https://cdn.pixabay.com/photo/2023/08/07/03/59/coffee-8174279_640.jpg'
    else v_fallback_image
  end
  where mi.category_id in (
    select mc.id
    from public.menu_categories mc
    where mc.venue_id = v_venue_id
  )
  and (
    mi.image_path is null
    or btrim(mi.image_path) = ''
  );
end
$$;
