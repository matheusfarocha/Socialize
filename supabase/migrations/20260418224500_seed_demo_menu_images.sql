do $$
declare
  v_venue_id uuid;
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
    raise notice 'Skipping demo menu image seed because no demo venue was found.';
    return;
  end if;

  update public.menu_items mi
  set image_path = case mi.name
    when 'House Latte' then 'https://cdn.pixabay.com/photo/2019/02/26/15/19/latte-4020310_1280.jpg'
    when 'Masala Chai' then 'https://cdn.pixabay.com/photo/2015/12/27/17/31/chai-latte-1110053_1280.jpg'
    when 'Espresso Tonic' then 'https://cdn.pixabay.com/photo/2023/08/07/03/59/coffee-8174279_640.jpg'
    when 'Avocado Toast' then 'https://cdn.pixabay.com/photo/2025/05/23/17/38/avocado-9618266_1280.jpg'
    when 'Burrata Omelette' then 'https://cdn.pixabay.com/photo/2020/02/17/17/42/omelette-4852807_1280.jpg'
    when 'Citrus Pancakes' then 'https://cdn.pixabay.com/photo/2021/02/06/19/29/pancakes-5989136_1280.jpg'
    when 'Pistachio Croissant' then 'https://cdn.pixabay.com/photo/2024/08/25/13/27/croissant-8996468_1280.jpg'
    else mi.image_path
  end
  where mi.category_id in (
    select mc.id
    from public.menu_categories mc
    where mc.venue_id = v_venue_id
  )
  and mi.name in (
    'House Latte',
    'Masala Chai',
    'Espresso Tonic',
    'Avocado Toast',
    'Burrata Omelette',
    'Citrus Pancakes',
    'Pistachio Croissant'
  );
end
$$;
