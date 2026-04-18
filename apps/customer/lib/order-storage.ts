export type FulfillmentType = "dine_in" | "pickup";
export type PaymentMethod = "card" | "apple_pay" | "cash";

export interface StoredCartItem {
  itemId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  quantity: number;
}

export interface StoredOrder {
  id: string;
  venueSlug: string;
  venueName: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  notes: string;
  fulfillmentType: FulfillmentType;
  selectedTableId: string | null;
  paymentMethod: PaymentMethod;
  cardLabel: string | null;
  subtotal: number;
  serviceFee: number;
  total: number;
  items: StoredCartItem[];
  status: "submitted";
}

const cartSnapshotCache = new Map<string, { raw: string | null; value: StoredCartItem[] }>();

function cartKey(venueSlug: string) {
  return `socialize:cart:${venueSlug}`;
}

function cartEventKey(venueSlug: string) {
  return `${cartKey(venueSlug)}:changed`;
}

function ordersKey(venueSlug: string) {
  return `socialize:orders:${venueSlug}`;
}

function safeParse<T>(value: string | null, fallback: T) {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function readCart(venueSlug: string) {
  if (typeof window === "undefined") return [] as StoredCartItem[];
  const raw = window.localStorage.getItem(cartKey(venueSlug));
  const cached = cartSnapshotCache.get(venueSlug);

  if (cached && cached.raw === raw) {
    return cached.value;
  }

  const nextValue = safeParse<StoredCartItem[]>(raw, []);
  cartSnapshotCache.set(venueSlug, { raw, value: nextValue });
  return nextValue;
}

export function writeCart(venueSlug: string, items: StoredCartItem[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(items);
  window.localStorage.setItem(cartKey(venueSlug), raw);
  cartSnapshotCache.set(venueSlug, { raw, value: items });
  window.dispatchEvent(new CustomEvent(cartEventKey(venueSlug)));
}

export function clearCart(venueSlug: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(cartKey(venueSlug));
  cartSnapshotCache.set(venueSlug, { raw: null, value: [] });
  window.dispatchEvent(new CustomEvent(cartEventKey(venueSlug)));
}

export function readOrders(venueSlug: string) {
  if (typeof window === "undefined") return [] as StoredOrder[];
  return safeParse<StoredOrder[]>(window.localStorage.getItem(ordersKey(venueSlug)), []);
}

export function appendOrder(venueSlug: string, order: StoredOrder) {
  if (typeof window === "undefined") return;
  const existing = readOrders(venueSlug);
  window.localStorage.setItem(ordersKey(venueSlug), JSON.stringify([order, ...existing]));
}

export function subscribeCart(venueSlug: string, callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === cartKey(venueSlug)) {
      callback();
    }
  };

  const handleCustom = () => {
    callback();
  };

  const customEvent = cartEventKey(venueSlug);
  window.addEventListener("storage", handleStorage);
  window.addEventListener(customEvent, handleCustom);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(customEvent, handleCustom);
  };
}
