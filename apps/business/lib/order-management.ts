import { supabase } from "@/lib/supabase";

export type DashboardWindow = "Today" | "Week" | "Month" | "All Time";

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

export interface MenuItemSummary {
  id: string;
  name: string;
  imagePath: string | null;
}

export interface VenueOrderContext {
  venue: {
    id: string;
    name: string;
    slug: string;
  } | null;
  tableCount: number;
  orders: OrderRecord[];
  menuItems: MenuItemSummary[];
}

export interface TopSellerData {
  name: string;
  orders: number;
  revenue: string;
  imagePath: string | null;
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
  totalOrders: number;
  avgCompletionMinutes: number | null;
  revenueToday: number;
  seatingUtilization: number;
  availableTables: number;
  topSellers: TopSellerData[];
  revenueMiniBarHeights: number[];
  revenueTrend: RevenueTrendPoint[];
  revenueYLabels: string[];
  revenueComparisonLabel: string;
  revenueTrendSubtitle: string;
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

function windowStart(w: DashboardWindow, now: Date): Date | null {
  if (w === "Today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (w === "Week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (w === "Month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  return null;
}

function windowLabel(w: DashboardWindow): string {
  if (w === "Today") return "today";
  if (w === "Week") return "this week";
  if (w === "Month") return "this month";
  return "all time";
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

interface TrendBuild {
  points: RevenueTrendPoint[];
  yMax: number;
  subtitle: string;
}

function sumOrders(orders: OrderRecord[], from: Date, to: Date): number {
  let total = 0;
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const t = new Date(order.placedAt).getTime();
    if (t >= from.getTime() && t < to.getTime()) total += order.total;
  }
  return total;
}

function buildTrendForWindow(
  orders: OrderRecord[],
  window: DashboardWindow,
  now: Date,
): TrendBuild {
  if (window === "Today") {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = shiftDay(startOfToday, -1);
    const bands = [
      { label: "Morning", hours: [6, 12] },
      { label: "Midday", hours: [12, 17] },
      { label: "Evening", hours: [17, 22] },
      { label: "Late", hours: [22, 30] },
    ];
    const points = bands.map((b) => {
      const curFrom = new Date(startOfToday);
      curFrom.setHours(b.hours[0], 0, 0, 0);
      const curTo = new Date(startOfToday);
      curTo.setHours(b.hours[1], 0, 0, 0);
      const prevFrom = new Date(startOfYesterday);
      prevFrom.setHours(b.hours[0], 0, 0, 0);
      const prevTo = new Date(startOfYesterday);
      prevTo.setHours(b.hours[1], 0, 0, 0);
      return {
        day: b.label,
        current: sumOrders(orders, curFrom, curTo),
        previous: sumOrders(orders, prevFrom, prevTo),
      };
    });
    const yMax = Math.max(...points.flatMap((p) => [p.current, p.previous]), 0);
    return { points, yMax, subtitle: "Today vs yesterday" };
  }

  if (window === "Week") {
    const buckets = buildRevenueBuckets(orders, 14, now);
    const cur = buckets.slice(7);
    const prev = buckets.slice(0, 7);
    const points = cur.map((bucket, i) => ({
      day: bucket.day.toLocaleDateString("en-US", { weekday: "short" }),
      current: bucket.total,
      previous: prev[i]?.total ?? 0,
    }));
    const yMax = Math.max(...buckets.map((b) => b.total), 0);
    return { points, yMax, subtitle: "Last 7 days vs previous week" };
  }

  if (window === "Month") {
    const points: RevenueTrendPoint[] = [];
    let yMax = 0;
    for (let i = 3; i >= 0; i--) {
      const curTo = shiftDay(now, -i * 7);
      const curFrom = shiftDay(curTo, -7);
      const prevTo = shiftDay(curFrom, 0);
      const prevFrom = shiftDay(curFrom, -7 * 4);
      const cur = sumOrders(orders, curFrom, curTo);
      const prev = sumOrders(orders, shiftDay(curFrom, -28), shiftDay(curTo, -28));
      points.push({
        day: i === 0 ? "This wk" : `-${i}w`,
        current: cur,
        previous: prev,
      });
      yMax = Math.max(yMax, cur, prev);
    }
    return { points, yMax, subtitle: "Last 4 weeks vs previous 4 weeks" };
  }

  // All Time: monthly since earliest order
  const nonCancelled = orders.filter((o) => o.status !== "cancelled");
  if (nonCancelled.length === 0) {
    return { points: [], yMax: 0, subtitle: "Monthly since inception" };
  }
  const earliest = new Date(
    Math.min(...nonCancelled.map((o) => new Date(o.placedAt).getTime())),
  );
  const startMonth = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const months: Date[] = [];
  const cursor = new Date(startMonth);
  while (cursor <= endMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const recent = months.slice(-12);
  const points = recent.map((m) => {
    const from = m;
    const to = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    return {
      day: m.toLocaleDateString("en-US", { month: "short" }),
      current: sumOrders(orders, from, to),
      previous: 0,
    };
  });
  const yMax = Math.max(...points.map((p) => p.current), 0);
  return { points, yMax, subtitle: "Monthly since inception" };
}

export async function fetchOwnedVenueOrders(limit = 200): Promise<VenueOrderContext> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) {
    return { venue: null, tableCount: 0, orders: [], menuItems: [] };
  }

  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("id, name, slug")
    .eq("owner_id", user.id)
    .single();

  if (venueError) {
    if (isMissingRowError(venueError)) {
      return { venue: null, tableCount: 0, orders: [], menuItems: [] };
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

  const { data: menuItemRows } = await supabase
    .from("menu_items")
    .select("id, name, image_path, menu_categories!inner(venue_id)")
    .eq("menu_categories.venue_id", venue.id);

  const menuItems: MenuItemSummary[] = ((menuItemRows ?? []) as Array<{
    id: string;
    name: string;
    image_path: string | null;
  }>).map((row) => ({
    id: row.id,
    name: row.name,
    imagePath: row.image_path,
  }));

  return {
    venue,
    tableCount,
    orders: ((orderRows ?? []) as OrderRow[]).map(toOrderRecord),
    menuItems,
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
  window: DashboardWindow = "Today",
  menuItems: MenuItemSummary[] = [],
): OrderDashboardMetrics {
  const now = new Date();
  const activeOrders = orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status));
  const readyOrders = orders.filter((order) => order.status === "ready").length;

  const startAt = windowStart(window, now);
  const windowed = startAt
    ? orders.filter((order) => new Date(order.placedAt) >= startAt)
    : orders;
  const windowedCompleted = windowed.filter((order) => order.status === "completed");
  const windowedNonCancelled = windowed.filter((order) => order.status !== "cancelled");

  const avgCompletionMinutes =
    windowedCompleted.length > 0
      ? Math.round(
          windowedCompleted.reduce((sum, order) => {
            const placedAt = new Date(order.placedAt).getTime();
            const completedAt = new Date(order.updatedAt).getTime();
            return sum + Math.max((completedAt - placedAt) / 60000, 0);
          }, 0) / windowedCompleted.length,
        )
      : null;

  const trend = buildTrendForWindow(orders, window, now);
  const revenueBuckets = buildRevenueBuckets(orders, 14, now);
  const windowRevenue = windowedNonCancelled.reduce((sum, order) => sum + order.total, 0);

  const previousWindowOrders = (() => {
    if (!startAt) return [];
    const windowMs = now.getTime() - startAt.getTime();
    const prevStart = new Date(startAt.getTime() - windowMs);
    return orders.filter((order) => {
      if (order.status === "cancelled") return false;
      const placed = new Date(order.placedAt);
      return placed >= prevStart && placed < startAt;
    });
  })();
  const previousWindowRevenue = previousWindowOrders.reduce((sum, order) => sum + order.total, 0);

  const comparisonLabel = (() => {
    if (window === "All Time") {
      return windowRevenue > 0 ? `${formatCurrency(windowRevenue)} all time` : "No orders yet";
    }
    if (previousWindowRevenue <= 0) {
      return windowRevenue > 0
        ? `${formatCurrency(windowRevenue)} ${windowLabel(window)}`
        : `No orders yet ${windowLabel(window)}`;
    }
    const pct = ((windowRevenue - previousWindowRevenue) / previousWindowRevenue) * 100;
    const prevLabel =
      window === "Today" ? "yesterday" : window === "Week" ? "last week" : "last month";
    return `${windowRevenue >= previousWindowRevenue ? "+" : ""}${pct.toFixed(1)}% vs ${prevLabel}`;
  })();

  const miniBarSource = revenueBuckets.slice(-6).map((bucket) => bucket.total);
  const miniBarMax = Math.max(...miniBarSource, 0);
  const revenueMiniBarHeights =
    miniBarMax > 0
      ? miniBarSource.map((total) => Math.max(18, Math.round((total / miniBarMax) * 100)))
      : [18, 18, 18, 18, 18, 18];

  const revenueTrend = trend.points;
  const revenueYLabels =
    trend.yMax > 0
      ? [4, 3, 2, 1, 0].map((index) => formatCompactDollar((trend.yMax / 4) * index))
      : ["$0", "$0", "$0", "$0", "$0"];

  const imageByMenuId = new Map<string, string | null>();
  const imageByName = new Map<string, string | null>();
  for (const mi of menuItems) {
    imageByMenuId.set(mi.id, mi.imagePath);
    imageByName.set(mi.name, mi.imagePath);
  }

  const topSellerMap = new Map<
    string,
    { quantity: number; revenue: number; menuItemId: string | null }
  >();
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    for (const item of order.items) {
      const current = topSellerMap.get(item.name) ?? {
        quantity: 0,
        revenue: 0,
        menuItemId: item.menuItemId ?? null,
      };
      topSellerMap.set(item.name, {
        quantity: current.quantity + item.quantity,
        revenue: current.revenue + item.lineTotal,
        menuItemId: current.menuItemId ?? item.menuItemId ?? null,
      });
    }
  }

  const topSellers = Array.from(topSellerMap.entries())
    .map(([name, aggregate]) => ({
      name,
      orders: aggregate.quantity,
      revenueValue: aggregate.revenue,
      menuItemId: aggregate.menuItemId,
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
      imagePath:
        (item.menuItemId ? imageByMenuId.get(item.menuItemId) : null) ??
        imageByName.get(item.name) ??
        null,
    }));

  const currentlyOccupiedTables = new Set(
    activeOrders
      .filter((order) => order.fulfillmentType === "dine_in" && order.tableIdentifier)
      .map((order) => order.tableIdentifier),
  );
  const currentlyOccupiedCount = currentlyOccupiedTables.size;

  let seatingUtilization = 0;
  if (tableCount > 0) {
    const dineInOrders = windowedNonCancelled.filter(
      (order) => order.fulfillmentType === "dine_in" && order.tableIdentifier,
    );
    const tablesByDay = new Map<string, Set<string>>();
    for (const order of dineInOrders) {
      const key = dateKey(new Date(order.placedAt));
      const set = tablesByDay.get(key) ?? new Set<string>();
      set.add(order.tableIdentifier as string);
      tablesByDay.set(key, set);
    }
    if (tablesByDay.size > 0) {
      const avgTablesPerDay =
        Array.from(tablesByDay.values()).reduce((sum, s) => sum + s.size, 0) /
        tablesByDay.size;
      seatingUtilization = Math.min(
        100,
        Math.round((avgTablesPerDay / tableCount) * 100),
      );
    }
  }

  return {
    activeOrders: activeOrders.length,
    readyOrders,
    completedToday: windowedCompleted.length,
    totalOrders: windowedNonCancelled.length,
    avgCompletionMinutes,
    revenueToday: windowRevenue,
    seatingUtilization,
    availableTables: Math.max(tableCount - currentlyOccupiedCount, 0),
    topSellers,
    revenueMiniBarHeights,
    revenueTrend,
    revenueYLabels,
    revenueComparisonLabel: comparisonLabel,
    revenueTrendSubtitle: trend.subtitle,
  };
}
