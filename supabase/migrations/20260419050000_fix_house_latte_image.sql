update public.menu_items
set image_path = 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&h=400&fit=crop'
where name = 'House Latte'
  and image_path is not null;
