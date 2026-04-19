create extension if not exists "moddatetime" with schema "extensions";

drop extension if exists "pg_net";

drop trigger if exists "sync_cafe_table_counts_on_active_users" on "public"."active_users";

drop policy "active users are readable by everyone" on "public"."active_users";

drop policy "active users can be inserted by qr sessions" on "public"."active_users";

drop policy "active users can be updated by qr sessions" on "public"."active_users";

drop policy "cafe tables are readable by everyone" on "public"."cafe_tables";

drop policy "profiles are readable by everyone" on "public"."profiles";

drop policy "profiles can be created by qr sessions" on "public"."profiles";

drop policy "profiles can be updated by qr sessions" on "public"."profiles";

revoke delete on table "public"."active_users" from "anon";

revoke insert on table "public"."active_users" from "anon";

revoke references on table "public"."active_users" from "anon";

revoke select on table "public"."active_users" from "anon";

revoke trigger on table "public"."active_users" from "anon";

revoke truncate on table "public"."active_users" from "anon";

revoke update on table "public"."active_users" from "anon";

revoke delete on table "public"."active_users" from "authenticated";

revoke insert on table "public"."active_users" from "authenticated";

revoke references on table "public"."active_users" from "authenticated";

revoke select on table "public"."active_users" from "authenticated";

revoke trigger on table "public"."active_users" from "authenticated";

revoke truncate on table "public"."active_users" from "authenticated";

revoke update on table "public"."active_users" from "authenticated";

revoke delete on table "public"."active_users" from "service_role";

revoke insert on table "public"."active_users" from "service_role";

revoke references on table "public"."active_users" from "service_role";

revoke select on table "public"."active_users" from "service_role";

revoke trigger on table "public"."active_users" from "service_role";

revoke truncate on table "public"."active_users" from "service_role";

revoke update on table "public"."active_users" from "service_role";

revoke delete on table "public"."cafe_tables" from "anon";

revoke insert on table "public"."cafe_tables" from "anon";

revoke references on table "public"."cafe_tables" from "anon";

revoke select on table "public"."cafe_tables" from "anon";

revoke trigger on table "public"."cafe_tables" from "anon";

revoke truncate on table "public"."cafe_tables" from "anon";

revoke update on table "public"."cafe_tables" from "anon";

revoke delete on table "public"."cafe_tables" from "authenticated";

revoke insert on table "public"."cafe_tables" from "authenticated";

revoke references on table "public"."cafe_tables" from "authenticated";

revoke select on table "public"."cafe_tables" from "authenticated";

revoke trigger on table "public"."cafe_tables" from "authenticated";

revoke truncate on table "public"."cafe_tables" from "authenticated";

revoke update on table "public"."cafe_tables" from "authenticated";

revoke delete on table "public"."cafe_tables" from "service_role";

revoke insert on table "public"."cafe_tables" from "service_role";

revoke references on table "public"."cafe_tables" from "service_role";

revoke select on table "public"."cafe_tables" from "service_role";

revoke trigger on table "public"."cafe_tables" from "service_role";

revoke truncate on table "public"."cafe_tables" from "service_role";

revoke update on table "public"."cafe_tables" from "service_role";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke select on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke references on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke trigger on table "public"."profiles" from "service_role";

revoke truncate on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

alter table "public"."active_users" drop constraint "active_users_status_check";

alter table "public"."cafe_tables" drop constraint "cafe_tables_capacity_check";

alter table "public"."cafe_tables" drop constraint "cafe_tables_current_count_check";

drop function if exists "public"."cleanup_active_users"();

drop function if exists "public"."sync_cafe_table_counts"();

alter table "public"."active_users" drop constraint "active_users_pkey";

alter table "public"."cafe_tables" drop constraint "cafe_tables_pkey";

alter table "public"."profiles" drop constraint "profiles_pkey";

drop index if exists "public"."active_users_last_seen_idx";

drop index if exists "public"."active_users_pkey";

drop index if exists "public"."active_users_session_id_idx";

drop index if exists "public"."active_users_user_id_idx";

drop index if exists "public"."active_users_venue_id_idx";

drop index if exists "public"."cafe_tables_pkey";

drop index if exists "public"."profiles_pkey";

