import { supabase } from "@/lib/supabase";

export type OrderStatus = "submitted" | "preparing" | "ready" | "completed" | "cancelled";
export type FulfillmentType = "dine_in" | "pickup";
export type PaymentMethod = "card" | "apple_pay" | "cash";

export interface OrderItemRecord {
  id: string;
  menuItemId: string | null;
  name: string;
  description: string;
  categoryName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderRecord {
  id: string;
  publicOrderCode: string;
  customerName: string;
  customerEmail: string;
  notes: string;
  fulfillmentType: FulfillmentType;
  tableIdentifier: string | null;
  paymentMethod: PaymentMethod;
  paymentLabel: string | null;
  subtotal: number;
  serviceFee: number;
  total: number;
  status: OrderStatus;
  placedAt: string;
  updatedAt: string;
  items: OrderItemRecord[];
}

export interface VenueOrderContext {
  venue: {
    id: string;
    name: string;
    slug: string;
  } | null;
  tableCount: number;
  orders: OrderRecord[];
}

export interface TopSellerData {
  name: string;
  orders: number;
  revenue: string;
}

export interface RevenueTrendPoint {
  day: string;
  current: number;
  previous: number;
}

export interface OrderDashboardMetrics {
  activeOrders: number;
  readyOrders: number;
  completedToday: number;
  avgCompletionMinutes: number | null;
  revenueToday: number;
  seatingUtilization: number;
  availableTables: number;
  topSellers: TopSellerData[];
  revenueMiniBarHeights: number[];
  revenueTrend: RevenueTrendPoint[];
  revenueYLabels: string[];
  revenueComparisonLabel: string;
}

type OrderRow = {
  id: string;
  public_order_code: string;
  customer_name: string;
  customer_email: string;
  notes: string | null;
  fulfillment_type: FulfillmentType;
  table_identifier: string | null;
  payment_method: PaymentMethod;
  payment_label: string | null;
  subtotal: number | string;
  service_fee: number | string;
  total: number | string;
  status: OrderStatus;
  placed_at: string;
  updated_at: string;
  order_items:
    | {
        id: string;
        menu_item_id: string | null;
        name: string;
        description: string | null;
        category_name: string | null;
        unit_price: number | string;
        quantity: number;
        line_total: number | string;
      }[]
    | null;
};

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["submitted", "preparing", "ready"];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  submitted: "Submitted",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  submitted: "bg-primary-container/25 text-primary",
  preparing: "bg-tertiary-container/25 text-tertiary",
  ready: "bg-secondary-container/50 text-secondary",
  completed: "bg-surface-container-high text-on-surface",
  cancelled: "bg-error-container/60 text-error",
};

function parseAmount(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function dateKey(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function isSameDay(left: Date, right: Date) {
  return dateKey(left) === dateKey(right);
}

function shiftDay(base: Date, delta: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + delta);
  return next;
}

function formatCompactDollar(value: number) {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return `$${Math.round(value)}`;
}

function toOrderRecord(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    publicOrderCode: row.public_order_code,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    notes: row.notes ?? "",
    fulfillmentType: row.fulfillment_type,
    tableIdentifier: row.table_identifier,
    paymentMethod: row.payment_method,
    paymentLabel: row.payment_label,
    subtotal: parseAmount(row.subtotal),
    serviceFee: parseAmount(row.service_fee),
    total: parseAmount(row.total),
    status: row.status,
    placedAt: row.placed_at,
    updatedAt: row.updated_at,
    items: Array.isArray(row.order_items)
      ? row.order_items.map((item) => ({
          id: item.id,
          menuItemId: item.menu_item_id,
          name: item.name,
          description: item.description ?? "",
          categoryName: item.category_name ?? "Other",
          unitPrice: parseAmount(item.unit_price),
          quantity: item.quantity,
          lineTotal: parseAmount(item.line_total),
        }))
      : [],
  };
}

function isMissingRowError(error: { code?: string } | null) {
  return error?.code === "PGRST116";
}

function buildRevenueBuckets(orders: OrderRecord[], days: number, now: Date) {
  const totalsByDay = new Map<string, number>();

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const key = dateKey(new Date(order.placedAt));
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + order.total);
  }

  return Array.from({ length: days }, (_, index) => {
    const day = shiftDay(now, -(days - index - 1));
    return {
      day,
      total: totalsByDay.get(dateKey(day)) ?? 0,
    };
  });
}

export async function fetchOwnedVenueOrders(limit = 200): Promise<VenueOrderContext> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) {
    return { venue: null, tableCount: 0, orders: [] };
  }

  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("id, name, slug")
    .eq("owner_id", user.id)
    .single();

  if (venueError) {
    if (isMissingRowError(venueError)) {
      return { venue: null, tableCount: 0, orders: [] };
    }

    throw venueError;
  }

  const { data: zones, error: zonesError } = await supabase
    .from("zones")
    .select("id")
    .eq("venue_id", venue.id);

  if (zonesError) throw zonesError;

  const zoneIds = (zones ?? []).map((zone) => zone.id);
  let tableCount = 0;

  if (zoneIds.length > 0) {
    const { data: tables, error: tablesError } = await supabase
      .from("tables")
      .select("identifier")
      .in("zone_id", zoneIds);

    if (tablesError) throw tablesError;
    tableCount = tables?.length ?? 0;
  }

  let orderQuery = supabase
    .from("orders")
    .select(
      "id, public_order_code, customer_name, customer_email, notes, fulfillment_type, table_identifier, payment_method, payment_label, subtotal, service_fee, total, status, placed_at, updated_at, order_items(id, menu_item_id, name, description, category_name, unit_price, quantity, line_total)",
    )
    .eq("venue_id", venue.id)
    .order("placed_at", { ascending: false });

  if (limit > 0) {
    orderQuery = orderQuery.limit(limit);
  }

  const { data: orderRows, error: orderError } = await orderQuery;
  if (orderError) throw orderError;

  return {
    venue,
    tableCount,
    orders: ((orderRows ?? []) as OrderRow[]).map(toOrderRecord),
  };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatOrderTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatFulfillmentLabel(order: Pick<OrderRecord, "fulfillmentType" | "tableIdentifier">) {
  if (order.fulfillmentType === "dine_in") {
    return order.tableIdentifier ? `Dine-in · ${order.tableIdentifier}` : "Dine-in";
  }

  return "Pickup";
}

