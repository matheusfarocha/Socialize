"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  clearCart,
  readCart,
  subscribeCart,
  writeCart,
  type FulfillmentType,
  type PaymentMethod,
  type StoredCartItem,
  type StoredOrder,
} from "@/lib/order-storage";
import { buildPresenceTableId } from "@/lib/presence";
import { createPublicSupabaseClient } from "@/lib/supabase";

/* ─── Types ─────────────────────────────────────────── */

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imagePath?: string;
}

interface TableOption {
  id: string;
  label: string;
  seats: number;
  zoneName: string;
}

interface VenueMenuData {
  id: string;
  slug: string;
  name: string;
  categories: string[];
  menuItems: MenuItem[];
  tableOptions: TableOption[];
}

interface CheckoutState {
  customerName: string;
  customerEmail: string;
  notes: string;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  cardholderName: string;
  cardLastFour: string;
  tableId: string;
}

/* ─── Constants ─────────────────────────────────────── */

const publicSupabase = createPublicSupabaseClient();
const emptyCart: StoredCartItem[] = [];

const defaultCheckout: CheckoutState = {
  customerName: "",
  customerEmail: "",
  notes: "",
  fulfillmentType: "pickup",
  paymentMethod: "card",
  cardholderName: "",
  cardLastFour: "",
  tableId: "",
};

const AR_MENU_URL = "https://ar-menu-one.vercel.app/ar";

/* ─── Helpers ───────────────────────────────────────── */

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function toCartItem(item: MenuItem): StoredCartItem {
  return { itemId: item.id, name: item.name, description: item.description, category: item.category, price: item.price, quantity: 1 };
}

