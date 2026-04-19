"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Coffee,
  Loader2,
  MapPin,
  Maximize,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import {
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
  imagePath?: string;
}

interface VenueData {
  id: string;
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

const AR_MENU_URL = "https://ar-menu-one.vercel.app/";

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

function isMissingCreateOrderRpc(error: { message?: string; code?: string } | null) {
  if (!error) return false;

  return (
    error.code === "PGRST202" ||
    error.message?.includes("Could not find the function public.create_order_with_items") === true
  );
}

export default function VenuePage() {
  const params = useParams();
  const router = useRouter();
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
        if (slug === "demo-venue") {
          const { data: venues } = await publicSupabase
            .from("venues")
            .select("slug")
            .order("name", { ascending: true })
            .limit(1);

          const fallbackVenue = venues?.find((entry) => entry.slug);
          if (fallbackVenue?.slug) {
            router.replace(`/v/${fallbackVenue.slug}`);
            return;
          }
        }

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
          .select("id, category_id, name, description, price, is_active, image_path, sort_order")
          .in("category_id", categoryIds)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        mappedMenu = (menuRows ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description ?? "",
          price: Number(row.price),
          category: categoriesById.get(row.category_id) ?? "Other",
          imagePath: row.image_path ?? undefined,
        }));
      }

      setVenue({
        id: venueRow.id,
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
  }, [router, slug]);

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

    const orderDbId = crypto.randomUUID();
    const publicOrderCode = createOrderId();
    const placedAt = new Date().toISOString();
    const paymentLabel =
      checkout.paymentMethod === "card"
        ? `${trimmedCardholderName} •••• ${trimmedCardLastFour}`
        : checkout.paymentMethod === "apple_pay"
          ? "Apple Pay"
          : "Pay At Venue";
    const orderItemsPayload = cartItems.map((item) => ({
      order_id: orderDbId,
      menu_item_id: item.itemId,
      name: item.name,
      description: item.description,
      category_name: item.category,
      unit_price: item.price,
      quantity: item.quantity,
      line_total: Number((item.price * item.quantity).toFixed(2)),
    }));
    const order: StoredOrder = {
      id: publicOrderCode,
      venueSlug: venue.slug,
      venueName: venue.name,
      createdAt: placedAt,
      customerName: trimmedName,
      customerEmail: trimmedEmail,
      notes: trimmedNotes,
      fulfillmentType: checkout.fulfillmentType,
      selectedTableId: checkout.fulfillmentType === "dine_in" ? selectedTable : null,
      paymentMethod: checkout.paymentMethod,
      cardLabel: checkout.paymentMethod === "card" ? paymentLabel : null,
      subtotal,
      serviceFee,
      total,
      items: cartItems,
      status: "submitted",
    };

    const { error: submitError } = await publicSupabase.rpc("create_order_with_items", {
      p_order_id: orderDbId,
      p_venue_id: venue.id,
      p_public_order_code: publicOrderCode,
      p_customer_name: trimmedName,
      p_customer_email: trimmedEmail,
      p_notes: trimmedNotes,
      p_fulfillment_type: checkout.fulfillmentType,
      p_table_identifier: checkout.fulfillmentType === "dine_in" ? selectedTable : null,
      p_payment_method: checkout.paymentMethod,
      p_payment_label: paymentLabel,
      p_subtotal: subtotal,
      p_service_fee: serviceFee,
      p_total: total,
      p_placed_at: placedAt,
      p_items: orderItemsPayload.map((item) => ({
        menu_item_id: item.menu_item_id,
        name: item.name,
        description: item.description,
        category_name: item.category_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_total: item.line_total,
      })),
    });

    let finalSubmitError = submitError;

    if (isMissingCreateOrderRpc(submitError)) {
      const { error: orderInsertError } = await publicSupabase.from("orders").insert({
        id: orderDbId,
        venue_id: venue.id,
        public_order_code: publicOrderCode,
        customer_name: trimmedName,
        customer_email: trimmedEmail,
        notes: trimmedNotes,
        fulfillment_type: checkout.fulfillmentType,
        table_identifier: checkout.fulfillmentType === "dine_in" ? selectedTable : null,
        payment_method: checkout.paymentMethod,
        payment_label: paymentLabel,
        subtotal,
        service_fee: serviceFee,
        total,
        status: "submitted",
        placed_at: placedAt,
        updated_at: placedAt,
      });

      if (orderInsertError) {
        finalSubmitError = orderInsertError;
      } else {
        const { error: itemInsertError } = await publicSupabase
          .from("order_items")
          .insert(orderItemsPayload);

        finalSubmitError = itemInsertError;
      }
    }

    if (finalSubmitError) {
      setCheckoutError(
        finalSubmitError.message || "We couldn't place the order right now. Please try again.",
      );
      setSubmittingOrder(false);
      return;
    }

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

      <ReadOnlyCanvas
        outline={venue.outline}
        elements={venue.elements}
        floorWidth={venue.floorWidth}
        floorHeight={venue.floorHeight}
        selectedTable={selectedTable}
        onSelectTable={setSelectedTable}
      />

      <section className="flex-1 px-4 pb-6">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Menu</h2>
            <p className="text-xs text-on-surface-variant">
              Add dishes to cart, then head to checkout.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={AR_MENU_URL}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
            >
              <Maximize size={16} />
              View In AR
            </a>
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
                          <div className="flex items-start gap-4">
                            {item.imagePath ? (
                              <img
                                src={item.imagePath}
                                alt={item.name}
                                className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                              />
                            ) : null}
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

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;