export function getNextOrderStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case "submitted":
      return "preparing";
    case "preparing":
      return "ready";
    case "ready":
      return "completed";
    default:
      return null;
  }
}

export function getOrderActionLabel(status: OrderStatus) {
  switch (status) {
    case "submitted":
      return "Start Preparing";
    case "preparing":
      return "Mark Ready";
    case "ready":
      return "Complete Order";
    default:
      return null;
  }
}

export function buildOrderDashboardMetrics(
  orders: OrderRecord[],
  tableCount: number,
): OrderDashboardMetrics {
  const now = new Date();
  const activeOrders = orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status));
  const readyOrders = orders.filter((order) => order.status === "ready").length;
  const completedOrders = orders.filter((order) => order.status === "completed");
  const completedToday = completedOrders.filter((order) => isSameDay(new Date(order.updatedAt), now));
  const completionSource = completedToday.length > 0 ? completedToday : completedOrders;
  const avgCompletionMinutes =
    completionSource.length > 0
      ? Math.round(
          completionSource.reduce((sum, order) => {
            const placedAt = new Date(order.placedAt).getTime();
            const completedAt = new Date(order.updatedAt).getTime();
            return sum + Math.max((completedAt - placedAt) / 60000, 0);
          }, 0) / completionSource.length,
        )
      : null;

  const revenueBuckets = buildRevenueBuckets(orders, 14, now);
  const currentWeek = revenueBuckets.slice(7);
  const previousWeek = revenueBuckets.slice(0, 7);
  const todayRevenue = currentWeek[currentWeek.length - 1]?.total ?? 0;
  const yesterdayRevenue = currentWeek[currentWeek.length - 2]?.total ?? 0;
  const comparisonLabel =
    yesterdayRevenue <= 0
      ? todayRevenue > 0
        ? `${formatCurrency(todayRevenue)} today`
        : "No orders yet today"
      : `${todayRevenue >= yesterdayRevenue ? "+" : ""}${(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1)}% vs yesterday`;

  const miniBarSource = revenueBuckets.slice(-6).map((bucket) => bucket.total);
  const miniBarMax = Math.max(...miniBarSource, 0);
  const revenueMiniBarHeights =
    miniBarMax > 0
      ? miniBarSource.map((total) => Math.max(18, Math.round((total / miniBarMax) * 100)))
      : [18, 18, 18, 18, 18, 18];

  const chartMax = Math.max(...revenueBuckets.map((bucket) => bucket.total), 0);
  const revenueTrend = currentWeek.map((bucket, index) => ({
    day: bucket.day.toLocaleDateString("en-US", { weekday: "short" }),
    current: bucket.total,
    previous: previousWeek[index]?.total ?? 0,
  }));

  const revenueYLabels =
    chartMax > 0
      ? [4, 3, 2, 1, 0].map((index) => formatCompactDollar((chartMax / 4) * index))
      : ["$0", "$0", "$0", "$0", "$0"];

  const topSellerMap = new Map<string, { quantity: number; revenue: number }>();
  for (const order of orders) {
    if (order.status === "cancelled") continue;

    for (const item of order.items) {
      const current = topSellerMap.get(item.name) ?? { quantity: 0, revenue: 0 };
      topSellerMap.set(item.name, {
        quantity: current.quantity + item.quantity,
        revenue: current.revenue + item.lineTotal,
      });
    }
  }

  const topSellers = Array.from(topSellerMap.entries())
    .map(([name, aggregate]) => ({
      name,
      orders: aggregate.quantity,
      revenueValue: aggregate.revenue,
    }))
    .sort((left, right) => {
      if (right.orders !== left.orders) return right.orders - left.orders;
      return right.revenueValue - left.revenueValue;
    })
    .slice(0, 3)
    .map((item) => ({
      name: item.name,
      orders: item.orders,
      revenue: formatCurrency(item.revenueValue),
    }));

  const occupiedTables = new Set(
    activeOrders
      .filter((order) => order.fulfillmentType === "dine_in" && order.tableIdentifier)
      .map((order) => order.tableIdentifier),
  );
  const occupiedTableCount = occupiedTables.size;
  const seatingUtilization = tableCount > 0 ? Math.round((occupiedTableCount / tableCount) * 100) : 0;

  return {
    activeOrders: activeOrders.length,
    readyOrders,
    completedToday: completedToday.length,
    avgCompletionMinutes,
    revenueToday: todayRevenue,
    seatingUtilization,
    availableTables: Math.max(tableCount - occupiedTableCount, 0),
    topSellers,
    revenueMiniBarHeights,
    revenueTrend,
    revenueYLabels,
    revenueComparisonLabel: comparisonLabel,
  };
}
