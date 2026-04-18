"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { notFound, useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coffee,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import {
  appendOrder,
  clearCart,
  readCart,
  subscribeCart,
  type FulfillmentType,
  type PaymentMethod,
  type StoredCartItem,
  type StoredOrder,
  writeCart,
} from "@/lib/order-storage";

interface FloorPoint {
  x: number;
  y: number;
}

interface PlacedElement {
  id: string;
  kind: "table" | "structural";
  type: string;
  x: number;
  y: number;
  rotation: number;
  seats?: number;
  label?: string;
  w?: number;
  h?: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

interface VenueData {
  slug: string;
  name: string;
  branchName: string;
  floorWidth: number;
  floorHeight: number;
  outline: FloorPoint[];
  elements: PlacedElement[];
  categories: string[];
  menuItems: MenuItem[];
}

interface CheckoutState {
  customerName: string;
  customerEmail: string;
  notes: string;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  cardholderName: string;
  cardLastFour: string;
}

const publicSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);

const defaultOutline = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];
const emptyCart: StoredCartItem[] = [];

const defaultCheckout: CheckoutState = {
  customerName: "",
  customerEmail: "",
  notes: "",
  fulfillmentType: "pickup",
  paymentMethod: "card",
  cardholderName: "",
  cardLastFour: "",
};

function outlineToPath(points: FloorPoint[]): string {
  if (points.length < 3) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ") + " Z";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function toCartItem(item: MenuItem): StoredCartItem {
  return {
    itemId: item.id,
    name: item.name,
    description: item.description,
    category: item.category,
    price: item.price,
    quantity: 1,
  };
}