function createOrderId() {
  return `SOC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function isMissingRpc(err: { code?: string; message?: string } | null) {
  return err?.code === "PGRST202" || err?.message?.includes("create_order_with_items") === true;
}

/* ─── Page ───────────────────────────────────────────── */

export default function MenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const requestedTable = searchParams.get("table");

  const [venue, setVenue] = useState<VenueMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("");

  /* Cart */
  const cartItems = useSyncExternalStore(
    (cb) => subscribeCart(slug, cb),
    () => readCart(slug),
    () => emptyCart,
  );
  const cartCount = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems]);
  const subtotal = useMemo(() => cartItems.reduce((s, i) => s + i.price * i.quantity, 0), [cartItems]);
  const serviceFee = useMemo(() => subtotal > 0 ? Number((subtotal * 0.08).toFixed(2)) : 0, [subtotal]);
  const total = subtotal + serviceFee;

  /* Checkout */
  const [checkout, setCheckout] = useState<CheckoutState>({ ...defaultCheckout, tableId: requestedTable ?? "" });
  const [checkoutExpanded, setCheckoutExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<StoredOrder | null>(null);

  /* Load venue + menu + tables */
  useEffect(() => {
    async function load() {
      const { data: venueRow } = await publicSupabase
        .from("venues").select("id, slug, name").eq("slug", slug).single();
      if (!venueRow) { setLoading(false); return; }

      const [
        { data: categoryRows },
        { data: zoneRows },
      ] = await Promise.all([
        publicSupabase.from("menu_categories").select("id, name, sort_order").eq("venue_id", venueRow.id).order("sort_order"),
        publicSupabase.from("zones").select("id, name").eq("venue_id", venueRow.id).order("sort_order"),
      ]);

      const categoryIds = (categoryRows ?? []).map((c) => c.id);
      const categoriesById = new Map((categoryRows ?? []).map((c) => [c.id, c.name]));

      const [menuResult, ...tableResults] = await Promise.all([
        categoryIds.length > 0
          ? publicSupabase.from("menu_items")
              .select("id, category_id, name, description, price, image_path, sort_order")
              .in("category_id", categoryIds).eq("is_active", true).order("sort_order")
          : Promise.resolve({ data: [] }),
        ...(zoneRows ?? []).map((zone) =>
          publicSupabase.from("tables")
            .select("identifier, seat_count, pos_x, pos_y")
            .eq("zone_id", zone.id)
            .then((r) => ({ zone, tables: r.data ?? [] })),
        ),
      ]);

      const menuRows = (menuResult as { data: any[] | null }).data ?? [];
      const mappedMenu: MenuItem[] = menuRows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        price: Number(row.price),
        category: categoriesById.get(row.category_id) ?? "Other",
        imagePath: row.image_path ?? undefined,
      }));

      const tableOptions: TableOption[] = (tableResults as any[]).flatMap(({ zone, tables }) =>
        tables.map((t: any) => ({
          id: buildPresenceTableId({ zoneId: zone.id, identifier: t.identifier, x: t.pos_x, y: t.pos_y }),
          label: t.identifier,
          seats: t.seat_count ?? 0,
          zoneName: zone.name ?? "Floor",
        })),
      );

      const categories = (categoryRows ?? [])
        .map((c) => c.name)
        .filter((name) => mappedMenu.some((item) => item.category === name));

      setVenue({ id: venueRow.id, slug: venueRow.slug, name: venueRow.name, categories, menuItems: mappedMenu, tableOptions });
      setActiveCategory(categories[0] ?? "");
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [slug]);

  function commitCart(updater: (c: StoredCartItem[]) => StoredCartItem[]) {
    writeCart(slug, updater(readCart(slug)));
  }

  function handleAddToCart(item: MenuItem) {
    commitCart((cur) => {
      const existing = cur.find((e) => e.itemId === item.id);
      if (existing) return cur.map((e) => e.itemId === item.id ? { ...e, quantity: e.quantity + 1 } : e);
      return [...cur, toCartItem(item)];
    });
  }

  function updateQty(itemId: string, next: number) {
    commitCart((cur) => {
      if (next <= 0) return cur.filter((i) => i.itemId !== itemId);
      return cur.map((i) => i.itemId === itemId ? { ...i, quantity: next } : i);
    });
  }

  function updateCheckout<K extends keyof CheckoutState>(k: K, v: CheckoutState[K]) {
    setCheckout((c) => ({ ...c, [k]: v }));
    setCheckoutError("");
  }

  async function handleSubmit() {
    if (!venue || cartItems.length === 0 || submitting) return;

    const name = checkout.customerName.trim();
    const email = checkout.customerEmail.trim();
    const notes = checkout.notes.trim();
    const cardName = checkout.cardholderName.trim();
    const cardLast = checkout.cardLastFour.trim();

    if (!name) { setCheckoutError("Please enter your name."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setCheckoutError("Please enter a valid email."); return; }
    if (checkout.fulfillmentType === "dine_in" && !checkout.tableId) { setCheckoutError("Select a table for dine-in."); return; }
    if (checkout.paymentMethod === "card") {
      if (!cardName) { setCheckoutError("Enter cardholder name."); return; }
      if (!/^\d{4}$/.test(cardLast)) { setCheckoutError("Enter last 4 digits of card."); return; }
    }

    setSubmitting(true);
    setCheckoutError("");

    const orderDbId = crypto.randomUUID();
    const publicCode = createOrderId();
    const placedAt = new Date().toISOString();
    const paymentLabel = checkout.paymentMethod === "card"
      ? `${cardName} •••• ${cardLast}`
      : checkout.paymentMethod === "apple_pay" ? "Apple Pay" : "Pay At Venue";

    const tableLabel = venue.tableOptions.find((t) => t.id === checkout.tableId)?.label ?? checkout.tableId;

    const orderItems = cartItems.map((i) => ({
      order_id: orderDbId,
      menu_item_id: i.itemId,
      name: i.name,
      description: i.description,
      category_name: i.category,
      unit_price: i.price,
      quantity: i.quantity,
      line_total: Number((i.price * i.quantity).toFixed(2)),
    }));

    const order: StoredOrder = {
      id: publicCode,
      venueSlug: venue.slug,
      venueName: venue.name,
      createdAt: placedAt,
      customerName: name,
      customerEmail: email,
      notes,
      fulfillmentType: checkout.fulfillmentType,
      selectedTableId: checkout.fulfillmentType === "dine_in" ? tableLabel : null,
      paymentMethod: checkout.paymentMethod,
      cardLabel: checkout.paymentMethod === "card" ? `${cardName} **** ${cardLast}` : null,
      subtotal, serviceFee, total,
      items: cartItems,
      status: "submitted",
    };

    const { error: rpcErr } = await publicSupabase.rpc("create_order_with_items", {
      p_order_id: orderDbId, p_venue_id: venue.id, p_public_order_code: publicCode,
      p_customer_name: name, p_customer_email: email, p_notes: notes,
      p_fulfillment_type: checkout.fulfillmentType,
      p_table_identifier: checkout.fulfillmentType === "dine_in" ? checkout.tableId : null,
      p_payment_method: checkout.paymentMethod, p_payment_label: paymentLabel,
      p_subtotal: subtotal, p_service_fee: serviceFee, p_total: total, p_placed_at: placedAt,
      p_items: orderItems.map(({ order_id: _, ...i }) => i),
    });

    let finalErr = rpcErr;

    if (isMissingRpc(rpcErr)) {
      const { error: insertErr } = await publicSupabase.from("orders").insert({
        id: orderDbId, venue_id: venue.id, public_order_code: publicCode,
        customer_name: name, customer_email: email, notes,
        fulfillment_type: checkout.fulfillmentType,
        table_identifier: checkout.fulfillmentType === "dine_in" ? checkout.tableId : null,
        payment_method: checkout.paymentMethod, payment_label: paymentLabel,
        subtotal, service_fee: serviceFee, total, status: "submitted",
        placed_at: placedAt, updated_at: placedAt,
      });
      if (!insertErr) {
        const { error: itemErr } = await publicSupabase.from("order_items").insert(orderItems);
        finalErr = itemErr;
      } else {
        finalErr = insertErr;
      }
    }

    if (finalErr) {
      setCheckoutError(finalErr.message || "Failed to place order. Please try again.");
      setSubmitting(false);
      return;
    }

    clearCart(venue.slug);
    setSubmittedOrder(order);
    setCheckout(defaultCheckout);
    setCheckoutExpanded(false);
    setSubmitting(false);
  }

  /* ─── Loading ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }
  if (!venue) notFound();

  /* ─── Render ──────────────────────────────────────── */
  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT: Menu content ─────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Category pills — sticky */}
        <div className="shrink-0 px-4 lg:px-6 pt-4 pb-3 border-b border-outline-variant/10 bg-surface">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {venue.categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {cat}
              </button>
            ))}
            <a
              href={AR_MENU_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-secondary-container text-on-secondary-container shrink-0"
            >
              View in AR ↗
            </a>
          </div>
        </div>

        {/* Menu items — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4">

          {/* Success banner */}
          {submittedOrder && (
            <div className="mb-4 rounded-2xl bg-surface-container-low p-4 flex gap-3 ring-1 ring-outline-variant/10">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Order Placed!</p>
                <p className="text-base font-extrabold text-on-surface">{submittedOrder.id}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {submittedOrder.fulfillmentType === "dine_in"
                    ? `Table ${submittedOrder.selectedTableId}`
                    : "Pickup at counter"} · {formatCurrency(submittedOrder.total)}
                </p>
              </div>
            </div>
          )}

          {venue.menuItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-2xl bg-surface-container-low flex items-center justify-center mb-3">
                <ShoppingBag size={22} className="text-on-surface-variant" />
              </div>
              <p className="text-sm font-semibold text-on-surface">No menu items yet</p>
              <p className="text-xs text-on-surface-variant mt-1">Check back soon.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {venue.categories.map((category) => {
                const items = venue.menuItems.filter((i) => i.category === category);
                if (activeCategory && activeCategory !== category) return null;
                return (
                  <section key={category}>
                    <h3 className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-primary mb-3">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {items.map((item) => {
                        const qty = cartItems.find((e) => e.itemId === item.id)?.quantity ?? 0;
                        return (
                          <div
                            key={item.id}
                            className="rounded-2xl bg-surface-container-low p-3.5 ring-1 ring-outline-variant/10 flex flex-col gap-3"
                            data-testid={`menu-item-${item.id}`}
                          >
                            <div className="flex gap-3">
                              {item.imagePath && (
                                <img
                                  src={item.imagePath}
                                  alt={item.name}
                                  className="h-16 w-16 rounded-xl object-cover shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-sm font-bold text-on-surface leading-tight">{item.name}</h4>
                                  <span className="text-sm font-extrabold text-primary shrink-0">{formatCurrency(item.price)}</span>
                                </div>
                                {item.description && (
                                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{item.description}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-on-surface-variant">
                                {qty > 0 ? `${qty} in cart` : ""}
                              </span>
                              <div className="flex items-center gap-2">
                                {qty > 0 && (
                                  <>
                                    <button
                                      onClick={() => updateQty(item.id, qty - 1)}
                                      data-testid={`decrease-item-${item.id}`}
                                      className="h-8 w-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-surface-container-highest transition-colors"
                                      aria-label={`Remove one ${item.name}`}
                                    >
                                      <Minus size={14} />
                                    </button>
                                    <span className="w-5 text-center text-sm font-bold text-on-surface" data-testid={`cart-qty-${item.id}`}>
                                      {qty}
                                    </span>
                                  </>
                                )}
                                <button
                                  onClick={() => handleAddToCart(item)}
                                  data-testid={`add-item-${item.id}`}
                                  className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-on-primary hover:bg-primary/90 transition-colors"
                                >
                                  <Plus size={13} />
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile sticky bottom cart bar */}
        <div className="lg:hidden shrink-0 border-t border-outline-variant/20 bg-surface">
          <button
            onClick={() => setCheckoutExpanded((v) => !v)}
            className="flex items-center justify-between w-full px-4 py-3.5"
            disabled={cartCount === 0}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag size={20} className={cartCount > 0 ? "text-primary" : "text-on-surface-variant"} />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[9px] font-extrabold text-on-primary">
                    {cartCount}
                  </span>
                )}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
                  {cartCount > 0 ? "Your cart" : "Cart empty"}
                </p>
                <p className="text-base font-extrabold text-on-surface leading-tight">{formatCurrency(total)}</p>
              </div>
            </div>
            {cartCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary">Checkout</span>
                {checkoutExpanded ? <ChevronDown size={16} className="text-primary" /> : <ChevronUp size={16} className="text-primary" />}
              </div>
            )}
          </button>

          {/* Mobile expanded checkout */}
          {checkoutExpanded && cartCount > 0 && (
            <div className="border-t border-outline-variant/10 overflow-y-auto max-h-[70vh]">
              <CartPanel
                cartItems={cartItems}
                tableOptions={venue.tableOptions}
                checkout={checkout}
                subtotal={subtotal}
                serviceFee={serviceFee}
                total={total}
                submitting={submitting}
                checkoutError={checkoutError}
                onUpdateQty={updateQty}
                onClearCart={() => clearCart(slug)}
                onCheckoutChange={updateCheckout}
                onSubmit={handleSubmit}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Desktop Cart Sidebar ─────────────────── */}
      <aside className="hidden lg:flex flex-col w-80 xl:w-[22rem] shrink-0 border-l border-outline-variant/20 bg-surface overflow-y-auto">
        <div className="px-5 py-4 border-b border-outline-variant/10 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-on-surface">Your Order</h2>
            {cartCount > 0 && (
              <button
                onClick={() => clearCart(slug)}
                className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <Trash2 size={12} />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {cartCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-surface-container-low flex items-center justify-center mb-3">
                <ShoppingBag size={20} className="text-on-surface-variant" />
              </div>
              <p className="text-sm font-semibold text-on-surface">Cart is empty</p>
              <p className="text-xs text-on-surface-variant mt-1">Add items from the menu</p>
            </div>
          ) : (
            <CartPanel
              cartItems={cartItems}
              tableOptions={venue.tableOptions}
              checkout={checkout}
              subtotal={subtotal}
              serviceFee={serviceFee}
              total={total}
              submitting={submitting}
              checkoutError={checkoutError}
              onUpdateQty={updateQty}
              onClearCart={() => clearCart(slug)}
              onCheckoutChange={updateCheckout}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

/* ─── CartPanel (shared desktop + mobile) ────────────── */

function CartPanel({
  cartItems,
  tableOptions,
  checkout,
  subtotal,
  serviceFee,
  total,
  submitting,
  checkoutError,
  onUpdateQty,
  onClearCart,
  onCheckoutChange,
  onSubmit,
}: {
  cartItems: StoredCartItem[];
  tableOptions: TableOption[];
  checkout: CheckoutState;
  subtotal: number;
  serviceFee: number;
  total: number;
  submitting: boolean;
  checkoutError: string;
  onUpdateQty: (id: string, qty: number) => void;
  onClearCart: () => void;
  onCheckoutChange: <K extends keyof CheckoutState>(k: K, v: CheckoutState[K]) => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <div className="px-4 lg:px-5 py-4 space-y-4">

      {/* Cart items */}
      <div className="space-y-2">
        {cartItems.map((item) => (
          <div key={item.itemId} className="flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2.5" data-testid={`cart-item-${item.itemId}`}>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{item.name}</p>
              <p className="text-[10px] text-on-surface-variant">{item.category}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => onUpdateQty(item.itemId, item.quantity - 1)} data-testid={`cart-decrease-${item.itemId}`} className="h-6 w-6 rounded-full bg-surface flex items-center justify-center text-on-surface" aria-label={`Decrease ${item.name}`}>
                <Minus size={11} />
              </button>
              <span className="w-4 text-center text-xs font-bold text-on-surface">{item.quantity}</span>
              <button onClick={() => onUpdateQty(item.itemId, item.quantity + 1)} data-testid={`cart-increase-${item.itemId}`} className="h-6 w-6 rounded-full bg-surface flex items-center justify-center text-on-surface" aria-label={`Increase ${item.name}`}>
                <Plus size={11} />
              </button>
            </div>
            <span className="text-xs font-extrabold text-primary shrink-0 w-12 text-right">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="rounded-xl bg-surface-container-low px-3 py-3 space-y-1.5">
        {[
          { label: "Subtotal", value: subtotal },
          { label: "Service fee (8%)", value: serviceFee },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-xs text-on-surface-variant">
            <span>{label}</span>
            <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-sm font-extrabold text-on-surface pt-1 border-t border-outline-variant/20">
          <span>Total</span>
          <span data-testid="checkout-total">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(total)}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-outline-variant/20" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Checkout</span>
        <div className="flex-1 h-px bg-outline-variant/20" />
      </div>

      {/* Guest details */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Name</label>
            <input
              data-testid="checkout-name"
              value={checkout.customerName}
              onChange={(e) => onCheckoutChange("customerName", e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
              placeholder="Jordan Guest"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Email</label>
            <input
              data-testid="checkout-email"
              type="email"
              value={checkout.customerEmail}
              onChange={(e) => onCheckoutChange("customerEmail", e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Fulfillment</label>
            <select
              data-testid="checkout-fulfillment"
              value={checkout.fulfillmentType}
              onChange={(e) => onCheckoutChange("fulfillmentType", e.target.value as FulfillmentType)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
            >
              <option value="pickup">Pickup</option>
              <option value="dine_in">Dine-in</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Table</label>
            <select
              data-testid="checkout-table"
              value={checkout.tableId}
              onChange={(e) => onCheckoutChange("tableId", e.target.value)}
              disabled={checkout.fulfillmentType !== "dine_in"}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs outline-none focus:border-primary transition-colors disabled:opacity-50"
            >
              <option value="">{checkout.fulfillmentType === "dine_in" ? "Select table" : "Pickup"}</option>
              {tableOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.label}{t.seats ? ` (${t.seats})` : ""}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Notes</label>
          <textarea
            data-testid="checkout-notes"
            value={checkout.notes}
            onChange={(e) => onCheckoutChange("notes", e.target.value)}
            className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs outline-none focus:border-primary transition-colors min-h-16 resize-none"
            placeholder="Allergies, preferences…"
          />
        </div>
      </div>

      {/* Payment */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Payment</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(["card", "apple_pay", "cash"] as PaymentMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              data-testid={`payment-${m}`}
              onClick={() => onCheckoutChange("paymentMethod", m)}
              className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                checkout.paymentMethod === m
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant/30 bg-surface-container-low text-on-surface hover:bg-surface-container"
              }`}
            >
              {m === "card" ? "Card" : m === "apple_pay" ? "Apple Pay" : "Pay Later"}
            </button>
          ))}
        </div>

        {checkout.paymentMethod === "card" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Cardholder</label>
              <input
                data-testid="cardholder-name"
                value={checkout.cardholderName}
                onChange={(e) => onCheckoutChange("cardholderName", e.target.value)}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Last 4</label>
              <input
                data-testid="card-last-four"
                value={checkout.cardLastFour}
                onChange={(e) => onCheckoutChange("cardLastFour", e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs outline-none focus:border-primary transition-colors"
                inputMode="numeric"
                placeholder="4242"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {checkoutError && (
        <p className="rounded-xl bg-secondary-container px-3 py-2.5 text-xs text-on-secondary-container" data-testid="checkout-error">
          {checkoutError}
        </p>
      )}

      {/* Submit */}
      <button
        type="button"
        data-testid="submit-order-button"
        onClick={onSubmit}
        disabled={cartItems.length === 0 || submitting}
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
      >
        {submitting ? (
          <><Loader2 size={15} className="animate-spin" /> Placing order…</>
        ) : (
          <>Submit Order <ArrowRight size={14} /></>
        )}
      </button>
    </div>
  );
}
