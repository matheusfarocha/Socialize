do $$
declare
  v_venue_id uuid;
  v_zone_id uuid;
  v_coffee_category_id uuid;
  v_brunch_category_id uuid;
  v_bakery_category_id uuid;
  v_house_latte_id uuid;
  v_masala_chai_id uuid;
  v_espresso_tonic_id uuid;
  v_avocado_toast_id uuid;
  v_burrata_omelette_id uuid;
  v_citrus_pancakes_id uuid;
  v_pistachio_croissant_id uuid;
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
    raise notice 'Skipping demo dashboard seed because no demo venue was found.';
    return;
  end if;

  select z.id
  into v_zone_id
  from public.zones z
  where z.venue_id = v_venue_id
  order by coalesce(z.sort_order, 0), z.id
  limit 1;

  if v_zone_id is null then
    insert into public.zones (
      venue_id,
      name,
      sort_order,
      floor_width,
      floor_height,
      floor_outline
    )
    values (
      v_venue_id,
      'Main Floor',
      0,
      900,
      620,
      '[
        {"x": 42, "y": 40},
        {"x": 862, "y": 40},
        {"x": 862, "y": 576},
        {"x": 42, "y": 576}
      ]'::jsonb
    )
    returning id into v_zone_id;
  else
    update public.zones
    set
      floor_width = coalesce(floor_width, 900),
      floor_height = coalesce(floor_height, 620),
      floor_outline = coalesce(
        floor_outline,
        '[
          {"x": 42, "y": 40},
          {"x": 862, "y": 40},
          {"x": 862, "y": 576},
          {"x": 42, "y": 576}
        ]'::jsonb
      )
    where id = v_zone_id;
  end if;

  if not exists (
    select 1
    from public.tables
    where zone_id = v_zone_id
  ) then
    insert into public.tables (
      zone_id,
      identifier,
      seat_count,
      shape,
      pos_x,
      pos_y,
      rotation
    )
    values
      (v_zone_id, 'T01', 2, 'round', 180, 150, 0),
      (v_zone_id, 'T02', 4, 'square', 420, 150, 0),
      (v_zone_id, 'T03', 2, 'round', 660, 150, 0),
      (v_zone_id, 'T04', 4, 'square', 180, 360, 0),
      (v_zone_id, 'T05', 6, 'rect', 430, 360, 0),
      (v_zone_id, 'T06', 2, 'round', 690, 360, 0);
  end if;

  select id
  into v_coffee_category_id
  from public.menu_categories
  where venue_id = v_venue_id
    and name = 'Coffee'
  limit 1;

  if v_coffee_category_id is null then
    insert into public.menu_categories (venue_id, name, sort_order)
    values (v_venue_id, 'Coffee', 0)
    returning id into v_coffee_category_id;
  end if;

  select id
  into v_brunch_category_id
  from public.menu_categories
  where venue_id = v_venue_id
    and name = 'Brunch'
  limit 1;

  if v_brunch_category_id is null then
    insert into public.menu_categories (venue_id, name, sort_order)
    values (v_venue_id, 'Brunch', 1)
    returning id into v_brunch_category_id;
  end if;

  select id
  into v_bakery_category_id
  from public.menu_categories
  where venue_id = v_venue_id
    and name = 'Bakery'
  limit 1;

  if v_bakery_category_id is null then
    insert into public.menu_categories (venue_id, name, sort_order)
    values (v_venue_id, 'Bakery', 2)
    returning id into v_bakery_category_id;
  end if;

  select id
  into v_house_latte_id
  from public.menu_items
  where category_id = v_coffee_category_id
    and name = 'House Latte'
  limit 1;

  if v_house_latte_id is null then
    insert into public.menu_items (
      category_id,
      name,
      description,
      price,
      is_active,
      image_path,
      sort_order
    )
    values (
      v_coffee_category_id,
      'House Latte',
      'Double ristretto, jaggery foam, and a bright orange zest finish.',
      6.50,
      true,
      null,
      0
    )
    returning id into v_house_latte_id;
  end if;

  select id
  into v_masala_chai_id
  from public.menu_items
  where category_id = v_coffee_category_id
    and name = 'Masala Chai'
  limit 1;

  if v_masala_chai_id is null then
    insert into public.menu_items (
      category_id,
      name,
      description,
      price,
      is_active,
      image_path,
      sort_order
    )
    values (
      v_coffee_category_id,
      'Masala Chai',
      'Slow brewed Assam tea with cardamom, ginger, and steamed milk.',
      5.00,
      true,
      null,
      1
    )
    returning id into v_masala_chai_id;
  end if;

  select id
  into v_espresso_tonic_id
  from public.menu_items
  where category_id = v_coffee_category_id
    and name = 'Espresso Tonic'
  limit 1;

  if v_espresso_tonic_id is null then
    insert into public.menu_items (
      category_id,
      name,
      description,
      price,
      is_active,
      image_path,
      sort_order
    )
    values (
      v_coffee_category_id,
      'Espresso Tonic',
      'Citrus-forward tonic finished with a chilled single origin espresso shot.',
      5.50,
      true,
      null,
      2
    )
    returning id into v_espresso_tonic_id;
  end if;

  select id
  into v_avocado_toast_id
  from public.menu_items
  where category_id = v_brunch_category_id
    and name = 'Avocado Toast'
  limit 1;

  if v_avocado_toast_id is null then
    insert into public.menu_items (
      category_id,
      name,
      description,
      price,
      is_active,
      image_path,
      sort_order
    )
    values (
      v_brunch_category_id,
      'Avocado Toast',
      'Sourdough, lemon ricotta, smashed avocado, radish, and chili crunch.',
      13.00,
      true,
      null,
      0
    )
    returning id into v_avocado_toast_id;
  end if;

  select id
  into v_burrata_omelette_id
  from public.menu_items
  where category_id = v_brunch_category_id
    and name = 'Burrata Omelette'
  limit 1;

  if v_burrata_omelette_id is null then
    insert into public.menu_items (
      category_id,
      name,
      description,
      price,
      is_active,
      image_path,
      sort_order
    )
    values (
      v_brunch_category_id,
      'Burrata Omelette',
      'Soft eggs folded with burrata, basil oil, and roasted cherry tomatoes.',
      15.00,
      true,
      null,
      1
    )
    returning id into v_burrata_omelette_id;
  end if;

  select id
  into v_citrus_pancakes_id
  from public.menu_items
  where category_id = v_brunch_category_id
    and name = 'Citrus Pancakes'
  limit 1;

  if v_citrus_pancakes_id is null then
    insert into public.menu_items (
      category_id,
      name,
      description,
      price,
      is_active,
      image_path,
      sort_order
    )
    values (
      v_brunch_category_id,
      'Citrus Pancakes',
      'Buttermilk stack with whipped creme fraiche and burnt orange syrup.',
      14.50,
      true,
      null,
      2
    )
    returning id into v_citrus_pancakes_id;
  end if;

  select id
  into v_pistachio_croissant_id
  from public.menu_items
  where category_id = v_bakery_category_id
    and name = 'Pistachio Croissant'
  limit 1;

  if v_pistachio_croissant_id is null then
    insert into public.menu_items (
      category_id,
      name,
      description,
      price,
      is_active,
      image_path,
      sort_order
    )
    values (
      v_bakery_category_id,
      'Pistachio Croissant',
      'Laminated pastry filled with pistachio frangipane and sea salt glaze.',
      6.00,
      true,
      null,
      0
    )
    returning id into v_pistachio_croissant_id;
  end if;

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
  values
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1001',
      'Mila Carter',
      'mila.carter@example.com',
      'Window-side coffee catch-up.',
      'dine_in',
      'T01',
      'card',
      'Mila Carter •••• 4242',
      25.00,
      2.00,
      27.00,
      'completed',
      timezone('utc', now()) - interval '13 days 2 hours',
      timezone('utc', now()) - interval '13 days 1 hour 18 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1002',
      'Leo Grant',
      'leo.grant@example.com',
      'Pickup on the way to the studio.',
      'pickup',
      null,
      'cash',
      'Pay At Venue',
      18.00,
      1.44,
      19.44,
      'completed',
      timezone('utc', now()) - interval '12 days 4 hours',
      timezone('utc', now()) - interval '12 days 3 hours 23 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1003',
      'Sana Patel',
      'sana.patel@example.com',
      'Birthday breakfast stop.',
      'dine_in',
      'T03',
      'card',
      'Sana Patel •••• 1188',
      33.00,
      2.64,
      35.64,
      'completed',
      timezone('utc', now()) - interval '10 days 3 hours',
      timezone('utc', now()) - interval '10 days 1 hour 55 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1004',
      'Avery Cole',
      'avery.cole@example.com',
      '',
      'pickup',
      null,
      'apple_pay',
      'Apple Pay',
      20.50,
      1.64,
      22.14,
      'completed',
      timezone('utc', now()) - interval '9 days 5 hours',
      timezone('utc', now()) - interval '9 days 4 hours 17 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1005',
      'Jordan Kim',
      'jordan.kim@example.com',
      'Guest cancelled before firing the order.',
      'dine_in',
      'T02',
      'card',
      'Jordan Kim •••• 5501',
      11.00,
      0.88,
      11.88,
      'cancelled',
      timezone('utc', now()) - interval '8 days 2 hours',
      timezone('utc', now()) - interval '8 days 1 hour 45 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1006',
      'Noah Bennett',
      'noah.bennett@example.com',
      '',
      'dine_in',
      'T04',
      'card',
      'Noah Bennett •••• 6034',
      19.50,
      1.56,
      21.06,
      'completed',
      timezone('utc', now()) - interval '7 days 4 hours',
      timezone('utc', now()) - interval '7 days 3 hours 26 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1007',
      'Priya Shah',
      'priya.shah@example.com',
      'Extra napkins in the bag.',
      'pickup',
      null,
      'cash',
      'Pay At Venue',
      17.00,
      1.36,
      18.36,
      'completed',
      timezone('utc', now()) - interval '6 days 6 hours',
      timezone('utc', now()) - interval '6 days 5 hours 32 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1008',
      'Elena Torres',
      'elena.torres@example.com',
      '',
      'dine_in',
      'T02',
      'card',
      'Elena Torres •••• 7712',
      21.50,
      1.72,
      23.22,
      'completed',
      timezone('utc', now()) - interval '5 days 2 hours',
      timezone('utc', now()) - interval '5 days 59 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1009',
      'Marcus Reed',
      'marcus.reed@example.com',
      '',
      'pickup',
      null,
      'apple_pay',
      'Apple Pay',
      27.00,
      2.16,
      29.16,
      'completed',
      timezone('utc', now()) - interval '4 days 4 hours',
      timezone('utc', now()) - interval '4 days 2 hours 41 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1010',
      'Grace Liu',
      'grace.liu@example.com',
      'Table requested near the plant wall.',
      'dine_in',
      'T03',
      'card',
      'Grace Liu •••• 9018',
      18.50,
      1.48,
      19.98,
      'completed',
      timezone('utc', now()) - interval '2 days 3 hours',
      timezone('utc', now()) - interval '2 days 1 hour 52 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1011',
      'Owen Price',
      'owen.price@example.com',
      '',
      'pickup',
      null,
      'card',
      'Owen Price •••• 8824',
      19.00,
      1.52,
      20.52,
      'completed',
      timezone('utc', now()) - interval '1 day 4 hours',
      timezone('utc', now()) - interval '1 day 3 hours 8 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1012',
      'Harper Wells',
      'harper.wells@example.com',
      'Allergy note: no chili crunch.',
      'dine_in',
      'T01',
      'card',
      'Harper Wells •••• 1443',
      19.50,
      1.56,
      21.06,
      'submitted',
      timezone('utc', now()) - interval '42 minutes',
      timezone('utc', now()) - interval '42 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1013',
      'Ivy Brooks',
      'ivy.brooks@example.com',
      'Pickup guest is already on the way.',
      'pickup',
      null,
      'apple_pay',
      'Apple Pay',
      21.00,
      1.68,
      22.68,
      'preparing',
      timezone('utc', now()) - interval '31 minutes',
      timezone('utc', now()) - interval '24 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1014',
      'Theo Nguyen',
      'theo.nguyen@example.com',
      '',
      'dine_in',
      'T04',
      'cash',
      'Pay At Venue',
      17.00,
      1.36,
      18.36,
      'ready',
      timezone('utc', now()) - interval '26 minutes',
      timezone('utc', now()) - interval '11 minutes'
    ),
    (
      gen_random_uuid(),
      v_venue_id,
      'DSH-1015',
      'Nina Flores',
      'nina.flores@example.com',
      '',
      'pickup',
      null,
      'card',
      'Nina Flores •••• 3104',
      20.50,
      1.64,
      22.14,
      'completed',
      timezone('utc', now()) - interval '2 hours 8 minutes',
      timezone('utc', now()) - interval '47 minutes'
    )
  on conflict (public_order_code) do nothing;

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
  select
    o.id,
    case seed.item_name
      when 'House Latte' then v_house_latte_id
      when 'Masala Chai' then v_masala_chai_id
      when 'Espresso Tonic' then v_espresso_tonic_id
      when 'Avocado Toast' then v_avocado_toast_id
      when 'Burrata Omelette' then v_burrata_omelette_id
      when 'Citrus Pancakes' then v_citrus_pancakes_id
      when 'Pistachio Croissant' then v_pistachio_croissant_id
      else null
    end,
    seed.item_name,
    seed.description,
    seed.category_name,
    seed.unit_price,
    seed.quantity,
    seed.line_total
  from (
    values
      ('DSH-1001', 'House Latte', 'Double ristretto, jaggery foam, and a bright orange zest finish.', 'Coffee', 6.50, 2, 13.00),
      ('DSH-1001', 'Pistachio Croissant', 'Laminated pastry filled with pistachio frangipane and sea salt glaze.', 'Bakery', 6.00, 2, 12.00),
      ('DSH-1002', 'Avocado Toast', 'Sourdough, lemon ricotta, smashed avocado, radish, and chili crunch.', 'Brunch', 13.00, 1, 13.00),
      ('DSH-1002', 'Masala Chai', 'Slow brewed Assam tea with cardamom, ginger, and steamed milk.', 'Coffee', 5.00, 1, 5.00),
      ('DSH-1003', 'Citrus Pancakes', 'Buttermilk stack with whipped creme fraiche and burnt orange syrup.', 'Brunch', 14.50, 1, 14.50),
      ('DSH-1003', 'House Latte', 'Double ristretto, jaggery foam, and a bright orange zest finish.', 'Coffee', 6.50, 1, 6.50),
      ('DSH-1003', 'Pistachio Croissant', 'Laminated pastry filled with pistachio frangipane and sea salt glaze.', 'Bakery', 6.00, 2, 12.00),
      ('DSH-1004', 'Burrata Omelette', 'Soft eggs folded with burrata, basil oil, and roasted cherry tomatoes.', 'Brunch', 15.00, 1, 15.00),
      ('DSH-1004', 'Espresso Tonic', 'Citrus-forward tonic finished with a chilled single origin espresso shot.', 'Coffee', 5.50, 1, 5.50),
      ('DSH-1005', 'Masala Chai', 'Slow brewed Assam tea with cardamom, ginger, and steamed milk.', 'Coffee', 5.00, 1, 5.00),
      ('DSH-1005', 'Pistachio Croissant', 'Laminated pastry filled with pistachio frangipane and sea salt glaze.', 'Bakery', 6.00, 1, 6.00),
      ('DSH-1006', 'Avocado Toast', 'Sourdough, lemon ricotta, smashed avocado, radish, and chili crunch.', 'Brunch', 13.00, 1, 13.00),
      ('DSH-1006', 'House Latte', 'Double ristretto, jaggery foam, and a bright orange zest finish.', 'Coffee', 6.50, 1, 6.50),
      ('DSH-1007', 'Pistachio Croissant', 'Laminated pastry filled with pistachio frangipane and sea salt glaze.', 'Bakery', 6.00, 2, 12.00),
      ('DSH-1007', 'Masala Chai', 'Slow brewed Assam tea with cardamom, ginger, and steamed milk.', 'Coffee', 5.00, 1, 5.00),
      ('DSH-1008', 'Burrata Omelette', 'Soft eggs folded with burrata, basil oil, and roasted cherry tomatoes.', 'Brunch', 15.00, 1, 15.00),
      ('DSH-1008', 'House Latte', 'Double ristretto, jaggery foam, and a bright orange zest finish.', 'Coffee', 6.50, 1, 6.50),
      ('DSH-1009', 'Citrus Pancakes', 'Buttermilk stack with whipped creme fraiche and burnt orange syrup.', 'Brunch', 14.50, 1, 14.50),
      ('DSH-1009', 'House Latte', 'Double ristretto, jaggery foam, and a bright orange zest finish.', 'Coffee', 6.50, 1, 6.50),
      ('DSH-1009', 'Pistachio Croissant', 'Laminated pastry filled with pistachio frangipane and sea salt glaze.', 'Bakery', 6.00, 1, 6.00),
      ('DSH-1010', 'Avocado Toast', 'Sourdough, lemon ricotta, smashed avocado, radish, and chili crunch.', 'Brunch', 13.00, 1, 13.00),
      ('DSH-1010', 'Espresso Tonic', 'Citrus-forward tonic finished with a chilled single origin espresso shot.', 'Coffee', 5.50, 1, 5.50),
      ('DSH-1011', 'House Latte', 'Double ristretto, jaggery foam, and a bright orange zest finish.', 'Coffee', 6.50, 2, 13.00),
      ('DSH-1011', 'Pistachio Croissant', 'Laminated pastry filled with pistachio frangipane and sea salt glaze.', 'Bakery', 6.00, 1, 6.00),
      ('DSH-1012', 'Avocado Toast', 'Sourdough, lemon ricotta, smashed avocado, radish, and chili crunch.', 'Brunch', 13.00, 1, 13.00),
      ('DSH-1012', 'House Latte', 'Double ristretto, jaggery foam, and a bright orange zest finish.', 'Coffee', 6.50, 1, 6.50),
      ('DSH-1013', 'Citrus Pancakes', 'Buttermilk stack with whipped creme fraiche and burnt orange syrup.', 'Brunch', 14.50, 1, 14.50),
      ('DSH-1013', 'House Latte', 'Double ristretto, jaggery foam, and a bright orange zest finish.', 'Coffee', 6.50, 1, 6.50),
      ('DSH-1014', 'Masala Chai', 'Slow brewed Assam tea with cardamom, ginger, and steamed milk.', 'Coffee', 5.00, 1, 5.00),
      ('DSH-1014', 'Pistachio Croissant', 'Laminated pastry filled with pistachio frangipane and sea salt glaze.', 'Bakery', 6.00, 2, 12.00),
      ('DSH-1015', 'Burrata Omelette', 'Soft eggs folded with burrata, basil oil, and roasted cherry tomatoes.', 'Brunch', 15.00, 1, 15.00),
      ('DSH-1015', 'Espresso Tonic', 'Citrus-forward tonic finished with a chilled single origin espresso shot.', 'Coffee', 5.50, 1, 5.50)
  ) as seed(order_code, item_name, description, category_name, unit_price, quantity, line_total)
  join public.orders o on o.public_order_code = seed.order_code
  where not exists (
    select 1
    from public.order_items oi
    where oi.order_id = o.id
  );
end
$$;