function createOrderId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SOC-${rand}`;
}

export default function VenuePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [venue, setVenue] = useState<VenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutState>(defaultCheckout);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<StoredOrder | null>(null);
  const cartStorageSlug = venue?.slug ?? slug;
  const cartItems = useSyncExternalStore(
    (callback) => subscribeCart(cartStorageSlug, callback),
    () => readCart(cartStorageSlug),
    () => emptyCart,
  );

  useEffect(() => {
    async function load() {
      const { data: venueRow } = await publicSupabase
        .from("venues")
        .select("id, slug, name, branch_name")
        .eq("slug", slug)
        .single();

      if (!venueRow) {
        setLoading(false);
        return;
      }

      const { data: zone } = await publicSupabase
        .from("zones")
        .select("id, floor_width, floor_height, floor_outline")
        .eq("venue_id", venueRow.id)
        .order("sort_order")
        .limit(1)
        .single();

      let elements: PlacedElement[] = [];
      if (zone) {
        const { data: tables } = await publicSupabase
          .from("tables")
          .select("identifier, seat_count, shape, pos_x, pos_y, rotation")
          .eq("zone_id", zone.id);

        const { data: structural } = await publicSupabase
          .from("structural_elements")
          .select("element_type, label, pos_x, pos_y, rotation, size_w, size_h")
          .eq("zone_id", zone.id);

        elements = [
          ...(tables ?? []).map((table) => ({
            id: table.identifier,
            kind: "table" as const,
            type: table.shape,
            x: table.pos_x,
            y: table.pos_y,
            rotation: table.rotation,
            seats: table.seat_count,
          })),
          ...(structural ?? []).map((element, index) => ({
            id:
              element.element_type === "bar"
                ? `BAR-${String(index + 1).padStart(2, "0")}`
                : element.element_type === "entrance"
                  ? `ENT-${String(index + 1).padStart(2, "0")}`
                  : `W-${String(index + 1).padStart(2, "0")}`,
            kind: "structural" as const,
            type: element.element_type,
            x: element.pos_x,
            y: element.pos_y,
            rotation: element.rotation,
            label: element.label || undefined,
            w: element.size_w ?? undefined,
            h: element.size_h ?? undefined,
          })),
        ];
      }

      const { data: categoryRows } = await publicSupabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("venue_id", venueRow.id)
        .order("sort_order", { ascending: true });

      const categoryIds = (categoryRows ?? []).map((category) => category.id);
      const categoriesById = new Map(
        (categoryRows ?? []).map((category) => [category.id, category.name]),
      );

      let mappedMenu: MenuItem[] = [];
      if (categoryIds.length > 0) {
        const { data: menuRows } = await publicSupabase
          .from("menu_items")
          .select("id, category_id, name, description, price, is_active, sort_order")
          .in("category_id", categoryIds)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        mappedMenu = (menuRows ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description ?? "",
          price: Number(row.price),
          category: categoriesById.get(row.category_id) ?? "Other",
        }));
      }

      setVenue({
        slug: venueRow.slug,
        name: venueRow.name,
        branchName: venueRow.branch_name ?? "Main Floor",
        floorWidth: zone?.floor_width ?? 800,
        floorHeight: zone?.floor_height ?? 600,
        outline: (zone?.floor_outline as FloorPoint[]) ?? defaultOutline,
        elements,
        categories: (categoryRows ?? [])
          .map((category) => category.name)
          .filter((categoryName) => mappedMenu.some((item) => item.category === categoryName)),
        menuItems: mappedMenu,
      });
      setLoading(false);
    }

    load().catch(() => setLoading(false));
  }, [slug]);

  const tableOptions = useMemo(
    () =>
      (venue?.elements ?? [])
        .filter((element) => element.kind === "table")
        .map((table) => ({
          id: table.id,
          seats: table.seats ?? 0,
        })),
    [venue],
  );

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );
  const serviceFee = useMemo(() => (subtotal > 0 ? Number((subtotal * 0.08).toFixed(2)) : 0), [subtotal]);
  const total = subtotal + serviceFee;
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  function commitCart(updater: (current: StoredCartItem[]) => StoredCartItem[]) {
    writeCart(cartStorageSlug, updater(readCart(cartStorageSlug)));
  }

  function updateCartQuantity(itemId: string, nextQuantity: number) {
    commitCart((current) => {
      if (nextQuantity <= 0) {
        return current.filter((item) => item.itemId !== itemId);
      }

      return current.map((item) =>
        item.itemId === itemId ? { ...item, quantity: nextQuantity } : item,
      );
    });
  }

  function handleAddToCart(item: MenuItem) {
    setCheckoutOpen(true);
    setCheckoutError("");
    commitCart((current) => {
      const existing = current.find((entry) => entry.itemId === item.id);
      if (existing) {
        return current.map((entry) =>
          entry.itemId === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry,
        );
      }

      return [...current, toCartItem(item)];
    });
  }

  function handleCheckoutChange<K extends keyof CheckoutState>(field: K, value: CheckoutState[K]) {
    setCheckout((current) => ({ ...current, [field]: value }));
    setCheckoutError("");
  }

  function handleClearCart() {
    clearCart(cartStorageSlug);
  }

  async function handleSubmitOrder() {
    if (!venue || cartItems.length === 0 || submittingOrder) return;

    const trimmedName = checkout.customerName.trim();
    const trimmedEmail = checkout.customerEmail.trim();
    const trimmedNotes = checkout.notes.trim();
    const trimmedCardholderName = checkout.cardholderName.trim();
    const trimmedCardLastFour = checkout.cardLastFour.trim();

    if (!trimmedName) {
      setCheckoutError("Please add the guest name for this order.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setCheckoutError("Please enter a valid email so we can send order updates.");
      return;
    }

    if (checkout.fulfillmentType === "dine_in" && !selectedTable) {
      setCheckoutError("Select a table on the floor plan before placing a dine-in order.");
      return;
    }

    if (checkout.paymentMethod === "card") {
      if (!trimmedCardholderName) {
        setCheckoutError("Add the cardholder name for the payment step.");
        return;
      }

      if (!/^\d{4}$/.test(trimmedCardLastFour)) {
        setCheckoutError("Use the last 4 digits of the card to complete the mock payment step.");
        return;
      }
    }

    setSubmittingOrder(true);
    setCheckoutError("");

    const order: StoredOrder = {
      id: createOrderId(),
      venueSlug: venue.slug,
      venueName: venue.name,
      createdAt: new Date().toISOString(),
      customerName: trimmedName,
      customerEmail: trimmedEmail,
      notes: trimmedNotes,
      fulfillmentType: checkout.fulfillmentType,
      selectedTableId: checkout.fulfillmentType === "dine_in" ? selectedTable : null,
      paymentMethod: checkout.paymentMethod,
      cardLabel:
        checkout.paymentMethod === "card" ? `${trimmedCardholderName} •••• ${trimmedCardLastFour}` : null,
      subtotal,
      serviceFee,
      total,
      items: cartItems,
      status: "submitted",
    };

    appendOrder(venue.slug, order);
    clearCart(venue.slug);
    setSubmittedOrder(order);
    setCheckoutOpen(false);
    setCheckout(defaultCheckout);
    setSubmittingOrder(false);
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!venue) notFound();

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <header className="bg-primary px-6 py-5 text-on-primary">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-on-primary/20">
            <Coffee size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{venue.name}</h1>
            <p className="text-xs text-on-primary/80">{venue.branchName}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-on-primary/80">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {venue.branchName}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            Ordering live now
          </span>
        </div>
      </header>

      <section className="px-4 py-5">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Floor Plan</h2>
            <p className="text-xs text-on-surface-variant">
              Tap a table if this is a dine-in order.
            </p>
          </div>
          <span className="rounded-full bg-secondary-container px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-on-secondary-container">
            {selectedTable ? `Table ${selectedTable} selected` : "Pickup ready"}
          </span>
        </div>
        <div className="overflow-hidden rounded-2xl bg-surface-container-low p-4">
          <div className="relative w-full" style={{ aspectRatio: `${venue.floorWidth} / ${venue.floorHeight}` }}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              <defs>
                <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                  <feDropShadow dx="0" dy="0.5" stdDeviation="1" floodColor="#514437" floodOpacity="0.1" />
                </filter>
                <pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse">
                  <circle cx="2.5" cy="2.5" r="0.3" fill="#865300" opacity="0.12" />
                </pattern>
                <clipPath id="floor">
                  <path d={outlineToPath(venue.outline)} />
                </clipPath>
              </defs>
              <path
                d={outlineToPath(venue.outline)}
                fill="#f7f3ed"
                stroke="#514437"
                strokeWidth="0.5"
                strokeOpacity="0.3"
                filter="url(#shadow)"
              />
              <rect width="100" height="100" fill="url(#dots)" clipPath="url(#floor)" />
            </svg>

            {venue.elements.map((element) => (
              <FloorElement
                key={element.id}
                element={element}
                selected={selectedTable === element.id}
                onTap={() =>
                  setSelectedTable(selectedTable === element.id ? null : element.id)
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section className="flex-1 px-4 pb-6">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Menu</h2>
            <p className="text-xs text-on-surface-variant">
              Add dishes to cart, then head to checkout.
            </p>
          </div>
          <button
            type="button"
            data-testid="open-cart-button"
            onClick={() => setCheckoutOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-surface-container-high px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            <ShoppingBag size={16} />
            {cartCount} item{cartCount === 1 ? "" : "s"}
          </button>
        </div>

        {venue.menuItems.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No menu items yet.</p>
        ) : (
          <div className="space-y-6">
            {venue.categories.map((category) => (
              <div key={category}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">
                  {category}
                </h3>
                <div className="space-y-3">
                  {venue.menuItems
                    .filter((item) => item.category === category)
                    .map((item) => {
                      const quantity = cartItems.find((entry) => entry.itemId === item.id)?.quantity ?? 0;

                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl bg-surface-container-low px-4 py-4"
                          data-testid={`menu-item-${item.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-on-surface">{item.name}</h4>
                              <p className="mt-1 text-xs text-on-surface-variant">
                                {item.description}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-bold text-primary">
                              {formatCurrency(item.price)}
                            </span>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="text-[11px] font-medium text-on-surface-variant">
                              {quantity > 0 ? `${quantity} in cart` : "Ready to add"}
                            </div>
                            <div className="flex items-center gap-2">
                              {quantity > 0 ? (
                                <>
                                  <button
                                    type="button"
                                    data-testid={`decrease-item-${item.id}`}
                                    onClick={() => updateCartQuantity(item.id, quantity - 1)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high text-on-surface"
                                    aria-label={`Remove one ${item.name}`}
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span
                                    className="w-6 text-center text-sm font-bold text-on-surface"
                                    data-testid={`cart-qty-${item.id}`}
                                  >
                                    {quantity}
                                  </span>
                                </>
                              ) : null}
                              <button
                                type="button"
                                data-testid={`add-item-${item.id}`}
                                onClick={() => handleAddToCart(item)}
                                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
                              >
                                <Plus size={16} />
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {submittedOrder ? (
        <section className="border-t border-outline-variant/30 bg-surface-container-low px-4 py-5">
          <div className="rounded-[1.75rem] bg-surface p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
                <CheckCircle2 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Order Submitted
                </p>
                <h3 className="mt-1 text-xl font-bold text-on-surface">
                  {submittedOrder.id}
                </h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {submittedOrder.fulfillmentType === "dine_in"
                    ? `We queued this order for table ${submittedOrder.selectedTableId}.`
                    : "We queued this order for pickup at the counter."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-on-surface-variant">
                  <span>{submittedOrder.items.length} line item(s)</span>
                  <span>{formatCurrency(submittedOrder.total)} total</span>
                  <span>{submittedOrder.paymentMethod.replace("_", " ")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="sticky bottom-0 mt-auto border-t border-outline-variant/30 bg-surface/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Cart Total
              </p>
              <p className="text-xl font-bold text-on-surface" data-testid="cart-total">
                {formatCurrency(total)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-60"
              disabled={cartItems.length === 0}
            >
              {checkoutOpen ? "Hide Checkout" : "Open Checkout"}
              <ArrowRight size={16} />
            </button>
          </div>

          {checkoutOpen ? (
            <div className="rounded-[1.75rem] bg-surface-container-low p-4" data-testid="checkout-panel">
              <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">Guest Details</h3>
                    <p className="text-xs text-on-surface-variant">
                      Fill out the order details and confirm payment below.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium text-on-surface">
                      <span>Name</span>
                      <input
                        data-testid="checkout-name"
                        value={checkout.customerName}
                        onChange={(event) => handleCheckoutChange("customerName", event.target.value)}
                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary"
                        placeholder="Jordan Guest"
                      />
                    </label>
                    <label className="space-y-2 text-sm font-medium text-on-surface">
                      <span>Email</span>
                      <input
                        data-testid="checkout-email"
                        value={checkout.customerEmail}
                        onChange={(event) => handleCheckoutChange("customerEmail", event.target.value)}
                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary"
                        placeholder="guest@example.com"
                        type="email"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-medium text-on-surface">
                      <span>Fulfillment</span>
                      <select
                        data-testid="checkout-fulfillment"
                        value={checkout.fulfillmentType}
                        onChange={(event) =>
                          handleCheckoutChange("fulfillmentType", event.target.value as FulfillmentType)
                        }
                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary"
                      >
                        <option value="pickup">Pickup</option>
                        <option value="dine_in">Dine-in</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-sm font-medium text-on-surface">
                      <span>Table</span>
                      <select
                        data-testid="checkout-table"
                        value={selectedTable ?? ""}
                        onChange={(event) => setSelectedTable(event.target.value || null)}
                        disabled={checkout.fulfillmentType !== "dine_in"}
                        className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
                      >
                        <option value="">
                          {checkout.fulfillmentType === "dine_in"
                            ? "Select a table"
                            : "Pickup order"}
                        </option>
                        {tableOptions.map((table) => (
                          <option key={table.id} value={table.id}>
                            {table.id}{table.seats ? ` · ${table.seats} seats` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="space-y-2 text-sm font-medium text-on-surface">
                    <span>Notes</span>
                    <textarea
                      data-testid="checkout-notes"
                      value={checkout.notes}
                      onChange={(event) => handleCheckoutChange("notes", event.target.value)}
                      className="min-h-24 w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary"
                      placeholder="Allergies, pacing notes, or pickup instructions"
                    />
                  </label>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-on-surface">Payment</h4>
                      <p className="text-xs text-on-surface-variant">
                        This is a demo checkout flow. Payment details are collected locally.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[
                        { value: "card", label: "Card" },
                        { value: "apple_pay", label: "Apple Pay" },
                        { value: "cash", label: "Pay At Venue" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          data-testid={`payment-${option.value}`}
                          onClick={() => handleCheckoutChange("paymentMethod", option.value as PaymentMethod)}
                          className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                            checkout.paymentMethod === option.value
                              ? "border-primary bg-primary text-on-primary"
                              : "border-outline-variant/40 bg-surface text-on-surface"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {checkout.paymentMethod === "card" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2 text-sm font-medium text-on-surface">
                          <span>Cardholder</span>
                          <input
                            data-testid="cardholder-name"
                            value={checkout.cardholderName}
                            onChange={(event) =>
                              handleCheckoutChange("cardholderName", event.target.value)
                            }
                            className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary"
                            placeholder="Jordan Guest"
                          />
                        </label>
                        <label className="space-y-2 text-sm font-medium text-on-surface">
                          <span>Last 4 digits</span>
                          <input
                            data-testid="card-last-four"
                            value={checkout.cardLastFour}
                            onChange={(event) =>
                              handleCheckoutChange(
                                "cardLastFour",
                                event.target.value.replace(/\D/g, "").slice(0, 4),
                              )
                            }
                            className="w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm outline-none transition focus:border-primary"
                            inputMode="numeric"
                            placeholder="4242"
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[1.5rem] bg-surface p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-on-surface">Your Order</h3>
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="text-xs font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
                    >
                      Clear cart
                    </button>
                  </div>

                  {cartItems.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">
                      Add a few items from the menu to start checkout.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {cartItems.map((item) => (
                        <div
                          key={item.itemId}
                          className="rounded-2xl bg-surface-container-low px-3 py-3"
                          data-testid={`cart-item-${item.itemId}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-on-surface">{item.name}</p>
                              <p className="text-xs text-on-surface-variant">{item.category}</p>
                            </div>
                            <p className="text-sm font-bold text-primary">
                              {formatCurrency(item.price * item.quantity)}
                            </p>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-xs text-on-surface-variant">
                              {item.description}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                data-testid={`cart-decrease-${item.itemId}`}
                                onClick={() => updateCartQuantity(item.itemId, item.quantity - 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-on-surface"
                                aria-label={`Decrease ${item.name}`}
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-5 text-center text-sm font-bold text-on-surface">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                data-testid={`cart-increase-${item.itemId}`}
                                onClick={() => updateCartQuantity(item.itemId, item.quantity + 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-on-surface"
                                aria-label={`Increase ${item.name}`}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 space-y-2 border-t border-outline-variant/20 pt-4 text-sm">
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span>Service fee</span>
                      <span>{formatCurrency(serviceFee)}</span>
                    </div>
                    <div className="flex items-center justify-between text-base font-bold text-on-surface">
                      <span>Total</span>
                      <span data-testid="checkout-total">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  {checkoutError ? (
                    <p
                      className="mt-4 rounded-2xl bg-secondary-container px-4 py-3 text-sm text-on-secondary-container"
                      data-testid="checkout-error"
                    >
                      {checkoutError}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    data-testid="submit-order-button"
                    onClick={handleSubmitOrder}
                    disabled={cartItems.length === 0 || submittingOrder}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-60"
                  >
                    {submittingOrder ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending Order
                      </>
                    ) : (
                      <>
                        Submit Order
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function FloorElement({
  element,
  selected,
  onTap,
}: {
  element: PlacedElement;
  selected: boolean;
  onTap: () => void;
}) {
  const style: CSSProperties = {
    left: `${element.x}%`,
    top: `${element.y}%`,
    transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
    position: "absolute",
  };

  const ring = selected ? "ring-2 ring-primary" : "";

  switch (element.type) {
    case "round":
      return (
        <div
          className={`absolute flex h-8 w-8 items-center justify-center rounded-full border-2 border-outline-variant sm:h-10 sm:w-10 ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="h-4 w-4 rounded-full bg-surface-container-highest sm:h-5 sm:w-5" />
          {selected ? <TableLabel id={element.id} seats={element.seats} /> : null}
        </div>
      );
    case "square":
      return (
        <div
          className={`absolute flex h-8 w-8 items-center justify-center rounded-lg border-2 border-outline-variant sm:h-10 sm:w-10 ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="h-3 w-5 rounded bg-surface-container-highest sm:h-4 sm:w-6" />
          {selected ? <TableLabel id={element.id} seats={element.seats} /> : null}
        </div>
      );
    case "long":
      return (
        <div
          className={`absolute flex h-8 w-12 items-center justify-center rounded-lg border-2 border-outline-variant sm:h-10 sm:w-14 ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="h-4 w-8 rounded-sm bg-surface-container-highest sm:h-5 sm:w-10" />
          {selected ? <TableLabel id={element.id} seats={element.seats} /> : null}
        </div>
      );
    case "booth":
      return (
        <div
          className={`absolute flex h-8 w-8 items-center justify-center rounded-[6px] rounded-tl-[14px] border-2 border-outline-variant sm:h-10 sm:w-10 ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="h-5 w-5 rounded-[4px] rounded-tl-[10px] bg-surface-container-highest" />
          {selected ? <TableLabel id={element.id} seats={element.seats} /> : null}
        </div>
      );
    case "bar": {
      const barWidth = element.w ?? 256;
      const barHeight = element.h ?? 96;

      return (
        <div
          className={`absolute flex items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-high ${ring}`}
          style={{ ...style, width: barWidth * 0.4, height: barHeight * 0.4 }}
        >
          <span className="text-[9px] font-bold text-on-surface-variant sm:text-[10px]">
            {element.label || "Bar"}
          </span>
        </div>
      );
    }
    case "entrance":
      return (
        <div
          className="absolute flex h-5 w-12 items-center justify-center rounded border border-dashed border-primary/40 bg-primary/5 sm:h-6 sm:w-14"
          style={style}
        >
          <span className="text-[8px] font-bold uppercase tracking-wider text-on-surface-variant sm:text-[9px]">
            {element.label || "Entry"}
          </span>
        </div>
      );
    case "wall":
      return (
        <div
          className="absolute h-1 rounded-full bg-on-surface-variant/30"
          style={{ ...style, width: (element.w ?? 96) * 0.4 }}
        />
      );
    default:
      return null;
  }
}

function TableLabel({ id, seats }: { id: string; seats?: number }) {
  return (
    <div className="absolute left-1/2 top-[-2rem] z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-[10px] font-bold text-surface">
      {id}
      {seats ? ` · ${seats} seats` : ""}
    </div>
  );
}