function ReadOnlyCanvas({
  outline,
  elements,
  floorWidth,
  floorHeight,
  selectedTable,
  onSelectTable,
}: {
  outline: FloorPoint[];
  elements: PlacedElement[];
  floorWidth: number;
  floorHeight: number;
  selectedTable: string | null;
  onSelectTable: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 60;
    const fit = Math.min(
      (clientWidth - padding) / floorWidth,
      (clientHeight - padding) / floorHeight,
      1.2,
    );
    const z = Math.max(MIN_ZOOM, fit);
    setZoom(z);
    setPan({
      x: (clientWidth - floorWidth * z) / 2,
      y: (clientHeight - floorHeight * z) / 2,
    });
  }, [floorWidth, floorHeight]);

  useEffect(() => {
    fitToView();
  }, [fitToView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        const oldZ = zoomRef.current;
        const newZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZ * factor));
        setPan((p) => ({
          x: mx - (mx - p.x) * (newZ / oldZ),
          y: my - (my - p.y) * (newZ / oldZ),
        }));
        setZoom(newZ);
      } else {
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function handleMouseDown(e: React.MouseEvent) {
    const startX = e.clientX;
    const startY = e.clientY;
    const startPan = { ...panRef.current };
    let panned = false;

    function onMove(me: MouseEvent) {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      if (!panned && dx * dx + dy * dy < 16) return;
      panned = true;
      document.body.style.cursor = "grabbing";
      setPan({ x: startPan.x + dx, y: startPan.y + dy });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      if (!panned) onSelectTable(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const zoomPct = Math.round(zoom * 100);

  return (
    <section className="min-h-[250px] max-h-[50vh] flex flex-col">
      <div className="px-4 pt-5 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-on-surface">Floor Plan</h2>
          <p className="text-xs text-on-surface-variant">Tap a table for dine-in.</p>
        </div>
        <span className="rounded-full bg-secondary-container px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-on-secondary-container">
          {selectedTable ? `Table ${selectedTable}` : "Pickup ready"}
        </span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 min-h-0 bg-surface-container-low mx-4 rounded-2xl relative overflow-hidden"
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#865300 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundPosition: `${pan.x % 24}px ${pan.y % 24}px`,
          }}
        />

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width: floorWidth,
            height: floorHeight,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <div className="relative select-none" style={{ width: floorWidth, height: floorHeight }}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              overflow="visible"
              className="absolute inset-0 w-full h-full"
            >
              <defs>
                <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                  <feDropShadow dx="0" dy="0.5" stdDeviation="1.5" floodColor="#514437" floodOpacity="0.15" />
                </filter>
                <pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse">
                  <circle cx="2.5" cy="2.5" r="0.3" fill="#865300" opacity="0.12" />
                </pattern>
                <clipPath id="floor">
                  <path d={outlineToPath(outline)} />
                </clipPath>
              </defs>
              <path
                d={outlineToPath(outline)}
                fill="#f7f3ed"
                stroke="#514437"
                strokeWidth="0.5"
                strokeOpacity="0.3"
                filter="url(#shadow)"
              />
              <rect width="100" height="100" fill="url(#dots)" clipPath="url(#floor)" />
            </svg>

            {elements.map((el) => (
              <FloorElement
                key={el.id}
                element={el}
                selected={selectedTable === el.id}
                onTap={() => onSelectTable(selectedTable === el.id ? null : el.id)}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-3 right-3 bg-surface/80 backdrop-blur-md p-1 rounded-xl shadow-sm flex items-center gap-1 z-10 border border-outline-variant/10">
          <button
            onClick={() => {
              const newZ = Math.max(MIN_ZOOM, zoom * 0.85);
              if (!containerRef.current) return;
              const { clientWidth, clientHeight } = containerRef.current;
              const cx = clientWidth / 2;
              const cy = clientHeight / 2;
              setPan((p) => ({
                x: cx - (cx - p.x) * (newZ / zoom),
                y: cy - (cy - p.y) * (newZ / zoom),
              }));
              setZoom(newZ);
            }}
            className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="text-[10px] font-bold text-on-surface px-1.5 min-w-[2.5rem] text-center">
            {zoomPct}%
          </span>
          <button
            onClick={() => {
              const newZ = Math.min(MAX_ZOOM, zoom * 1.15);
              if (!containerRef.current) return;
              const { clientWidth, clientHeight } = containerRef.current;
              const cx = clientWidth / 2;
              const cy = clientHeight / 2;
              setPan((p) => ({
                x: cx - (cx - p.x) * (newZ / zoom),
                y: cy - (cy - p.y) * (newZ / zoom),
              }));
              setZoom(newZ);
            }}
            className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <Plus size={14} />
          </button>
          <div className="w-px h-4 bg-outline-variant/30 mx-0.5" />
          <button
            onClick={fitToView}
            className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <Maximize size={14} />
          </button>
        </div>
      </div>
    </section>
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
          className={`absolute w-16 h-16 rounded-full border-2 border-outline-variant flex items-center justify-center ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="w-8 h-8 rounded-full bg-surface-container-highest" />
          {selected && <TableLabel id={element.id} seats={element.seats} />}
        </div>
      );
    case "square":
      return (
        <div
          className={`absolute w-16 h-16 rounded-lg border-2 border-outline-variant flex items-center justify-center ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="w-8 h-6 rounded bg-surface-container-highest" />
          {selected && <TableLabel id={element.id} seats={element.seats} />}
        </div>
      );
    case "long":
      return (
        <div
          className={`absolute w-24 h-16 border-2 border-outline-variant rounded-lg flex items-center justify-center ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="w-16 h-8 bg-surface-container-highest rounded-sm" />
          {selected && <TableLabel id={element.id} seats={element.seats} />}
        </div>
      );
    case "booth":
      return (
        <div
          className={`absolute w-14 h-14 border-2 border-outline-variant rounded-[10px] rounded-tl-[24px] flex items-center justify-center ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="w-8 h-8 rounded-[6px] rounded-tl-[16px] bg-surface-container-highest" />
          {selected && <TableLabel id={element.id} seats={element.seats} />}
        </div>
      );
    case "bar": {
      const barW = element.w ?? 256;
      const barH = element.h ?? 96;
      return (
        <div
          className={`absolute bg-surface-container-high rounded-xl flex items-center justify-center border shadow-sm border-outline-variant/30 ${ring}`}
          style={{ ...style, width: barW, height: barH }}
        >
          <span className="text-sm font-semibold text-on-surface-variant">{element.label || "Bar"}</span>
        </div>
      );
    }
    case "entrance":
      return (
        <div
          className="absolute w-24 h-8 flex items-center justify-center border-2 border-dashed border-primary/30 bg-primary/5 rounded-md"
          style={style}
        >
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            {element.label || "Entrance"}
          </span>
        </div>
      );
    case "wall": {
      const wallW = element.w ?? 96;
      return (
        <div
          className="absolute h-2 bg-on-surface-variant/40 rounded-full"
          style={{ ...style, width: wallW }}
        />
      );
    }
    default:
      return null;
  }
}

function TableLabel({ id, seats }: { id: string; seats?: number }) {
  return (
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-on-surface text-surface px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap z-10">
      {id}{seats ? ` · ${seats} seats` : ""}
    </div>
  );
}
