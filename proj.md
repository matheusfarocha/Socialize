# Socialize Repo Brief

## What This Repo Is

This repository is a product prototype for a hospitality workflow called **Socialize**. The idea appears to be:

- A **business-facing dashboard** for venue owners to manage floor plans, menus, and QR experiences.
- A **customer-facing ordering experience** where guests can view a venue layout, browse menu items, pick a table, and place an order.

It is not a fully unified monorepo yet. Instead, it contains **two separate Next.js apps** under `apps/`, each with its own `package.json` and lockfile.

## Repo Structure

- `apps/business`
  Owner/venue dashboard UI.
- `apps/customer`
  Guest ordering flow.
- `designs/business`
  Static HTML mockups and screenshots that look like design references for the business app.
- `README.md`
  Bare placeholder only.

## High-Level Product Flow

### 1. Business app

The business app is the management side for a cafe/restaurant style venue.

Main routes:

- `/login`
  Demo login screen using Supabase auth.
- `/`
  Dashboard home.
- `/insights`
  AI/recommendation style insight cards.
- `/floor-plan`
  Floor plan editor.
- `/menu`
  Menu management UI.
- `/c/[slug]`
  Public-facing venue preview page inside the business app.

What is real vs mocked:

- **Real Supabase-backed pieces**
  - Login with Supabase auth
  - Floor plan load/save
  - Menu category + menu item CRUD
  - Venue name loading in sidebar
  - Public venue preview at `/c/[slug]`
- **Mock/static pieces**
  - Dashboard metrics
  - Revenue chart
  - Top sellers
  - Insights content

### 2. Customer app

The customer app is the guest experience.

Main routes:

- `/`
  Redirects to `/v/demo-venue`
- `/v/[slug]`
  Loads a venue, floor plan, categories, and active menu items from Supabase.

Customer flow supported today:

- Browse menu by category
- Select a table from the rendered floor plan
- Add items to cart
- Choose fulfillment type (`dine_in` or `pickup`)
- Choose mock payment type (`card`, `apple_pay`, `cash`)
- Submit an order

Important limitation:

- Order submission is **demo-only** right now.
- Submitted orders are stored in **`localStorage`**, not persisted to Supabase.
- Card handling is also mock-only; it just validates a last-4 input locally.

## Data Model The App Expects

From the Supabase queries, the repo expects a schema roughly like this:

- `venues`
- `zones`
- `tables`
- `structural_elements`
- `menu_categories`
- `menu_items`

Observed relationships:

- A venue has one or more zones
- A zone contains tables and structural elements
- A venue has menu categories
- Categories contain menu items
- The business app loads a venue by `owner_id`
- The customer/public flows load a venue by `slug`

## What Looks Implemented

### Business app

- Clean dashboard shell and sidebar
- Demo login via hardcoded credentials:
  - `demo@socialize.app`
  - `demo1234`
- Floor plan editor with:
  - editable room outline
  - table/structural palette
  - save to Supabase
- Menu editor with:
  - category creation/deletion
  - item add/edit/delete
  - item activation toggle
  - client-side validation
- QR modal that generates and prints a venue QR code

### Customer app

- Venue page loads from Supabase by slug
- Interactive floor plan rendering
- Menu browsing
- Cart stored per venue in local storage
- Checkout UI and local order confirmation

## What Looks Incomplete or Inconsistent

### 1. Mixed prototype state

This is a **hybrid prototype**: some parts are wired to real Supabase data, while other parts are still static/demo content.

### 2. Public route split

There are **two public-style venue routes**:

- `apps/business/app/c/[slug]/page.tsx`
- `apps/customer/app/v/[slug]/page.tsx`

These are not the same experience:

- `/c/[slug]` in the business app is a lighter public preview
- `/v/[slug]` in the customer app is the richer ordering flow

Also, the QR generator in the business app currently points to `/c/[slug]`, not the richer `/v/[slug]` customer route. That is likely an architectural decision still in flux, or a route mismatch that needs cleanup.

### 3. Dashboard nav is ahead of implementation

The sidebar includes:

- `/staff`
- `/inventory`

but matching pages are not present in the repo, so those sections are not implemented yet.

### 4. No real order backend yet

Customer orders are not being written to Supabase. That means:

- no kitchen/admin order queue
- no live order status
- no backend payment integration
- no cross-device persistence for orders

### 5. No root workspace orchestration

The repo has no root `package.json`, no Turbo config, and no workspace management. Practically, this means both apps are treated as standalone projects inside one repo.

### 6. Version drift between apps

The two apps are on different framework versions:

- `apps/customer`: Next `16.2.4`, React `19.2.4`
- `apps/business`: Next `^15.3.1`, React `^19.1.0`

That is workable for a prototype, but not ideal long-term.

## Environment Requirements

Both apps expect:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

There is no `.env.example` in the repo, so setup knowledge currently lives in the code rather than documentation.

## How To Run

Because there is no root workspace runner, each app should be run independently.

Business app:

```bash
cd apps/business
npm install
npm run dev
```

Customer app:

```bash
cd apps/customer
npm install
npm run dev
```

You will likely want them on different local ports.

## Short Summary

This repo is a **restaurant/cafe digital experience prototype** with:

- a business dashboard for venue setup and management
- a customer ordering surface driven by venue slug
- Supabase as the primary backend/data source

Right now the strongest implemented parts are:

- floor plan management
- menu management
- customer browsing and checkout UI

The biggest gaps are:

- real order persistence
- canonical public route selection
- missing staff/inventory modules
- repo-level setup/documentation/workspace cleanup