drop table "public"."active_users";

drop table "public"."cafe_tables";

drop table "public"."profiles";


  create table "public"."customer_orders" (
    "id" uuid not null default gen_random_uuid(),
    "venue_id" uuid not null,
    "session_id" text,
    "table_identifier" text,
    "customer_name" text,
    "customer_email" text,
    "fulfillment_type" text,
    "subtotal" numeric(10,2) not null default 0,
    "service_fee" numeric(10,2) not null default 0,
    "total" numeric(10,2) not null default 0,
    "item_count" integer not null default 0,
    "items" jsonb not null default '[]'::jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."customer_orders" enable row level security;


  create table "public"."customer_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "venue_id" uuid not null,
    "table_identifier" text,
    "session_id" text not null,
    "started_at" timestamp with time zone not null default now(),
    "ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "order_total" numeric(10,2),
    "order_count" integer not null default 0
      );


alter table "public"."customer_sessions" enable row level security;


  create table "public"."menu_categories" (
    "id" uuid not null default gen_random_uuid(),
    "venue_id" uuid not null,
    "name" text not null,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."menu_categories" enable row level security;


  create table "public"."menu_items" (
    "id" uuid not null default gen_random_uuid(),
    "category_id" uuid not null,
    "name" text not null,
    "description" text not null default ''::text,
    "price" numeric(10,2) not null,
    "is_active" boolean not null default true,
    "image_path" text,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."menu_items" enable row level security;


  create table "public"."order_items" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "menu_item_id" uuid,
    "name" text not null,
    "description" text not null default ''::text,
    "category_name" text not null default 'Other'::text,
    "unit_price" numeric(10,2) not null,
    "quantity" integer not null,
    "line_total" numeric(10,2) not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."order_items" enable row level security;


  create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "venue_id" uuid not null,
    "public_order_code" text not null,
    "customer_name" text not null,
    "customer_email" text not null,
    "notes" text not null default ''::text,
    "fulfillment_type" text not null,
    "table_identifier" text,
    "payment_method" text not null,
    "payment_label" text,
    "subtotal" numeric(10,2) not null default 0,
    "service_fee" numeric(10,2) not null default 0,
    "total" numeric(10,2) not null default 0,
    "status" text not null default 'submitted'::text,
    "placed_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."orders" enable row level security;


  create table "public"."qr_scans" (
    "id" uuid not null default gen_random_uuid(),
    "venue_id" uuid not null,
    "session_id" text not null,
    "table_identifier" text,
    "scanned_at" timestamp with time zone not null default now(),
    "user_agent" text
      );


alter table "public"."qr_scans" enable row level security;


  create table "public"."structural_elements" (
    "id" uuid not null default gen_random_uuid(),
    "zone_id" uuid not null,
    "element_type" text not null,
    "label" text not null default ''::text,
    "pos_x" real not null default 50,
    "pos_y" real not null default 50,
    "width" real not null default 10,
    "height" real not null default 10,
    "rotation" real not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "size_w" integer,
    "size_h" integer
      );


alter table "public"."structural_elements" enable row level security;


  create table "public"."tables" (
    "id" uuid not null default gen_random_uuid(),
    "zone_id" uuid not null,
    "identifier" text not null,
    "seat_count" integer not null default 2,
    "shape" text not null default 'round'::text,
    "table_type" text not null default 'standard'::text,
    "is_reservable" boolean not null default true,
    "is_ada_accessible" boolean not null default false,
    "pos_x" real not null default 50,
    "pos_y" real not null default 50,
    "width" real not null default 10,
    "height" real not null default 10,
    "rotation" real not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."tables" enable row level security;


  create table "public"."venues" (
    "id" uuid not null default gen_random_uuid(),
    "owner_id" uuid not null,
    "slug" text not null,
    "name" text not null,
    "branch_name" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."venues" enable row level security;


  create table "public"."zones" (
    "id" uuid not null default gen_random_uuid(),
    "venue_id" uuid not null,
    "name" text not null,
    "sort_order" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "floor_width" real not null default 800,
    "floor_height" real not null default 600,
    "floor_outline" jsonb not null default '[{"x": 0, "y": 0}, {"x": 100, "y": 0}, {"x": 100, "y": 100}, {"x": 0, "y": 100}]'::jsonb
      );


alter table "public"."zones" enable row level security;

CREATE UNIQUE INDEX customer_orders_pkey ON public.customer_orders USING btree (id);

CREATE UNIQUE INDEX customer_sessions_pkey ON public.customer_sessions USING btree (id);

CREATE INDEX customer_sessions_venue_started_at_idx ON public.customer_sessions USING btree (venue_id, started_at DESC);

CREATE INDEX customer_sessions_venue_table_idx ON public.customer_sessions USING btree (venue_id, table_identifier);

CREATE UNIQUE INDEX menu_categories_pkey ON public.menu_categories USING btree (id);

CREATE INDEX menu_categories_venue_id_idx ON public.menu_categories USING btree (venue_id, sort_order);

CREATE INDEX menu_items_category_id_idx ON public.menu_items USING btree (category_id, sort_order);

CREATE UNIQUE INDEX menu_items_pkey ON public.menu_items USING btree (id);

CREATE INDEX order_items_menu_item_id_idx ON public.order_items USING btree (menu_item_id);

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);

CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE INDEX orders_placed_at_idx ON public.orders USING btree (placed_at DESC);

CREATE UNIQUE INDEX orders_public_order_code_key ON public.orders USING btree (public_order_code);

CREATE INDEX orders_status_idx ON public.orders USING btree (status);

CREATE INDEX orders_venue_created_at_idx ON public.customer_orders USING btree (venue_id, created_at DESC);

CREATE INDEX orders_venue_id_idx ON public.orders USING btree (venue_id);

CREATE INDEX orders_venue_table_idx ON public.customer_orders USING btree (venue_id, table_identifier);

CREATE UNIQUE INDEX qr_scans_pkey ON public.qr_scans USING btree (id);

CREATE INDEX qr_scans_venue_scanned_at_idx ON public.qr_scans USING btree (venue_id, scanned_at DESC);

CREATE UNIQUE INDEX qr_scans_venue_session_unique ON public.qr_scans USING btree (venue_id, session_id);

CREATE UNIQUE INDEX structural_elements_pkey ON public.structural_elements USING btree (id);

CREATE INDEX structural_elements_zone_id_idx ON public.structural_elements USING btree (zone_id);

CREATE UNIQUE INDEX tables_pkey ON public.tables USING btree (id);

CREATE INDEX tables_zone_id_idx ON public.tables USING btree (zone_id);

CREATE UNIQUE INDEX venues_owner_id_unique ON public.venues USING btree (owner_id);

CREATE UNIQUE INDEX venues_pkey ON public.venues USING btree (id);

CREATE INDEX venues_slug_idx ON public.venues USING btree (slug);

CREATE UNIQUE INDEX venues_slug_unique ON public.venues USING btree (slug);

CREATE UNIQUE INDEX zones_pkey ON public.zones USING btree (id);

CREATE INDEX zones_venue_id_idx ON public.zones USING btree (venue_id, sort_order);

alter table "public"."customer_orders" add constraint "customer_orders_pkey" PRIMARY KEY using index "customer_orders_pkey";

alter table "public"."customer_sessions" add constraint "customer_sessions_pkey" PRIMARY KEY using index "customer_sessions_pkey";

alter table "public"."menu_categories" add constraint "menu_categories_pkey" PRIMARY KEY using index "menu_categories_pkey";

alter table "public"."menu_items" add constraint "menu_items_pkey" PRIMARY KEY using index "menu_items_pkey";

alter table "public"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."qr_scans" add constraint "qr_scans_pkey" PRIMARY KEY using index "qr_scans_pkey";

alter table "public"."structural_elements" add constraint "structural_elements_pkey" PRIMARY KEY using index "structural_elements_pkey";

alter table "public"."tables" add constraint "tables_pkey" PRIMARY KEY using index "tables_pkey";

alter table "public"."venues" add constraint "venues_pkey" PRIMARY KEY using index "venues_pkey";

alter table "public"."zones" add constraint "zones_pkey" PRIMARY KEY using index "zones_pkey";

alter table "public"."customer_orders" add constraint "customer_orders_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE not valid;

alter table "public"."customer_orders" validate constraint "customer_orders_venue_id_fkey";

alter table "public"."customer_sessions" add constraint "customer_sessions_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE not valid;

alter table "public"."customer_sessions" validate constraint "customer_sessions_venue_id_fkey";

alter table "public"."menu_categories" add constraint "menu_categories_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE not valid;

alter table "public"."menu_categories" validate constraint "menu_categories_venue_id_fkey";

alter table "public"."menu_items" add constraint "menu_items_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.menu_categories(id) ON DELETE CASCADE not valid;

alter table "public"."menu_items" validate constraint "menu_items_category_id_fkey";

alter table "public"."menu_items" add constraint "menu_items_price_positive" CHECK ((price >= (0)::numeric)) not valid;

alter table "public"."menu_items" validate constraint "menu_items_price_positive";

alter table "public"."order_items" add constraint "order_items_menu_item_id_fkey" FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE SET NULL not valid;

alter table "public"."order_items" validate constraint "order_items_menu_item_id_fkey";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_quantity_check" CHECK ((quantity > 0)) not valid;

alter table "public"."order_items" validate constraint "order_items_quantity_check";

alter table "public"."orders" add constraint "orders_fulfillment_type_check" CHECK ((fulfillment_type = ANY (ARRAY['dine_in'::text, 'pickup'::text]))) not valid;

alter table "public"."orders" validate constraint "orders_fulfillment_type_check";

alter table "public"."orders" add constraint "orders_payment_method_check" CHECK ((payment_method = ANY (ARRAY['card'::text, 'apple_pay'::text, 'cash'::text]))) not valid;

alter table "public"."orders" validate constraint "orders_payment_method_check";

alter table "public"."orders" add constraint "orders_public_order_code_key" UNIQUE using index "orders_public_order_code_key";

alter table "public"."orders" add constraint "orders_status_check" CHECK ((status = ANY (ARRAY['submitted'::text, 'preparing'::text, 'ready'::text, 'completed'::text, 'cancelled'::text]))) not valid;

alter table "public"."orders" validate constraint "orders_status_check";

alter table "public"."orders" add constraint "orders_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_venue_id_fkey";

alter table "public"."qr_scans" add constraint "qr_scans_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE not valid;

alter table "public"."qr_scans" validate constraint "qr_scans_venue_id_fkey";

alter table "public"."structural_elements" add constraint "structural_element_type_check" CHECK ((element_type = ANY (ARRAY['wall'::text, 'entrance'::text, 'bar'::text]))) not valid;

alter table "public"."structural_elements" validate constraint "structural_element_type_check";

alter table "public"."structural_elements" add constraint "structural_elements_zone_id_fkey" FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE not valid;

alter table "public"."structural_elements" validate constraint "structural_elements_zone_id_fkey";

alter table "public"."tables" add constraint "tables_seat_count_positive" CHECK ((seat_count > 0)) not valid;

alter table "public"."tables" validate constraint "tables_seat_count_positive";

alter table "public"."tables" add constraint "tables_shape_check" CHECK ((shape = ANY (ARRAY['round'::text, 'square'::text, 'long'::text, 'booth'::text]))) not valid;

alter table "public"."tables" validate constraint "tables_shape_check";

alter table "public"."tables" add constraint "tables_type_check" CHECK ((table_type = ANY (ARRAY['standard'::text, 'high-top'::text]))) not valid;

alter table "public"."tables" validate constraint "tables_type_check";

alter table "public"."tables" add constraint "tables_zone_id_fkey" FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE not valid;

alter table "public"."tables" validate constraint "tables_zone_id_fkey";

alter table "public"."venues" add constraint "venues_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."venues" validate constraint "venues_owner_id_fkey";

alter table "public"."venues" add constraint "venues_slug_format" CHECK ((slug ~ '^[a-z0-9][a-z0-9\-]*[a-z0-9]$'::text)) not valid;

alter table "public"."venues" validate constraint "venues_slug_format";

alter table "public"."venues" add constraint "venues_slug_unique" UNIQUE using index "venues_slug_unique";

alter table "public"."zones" add constraint "zones_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE not valid;

alter table "public"."zones" validate constraint "zones_venue_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_insert_order_items(p_order_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.orders
    where id = p_order_id
  );
$function$
;

CREATE OR REPLACE FUNCTION public.create_order_with_items(p_order_id uuid, p_venue_id uuid, p_public_order_code text, p_customer_name text, p_customer_email text, p_notes text, p_fulfillment_type text, p_table_identifier text, p_payment_method text, p_payment_label text, p_subtotal numeric, p_service_fee numeric, p_total numeric, p_placed_at timestamp with time zone, p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.set_order_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$function$
;

grant delete on table "public"."customer_orders" to "anon";

grant insert on table "public"."customer_orders" to "anon";

grant references on table "public"."customer_orders" to "anon";

grant select on table "public"."customer_orders" to "anon";

grant trigger on table "public"."customer_orders" to "anon";

grant truncate on table "public"."customer_orders" to "anon";

grant update on table "public"."customer_orders" to "anon";

grant delete on table "public"."customer_orders" to "authenticated";

grant insert on table "public"."customer_orders" to "authenticated";

grant references on table "public"."customer_orders" to "authenticated";

grant select on table "public"."customer_orders" to "authenticated";

grant trigger on table "public"."customer_orders" to "authenticated";

grant truncate on table "public"."customer_orders" to "authenticated";

grant update on table "public"."customer_orders" to "authenticated";

grant delete on table "public"."customer_orders" to "service_role";

grant insert on table "public"."customer_orders" to "service_role";

grant references on table "public"."customer_orders" to "service_role";

grant select on table "public"."customer_orders" to "service_role";

grant trigger on table "public"."customer_orders" to "service_role";

grant truncate on table "public"."customer_orders" to "service_role";

grant update on table "public"."customer_orders" to "service_role";

grant delete on table "public"."customer_sessions" to "anon";

grant insert on table "public"."customer_sessions" to "anon";

grant references on table "public"."customer_sessions" to "anon";

grant select on table "public"."customer_sessions" to "anon";

grant trigger on table "public"."customer_sessions" to "anon";

grant truncate on table "public"."customer_sessions" to "anon";

grant update on table "public"."customer_sessions" to "anon";

grant delete on table "public"."customer_sessions" to "authenticated";

grant insert on table "public"."customer_sessions" to "authenticated";

grant references on table "public"."customer_sessions" to "authenticated";

grant select on table "public"."customer_sessions" to "authenticated";

grant trigger on table "public"."customer_sessions" to "authenticated";

grant truncate on table "public"."customer_sessions" to "authenticated";

grant update on table "public"."customer_sessions" to "authenticated";

grant delete on table "public"."customer_sessions" to "service_role";

grant insert on table "public"."customer_sessions" to "service_role";

grant references on table "public"."customer_sessions" to "service_role";

grant select on table "public"."customer_sessions" to "service_role";

grant trigger on table "public"."customer_sessions" to "service_role";

grant truncate on table "public"."customer_sessions" to "service_role";

grant update on table "public"."customer_sessions" to "service_role";

grant delete on table "public"."menu_categories" to "anon";

grant insert on table "public"."menu_categories" to "anon";

grant references on table "public"."menu_categories" to "anon";

grant select on table "public"."menu_categories" to "anon";

grant trigger on table "public"."menu_categories" to "anon";

grant truncate on table "public"."menu_categories" to "anon";

grant update on table "public"."menu_categories" to "anon";

grant delete on table "public"."menu_categories" to "authenticated";

grant insert on table "public"."menu_categories" to "authenticated";

grant references on table "public"."menu_categories" to "authenticated";

grant select on table "public"."menu_categories" to "authenticated";

grant trigger on table "public"."menu_categories" to "authenticated";

grant truncate on table "public"."menu_categories" to "authenticated";

grant update on table "public"."menu_categories" to "authenticated";

grant delete on table "public"."menu_categories" to "service_role";

grant insert on table "public"."menu_categories" to "service_role";

grant references on table "public"."menu_categories" to "service_role";

grant select on table "public"."menu_categories" to "service_role";

grant trigger on table "public"."menu_categories" to "service_role";

grant truncate on table "public"."menu_categories" to "service_role";

grant update on table "public"."menu_categories" to "service_role";

grant delete on table "public"."menu_items" to "anon";

grant insert on table "public"."menu_items" to "anon";

grant references on table "public"."menu_items" to "anon";

grant select on table "public"."menu_items" to "anon";

grant trigger on table "public"."menu_items" to "anon";

grant truncate on table "public"."menu_items" to "anon";

grant update on table "public"."menu_items" to "anon";

grant delete on table "public"."menu_items" to "authenticated";

grant insert on table "public"."menu_items" to "authenticated";

grant references on table "public"."menu_items" to "authenticated";

grant select on table "public"."menu_items" to "authenticated";

grant trigger on table "public"."menu_items" to "authenticated";

grant truncate on table "public"."menu_items" to "authenticated";

grant update on table "public"."menu_items" to "authenticated";

grant delete on table "public"."menu_items" to "service_role";

grant insert on table "public"."menu_items" to "service_role";

grant references on table "public"."menu_items" to "service_role";

grant select on table "public"."menu_items" to "service_role";

grant trigger on table "public"."menu_items" to "service_role";

grant truncate on table "public"."menu_items" to "service_role";

grant update on table "public"."menu_items" to "service_role";

grant delete on table "public"."order_items" to "anon";

grant insert on table "public"."order_items" to "anon";

grant references on table "public"."order_items" to "anon";

grant select on table "public"."order_items" to "anon";

grant trigger on table "public"."order_items" to "anon";

grant truncate on table "public"."order_items" to "anon";

grant update on table "public"."order_items" to "anon";

grant delete on table "public"."order_items" to "authenticated";

grant insert on table "public"."order_items" to "authenticated";

grant references on table "public"."order_items" to "authenticated";

grant select on table "public"."order_items" to "authenticated";

grant trigger on table "public"."order_items" to "authenticated";

grant truncate on table "public"."order_items" to "authenticated";

grant update on table "public"."order_items" to "authenticated";

grant delete on table "public"."order_items" to "service_role";

grant insert on table "public"."order_items" to "service_role";

grant references on table "public"."order_items" to "service_role";

grant select on table "public"."order_items" to "service_role";

grant trigger on table "public"."order_items" to "service_role";

grant truncate on table "public"."order_items" to "service_role";

grant update on table "public"."order_items" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."qr_scans" to "anon";

grant insert on table "public"."qr_scans" to "anon";

grant references on table "public"."qr_scans" to "anon";

grant select on table "public"."qr_scans" to "anon";

grant trigger on table "public"."qr_scans" to "anon";

grant truncate on table "public"."qr_scans" to "anon";

grant update on table "public"."qr_scans" to "anon";

grant delete on table "public"."qr_scans" to "authenticated";

grant insert on table "public"."qr_scans" to "authenticated";

grant references on table "public"."qr_scans" to "authenticated";

grant select on table "public"."qr_scans" to "authenticated";

grant trigger on table "public"."qr_scans" to "authenticated";

grant truncate on table "public"."qr_scans" to "authenticated";

grant update on table "public"."qr_scans" to "authenticated";

grant delete on table "public"."qr_scans" to "service_role";

grant insert on table "public"."qr_scans" to "service_role";

grant references on table "public"."qr_scans" to "service_role";

grant select on table "public"."qr_scans" to "service_role";

grant trigger on table "public"."qr_scans" to "service_role";

grant truncate on table "public"."qr_scans" to "service_role";

grant update on table "public"."qr_scans" to "service_role";

grant delete on table "public"."structural_elements" to "anon";

grant insert on table "public"."structural_elements" to "anon";

grant references on table "public"."structural_elements" to "anon";

grant select on table "public"."structural_elements" to "anon";

grant trigger on table "public"."structural_elements" to "anon";

grant truncate on table "public"."structural_elements" to "anon";

grant update on table "public"."structural_elements" to "anon";

grant delete on table "public"."structural_elements" to "authenticated";

grant insert on table "public"."structural_elements" to "authenticated";

grant references on table "public"."structural_elements" to "authenticated";

grant select on table "public"."structural_elements" to "authenticated";

grant trigger on table "public"."structural_elements" to "authenticated";

grant truncate on table "public"."structural_elements" to "authenticated";

grant update on table "public"."structural_elements" to "authenticated";

grant delete on table "public"."structural_elements" to "service_role";

grant insert on table "public"."structural_elements" to "service_role";

grant references on table "public"."structural_elements" to "service_role";

grant select on table "public"."structural_elements" to "service_role";

grant trigger on table "public"."structural_elements" to "service_role";

grant truncate on table "public"."structural_elements" to "service_role";

grant update on table "public"."structural_elements" to "service_role";

grant delete on table "public"."tables" to "anon";

grant insert on table "public"."tables" to "anon";

grant references on table "public"."tables" to "anon";

grant select on table "public"."tables" to "anon";

grant trigger on table "public"."tables" to "anon";

grant truncate on table "public"."tables" to "anon";

grant update on table "public"."tables" to "anon";

grant delete on table "public"."tables" to "authenticated";

grant insert on table "public"."tables" to "authenticated";

grant references on table "public"."tables" to "authenticated";

grant select on table "public"."tables" to "authenticated";

grant trigger on table "public"."tables" to "authenticated";

grant truncate on table "public"."tables" to "authenticated";

grant update on table "public"."tables" to "authenticated";

grant delete on table "public"."tables" to "service_role";

grant insert on table "public"."tables" to "service_role";

grant references on table "public"."tables" to "service_role";

grant select on table "public"."tables" to "service_role";

grant trigger on table "public"."tables" to "service_role";

grant truncate on table "public"."tables" to "service_role";

grant update on table "public"."tables" to "service_role";

grant delete on table "public"."venues" to "anon";

grant insert on table "public"."venues" to "anon";

grant references on table "public"."venues" to "anon";

grant select on table "public"."venues" to "anon";

grant trigger on table "public"."venues" to "anon";

grant truncate on table "public"."venues" to "anon";

grant update on table "public"."venues" to "anon";

grant delete on table "public"."venues" to "authenticated";

grant insert on table "public"."venues" to "authenticated";

grant references on table "public"."venues" to "authenticated";

grant select on table "public"."venues" to "authenticated";

grant trigger on table "public"."venues" to "authenticated";

grant truncate on table "public"."venues" to "authenticated";

grant update on table "public"."venues" to "authenticated";

grant delete on table "public"."venues" to "service_role";

grant insert on table "public"."venues" to "service_role";

grant references on table "public"."venues" to "service_role";

grant select on table "public"."venues" to "service_role";

grant trigger on table "public"."venues" to "service_role";

grant truncate on table "public"."venues" to "service_role";

grant update on table "public"."venues" to "service_role";

grant delete on table "public"."zones" to "anon";

grant insert on table "public"."zones" to "anon";

grant references on table "public"."zones" to "anon";

grant select on table "public"."zones" to "anon";

grant trigger on table "public"."zones" to "anon";

grant truncate on table "public"."zones" to "anon";

grant update on table "public"."zones" to "anon";

grant delete on table "public"."zones" to "authenticated";

grant insert on table "public"."zones" to "authenticated";

grant references on table "public"."zones" to "authenticated";

grant select on table "public"."zones" to "authenticated";

grant trigger on table "public"."zones" to "authenticated";

grant truncate on table "public"."zones" to "authenticated";

grant update on table "public"."zones" to "authenticated";

grant delete on table "public"."zones" to "service_role";

grant insert on table "public"."zones" to "service_role";

grant references on table "public"."zones" to "service_role";

grant select on table "public"."zones" to "service_role";

grant trigger on table "public"."zones" to "service_role";

grant truncate on table "public"."zones" to "service_role";

grant update on table "public"."zones" to "service_role";


  create policy "orders_anon_all"
  on "public"."customer_orders"
  as permissive
  for all
  to anon, authenticated
using (true)
with check (true);



  create policy "customer_sessions_anon_all"
  on "public"."customer_sessions"
  as permissive
  for all
  to anon, authenticated
using (true)
with check (true);



  create policy "Menu categories are publicly readable"
  on "public"."menu_categories"
  as permissive
  for select
  to public
using (true);



  create policy "Owners can manage menu categories"
  on "public"."menu_categories"
  as permissive
  for all
  to public
using ((venue_id IN ( SELECT venues.id
   FROM public.venues
  WHERE (venues.owner_id = auth.uid()))))
with check ((venue_id IN ( SELECT venues.id
   FROM public.venues
  WHERE (venues.owner_id = auth.uid()))));



  create policy "Menu items are publicly readable"
  on "public"."menu_items"
  as permissive
  for select
  to public
using (true);



  create policy "Owners can manage menu items"
  on "public"."menu_items"
  as permissive
  for all
  to public
using ((category_id IN ( SELECT mc.id
   FROM (public.menu_categories mc
     JOIN public.venues v ON ((v.id = mc.venue_id)))
  WHERE (v.owner_id = auth.uid()))))
with check ((category_id IN ( SELECT mc.id
   FROM (public.menu_categories mc
     JOIN public.venues v ON ((v.id = mc.venue_id)))
  WHERE (v.owner_id = auth.uid()))));



  create policy "owners_can_read_order_items"
  on "public"."order_items"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.orders o
     JOIN public.venues v ON ((v.id = o.venue_id)))
  WHERE ((o.id = order_items.order_id) AND (v.owner_id = auth.uid())))));



  create policy "public_can_insert_order_items"
  on "public"."order_items"
  as permissive
  for insert
  to anon, authenticated
