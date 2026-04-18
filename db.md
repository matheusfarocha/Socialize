# Socialize DB Context

This document captures the current Supabase shape that the repo is working against as of 2026-04-18.

## How This Was Derived

- Repo grep across both apps for all Supabase reads and writes
- Live table inspection through the existing demo account used by the business app

## Auth Context

- Business app demo login:
  - Email: `demo@socialize.app`
  - Password: `demo1234`
- Demo user id observed during inspection:
  - `f8f25fe2-e0bf-415e-8184-b555010e19a8`

## Core Tables

### `venues`

Purpose:
- Top-level business entity for a venue

Observed columns:
- `id` `uuid`
- `owner_id` `uuid`
- `slug` `text`
- `name` `text`
- `branch_name` `text`
- `created_at`
- `updated_at`

Observed sample:
- `slug = "the-modern-hearth"`
- `name = "The Modern Hearth"`
- `branch_name = "Downtown Branch"`

Repo usage:
- Business sidebar loads venue name by `owner_id`
- Business floor-plan editor loads venue by `owner_id`
- Public venue pages load venue by `slug`

### `zones`

Purpose:
- Floor-plan container for a venue

Observed columns:
- `id` `uuid`
- `venue_id` `uuid`
- `name` `text`
- `sort_order` `number`
- `floor_width` `number`
- `floor_height` `number`
- `floor_outline` `json/jsonb`
- `created_at`
- `updated_at`

Observed sample:
- `name = "Main Floor"`
- `floor_width = 800`
- `floor_height = 600`
- `floor_outline = [{x,y}, ...]` in normalized 0-100 coordinates

Repo usage:
- Business floor-plan editor reads and updates this table
- Public pages read the first zone ordered by `sort_order`

### `tables`

Purpose:
- Seating elements inside a zone

Observed columns:
- `id` `uuid`
- `zone_id` `uuid`
- `identifier` `text`
- `seat_count` `number`
- `shape` `text`
- `table_type` `text`
- `is_reservable` `boolean`
- `is_ada_accessible` `boolean`
- `pos_x` `number`
- `pos_y` `number`
- `width` `number`
- `height` `number`
- `rotation` `number`
- `created_at`
- `updated_at`

Observed sample:
- `identifier = "T-01"`
- `shape = "round"`
- `table_type = "standard"`
- `is_reservable = true`
- `is_ada_accessible = false`

Important repo note:
- Current business floor-plan save path only writes:
  - `identifier`
  - `seat_count`
  - `shape`
  - `pos_x`
  - `pos_y`
  - `rotation`
- The extra table fields exist in the database but are not currently preserved by the app.

### `structural_elements`

Purpose:
- Non-table floor-plan elements like bars, entrances, and walls

Observed columns:
- `id` `uuid`
- `zone_id` `uuid`
- `element_type` `text`
- `label` `text`
- `pos_x` `number`
- `pos_y` `number`
- `width` `number`
- `height` `number`
- `rotation` `number`
- `size_w` `number | null`
- `size_h` `number | null`
- `created_at`
- `updated_at`

Important repo note:
- Business floor-plan code currently writes `size_w` and `size_h`
- Existing rows also include `width` and `height`
- There is a naming mismatch here that may matter if we normalize the floor-plan persistence later

## Menu Tables

### `menu_categories`

Purpose:
- Category bucket for a venue menu

Observed columns:
- `id` `uuid`
- `venue_id` `uuid`
- `name` `text`
- `sort_order` `number`
- `created_at`
- `updated_at`

Observed sample:
- `name = "Hot Beverages"`
- `sort_order = 0`

Relationships:
- Belongs to one `venue`
- Has many `menu_items`

### `menu_items`

Purpose:
- Individual menu item

Observed columns:
- `id` `uuid`
- `category_id` `uuid`
- `name` `text`
- `description` `text`
- `price` `number`
- `is_active` `boolean`
- `image_path` `text | null`
- `sort_order` `number`
- `created_at`
- `updated_at`

Observed sample:
- `name = "Pour Over Coffee"`
- `description = "Single-origin beans, hand-poured."`
- `price = 4.5`
- `is_active = true`
- `image_path = null`
- `sort_order = 0`

Relationships:
- Belongs to one `menu_category` through `category_id`
- Indirectly belongs to a `venue` through `menu_categories.venue_id`

## Actual Menu Shape Used By The Live DB

The live schema is:

- `venues`
  - `id`
- `menu_categories`
  - `venue_id`
- `menu_items`
  - `category_id`

That means menu items do not currently store `venue_id` directly.

## Current App Mismatch

### Business app

The newer customer-facing page inside the business app already matches the live schema:

- Reads `menu_items`
- Joins `menu_categories!inner(name, venue_id)`
- Filters by `menu_categories.venue_id`
- Uses `is_active`
- Uses `image_path`

### Customer app

The standalone customer app still assumes an older menu shape:

- Reads `menu_items`
- Expects `venue_id`
- Expects `category`
- Expects `active`

This will need to be updated when we implement menu CRUD so both apps read the same source of truth.

## Likely CRUD Target For Menu Work

For menu CRUD, the data model should probably be treated as:

- Venue owns many categories
- Category owns many items
- Category ordering uses `menu_categories.sort_order`
- Item ordering uses `menu_items.sort_order`
- Item visibility uses `menu_items.is_active`
- Item image uses `menu_items.image_path`

## Files That Matter Most For The Upcoming Work

- `apps/business/app/(dashboard)/menu/page.tsx`
- `apps/business/components/menu/menu-item-row.tsx`
- `apps/business/app/c/[slug]/page.tsx`
- `apps/customer/app/v/[slug]/page.tsx`
- `apps/business/lib/supabase.ts`
- `apps/customer/lib/supabase.ts`

## Current Status

- Dependencies installed for `apps/business`
- Dependencies installed for `apps/customer`
- Local `.env.local` files added in both apps with the provided Supabase public keys