with check (public.can_insert_order_items(order_id));



  create policy "owners_can_read_orders"
  on "public"."orders"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.venues v
  WHERE ((v.id = orders.venue_id) AND (v.owner_id = auth.uid())))));



  create policy "owners_can_update_orders"
  on "public"."orders"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.venues v
  WHERE ((v.id = orders.venue_id) AND (v.owner_id = auth.uid())))))
with check ((EXISTS ( SELECT 1
   FROM public.venues v
  WHERE ((v.id = orders.venue_id) AND (v.owner_id = auth.uid())))));



  create policy "public_can_insert_orders"
  on "public"."orders"
  as permissive
  for insert
  to anon, authenticated
with check (((venue_id IS NOT NULL) AND (public_order_code <> ''::text)));



  create policy "qr_scans_anon_all"
  on "public"."qr_scans"
  as permissive
  for all
  to anon, authenticated
using (true)
with check (true);



  create policy "Owners can manage structural elements"
  on "public"."structural_elements"
  as permissive
  for all
  to public
using ((zone_id IN ( SELECT z.id
   FROM (public.zones z
     JOIN public.venues v ON ((v.id = z.venue_id)))
  WHERE (v.owner_id = auth.uid()))))
with check ((zone_id IN ( SELECT z.id
   FROM (public.zones z
     JOIN public.venues v ON ((v.id = z.venue_id)))
  WHERE (v.owner_id = auth.uid()))));



  create policy "Structural elements are publicly readable"
  on "public"."structural_elements"
  as permissive
  for select
  to public
using (true);



  create policy "Owners can manage tables"
  on "public"."tables"
  as permissive
  for all
  to public
using ((zone_id IN ( SELECT z.id
   FROM (public.zones z
     JOIN public.venues v ON ((v.id = z.venue_id)))
  WHERE (v.owner_id = auth.uid()))))
with check ((zone_id IN ( SELECT z.id
   FROM (public.zones z
     JOIN public.venues v ON ((v.id = z.venue_id)))
  WHERE (v.owner_id = auth.uid()))));



  create policy "Tables are publicly readable"
  on "public"."tables"
  as permissive
  for select
  to public
using (true);



  create policy "Owners can manage their venue"
  on "public"."venues"
  as permissive
  for all
  to public
using ((auth.uid() = owner_id))
with check ((auth.uid() = owner_id));



  create policy "Venues are publicly readable"
  on "public"."venues"
  as permissive
  for select
  to public
using (true);



  create policy "Owners can manage zones"
  on "public"."zones"
  as permissive
  for all
  to public
using ((venue_id IN ( SELECT venues.id
   FROM public.venues
  WHERE (venues.owner_id = auth.uid()))))
with check ((venue_id IN ( SELECT venues.id
   FROM public.venues
  WHERE (venues.owner_id = auth.uid()))));



  create policy "Zones are publicly readable"
  on "public"."zones"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER menu_categories_updated_at BEFORE UPDATE ON public.menu_categories FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_order_updated_at();

CREATE TRIGGER structural_elements_updated_at BEFORE UPDATE ON public.structural_elements FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER tables_updated_at BEFORE UPDATE ON public.tables FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

CREATE TRIGGER zones_updated_at BEFORE UPDATE ON public.zones FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');


