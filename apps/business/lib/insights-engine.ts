import type { SupabaseClient } from "@supabase/supabase-js";

export type SignalKind =
  | "trend_up"
  | "trend_down"
  | "anomaly"
  | "zero_activity"
  | "threshold"
  | "cohort_pattern";

export interface Signal {
  kind: SignalKind;
  metric: string;
  value?: number;
  delta?: number;
  comparison?: string;
  context?: string;
  significance: 1 | 2 | 3;
  evidence: string;
}

interface OrderRow {
  id: string;
  total: number | string;
  status: string;
  fulfillment_type: string;
  table_identifier: string | null;
  placed_at: string;
}

interface OrderItemRow {
  order_id: string;
  name: string;
  quantity: number;
  line_total: number | string;
}

interface ScanRow {
  session_id: string;
  scanned_at: string;
}

interface MenuItemRow {
  id: string;
  name: string;
  is_active: boolean;
  category_id: string;
}

interface ActiveUserRow {
  occupation: string;
  table_id: string | null;
  last_seen: string;
}

const COHORT_MATCH_WINDOW_MIN = 15;
const COHORT_MIN_OBSERVATIONS = 3;

const WINDOW_DAYS = 30;
const RECENT_WINDOW_DAYS = 7;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function num(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

export interface InsightsDataset {
  orders: OrderRow[];
  orderItemsByOrder: Map<string, OrderItemRow[]>;
  scans: ScanRow[];
  activeMenuItems: MenuItemRow[];
  activeUsers: ActiveUserRow[];
  activeUsersPrevWindow: ActiveUserRow[];
  windowStart: Date;
  usedFallback: boolean;
}

export async function loadInsightsDataset(
  supabase: SupabaseClient,
  venueId: string,
): Promise<InsightsDataset> {
  const since30 = daysAgo(WINDOW_DAYS).toISOString();

  // Try last 30 days; fall back to all-time if empty.
  let { data: orderRows } = await supabase
    .from("orders")
    .select("id, total, status, fulfillment_type, table_identifier, placed_at")
    .eq("venue_id", venueId)
    .gte("placed_at", since30)
    .order("placed_at", { ascending: false });

  let windowStart: Date = daysAgo(WINDOW_DAYS);
  let usedFallback = false;

  if (!orderRows || orderRows.length === 0) {
    const res = await supabase
      .from("orders")
      .select("id, total, status, fulfillment_type, table_identifier, placed_at")
      .eq("venue_id", venueId)
      .order("placed_at", { ascending: false });
    orderRows = res.data ?? [];
    if (orderRows.length > 0) {
      windowStart = new Date(orderRows[orderRows.length - 1]!.placed_at);
      usedFallback = true;
    }
  }

  const orders: OrderRow[] = (orderRows ?? []) as OrderRow[];
  const orderIds = orders.map((o) => o.id);

  const orderItemsByOrder = new Map<string, OrderItemRow[]>();
  if (orderIds.length > 0) {
    const { data: itemRows } = await supabase
      .from("order_items")
      .select("order_id, name, quantity, line_total")
      .in("order_id", orderIds);
    for (const row of (itemRows ?? []) as OrderItemRow[]) {
      const arr = orderItemsByOrder.get(row.order_id) ?? [];
      arr.push(row);
      orderItemsByOrder.set(row.order_id, arr);
    }
  }

  const { data: scanRows } = await supabase
    .from("qr_scans")
    .select("session_id, scanned_at")
    .eq("venue_id", venueId)
    .gte("scanned_at", windowStart.toISOString());

  const { data: menuRows } = await supabase
    .from("menu_items")
    .select("id, name, is_active, category_id, menu_categories!inner(venue_id)")
    .eq("menu_categories.venue_id", venueId)
    .eq("is_active", true);

  const since14 = daysAgo(RECENT_WINDOW_DAYS * 2).toISOString();
  const { data: activeUserRows } = await supabase
    .from("active_users")
    .select("occupation, table_id, last_seen")
    .eq("venue_id", venueId)
    .gte("last_seen", since14);

  const currentWindowStart = daysAgo(RECENT_WINDOW_DAYS).getTime();
  const allActive = ((activeUserRows ?? []) as ActiveUserRow[]).filter(
    (u) => typeof u.occupation === "string" && u.occupation.trim().length > 0,
  );
  const activeUsers = allActive.filter(
    (u) => new Date(u.last_seen).getTime() >= currentWindowStart,
  );
  const activeUsersPrevWindow = allActive.filter(
    (u) => new Date(u.last_seen).getTime() < currentWindowStart,
  );

  return {
    orders,
    orderItemsByOrder,
    scans: (scanRows ?? []) as ScanRow[],
    activeMenuItems: ((menuRows ?? []) as Array<{
      id: string;
      name: string;
      is_active: boolean;
      category_id: string;
    }>).map((m) => ({
      id: m.id,
      name: m.name,
      is_active: m.is_active,
      category_id: m.category_id,
    })),
    activeUsers,
    activeUsersPrevWindow,
    windowStart,
    usedFallback,
  };
}

function normalizeOccupation(occupation: string): string {
  return occupation.trim().replace(/^./, (c) => c.toUpperCase());
}

function parseTableIdentifier(compositeId: string | null): string | null {
  if (!compositeId) return null;
  const parts = compositeId.split(":");
  if (parts.length < 2) return null;
  const ident = parts[1];
  return ident && ident.length > 0 ? ident : null;
}

function computeCohortSignals(
  activeUsers: ActiveUserRow[],
  activeUsersPrev: ActiveUserRow[],
  orders: OrderRow[],
  orderItemsByOrder: Map<string, OrderItemRow[]>,
): Signal[] {
  if (activeUsers.length === 0) return [];

  const signals: Signal[] = [];

  const byOccupation = new Map<string, ActiveUserRow[]>();
  for (const u of activeUsers) {
    const k = normalizeOccupation(u.occupation);
    const arr = byOccupation.get(k) ?? [];
    arr.push(u);
    byOccupation.set(k, arr);
  }
  const byOccupationPrev = new Map<string, number>();
  for (const u of activeUsersPrev) {
    const k = normalizeOccupation(u.occupation);
    byOccupationPrev.set(k, (byOccupationPrev.get(k) ?? 0) + 1);
  }

  // 1. Cohort growth
  for (const [occ, visits] of byOccupation.entries()) {
    const current = visits.length;
    const previous = byOccupationPrev.get(occ) ?? 0;
    if (current < COHORT_MIN_OBSERVATIONS) continue;
    if (previous === 0) {
      signals.push({
        kind: "cohort_pattern",
        metric: "cohort_growth",
        context: occ,
        value: current,
        significance: 2,
        evidence: `${occ} check-ins: ${current} this week, 0 the week before — a new cohort arriving.`,
      });
      continue;
    }
    const delta = ((current - previous) / previous) * 100;
    if (Math.abs(delta) >= 25) {
      signals.push({
        kind: "cohort_pattern",
        metric: "cohort_growth",
        context: occ,
        value: current,
        delta: Math.round(delta * 10) / 10,
        comparison: "vs previous week",
        significance: Math.abs(delta) >= 50 ? 3 : 2,
        evidence: `${occ} check-ins are ${delta >= 0 ? "up" : "down"} ${Math.abs(delta).toFixed(1)}% this week (${current} visits vs ${previous} the week before).`,
      });
    }
  }

  // 2. Cohort hour cluster
  for (const [occ, visits] of byOccupation.entries()) {
    if (visits.length < COHORT_MIN_OBSERVATIONS) continue;
    const hourCounts: Record<number, number> = {};
    for (const v of visits) {
      const h = new Date(v.last_seen).getHours();
      hourCounts[h] = (hourCounts[h] ?? 0) + 1;
    }
    const sorted = Object.entries(hourCounts).sort(([, a], [, b]) => b - a);
    if (sorted.length === 0) continue;
    const [peakHourStr, peakCount] = sorted[0];
    const peakHour = Number(peakHourStr);
    const share = peakCount / visits.length;
    if (share < 0.3) continue;
    const bandStart = Math.max(0, peakHour - 1);
    const bandEnd = Math.min(23, peakHour + 2);
    const fmt = (h: number) =>
      h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;
    signals.push({
      kind: "cohort_pattern",
      metric: "cohort_hour_cluster",
      context: occ,
      value: Math.round(share * 100),
      significance: 2,
      evidence: `${occ}s mostly arrive between ${fmt(bandStart)} and ${fmt(bandEnd)} (${peakCount} of ${visits.length} visits this week).`,
    });
  }

  // 3. Cohort table affinity
  for (const [occ, visits] of byOccupation.entries()) {
    if (visits.length < COHORT_MIN_OBSERVATIONS) continue;
    const tableCounts: Record<string, number> = {};
    let withTable = 0;
    for (const v of visits) {
      const ident = parseTableIdentifier(v.table_id);
      if (!ident) continue;
      tableCounts[ident] = (tableCounts[ident] ?? 0) + 1;
      withTable += 1;
    }
    if (withTable === 0) continue;
    const sorted = Object.entries(tableCounts).sort(([, a], [, b]) => b - a);
    const [topTable, topCount] = sorted[0];
    const share = topCount / withTable;
    if (share < 0.4) continue;
    signals.push({
      kind: "cohort_pattern",
      metric: "cohort_table_affinity",
      context: `${occ}:${topTable}`,
      value: Math.round(share * 100),
      significance: 2,
      evidence: `${occ}s spent ${Math.round(share * 100)}% of their time at Table ${topTable} this week (${topCount} of ${withTable} seated visits).`,
    });
  }

  // 4. Cohort → menu item affinity via temporal+table proximity
  const cohortItemQty = new Map<string, Map<string, number>>();
  const cohortItemAttributions = new Map<string, number>();
  const overallItemQty = new Map<string, number>();
  let totalAttributedQty = 0;

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    if (order.fulfillment_type !== "dine_in" || !order.table_identifier) continue;
    const orderTime = new Date(order.placed_at).getTime();
    const matchingCohorts = new Set<string>();
    for (const u of activeUsers) {
      const ident = parseTableIdentifier(u.table_id);
      if (ident !== order.table_identifier) continue;
      const delta = Math.abs(new Date(u.last_seen).getTime() - orderTime);
      if (delta <= COHORT_MATCH_WINDOW_MIN * 60 * 1000) {
        matchingCohorts.add(normalizeOccupation(u.occupation));
      }
    }
    const items = orderItemsByOrder.get(order.id) ?? [];
    for (const it of items) {
      overallItemQty.set(it.name, (overallItemQty.get(it.name) ?? 0) + it.quantity);
      totalAttributedQty += it.quantity;
      if (matchingCohorts.size === 0) continue;
      const share = it.quantity / matchingCohorts.size;
      for (const occ of matchingCohorts) {
        let inner = cohortItemQty.get(occ);
        if (!inner) {
          inner = new Map();
          cohortItemQty.set(occ, inner);
        }
        inner.set(it.name, (inner.get(it.name) ?? 0) + share);
        cohortItemAttributions.set(occ, (cohortItemAttributions.get(occ) ?? 0) + share);
      }
    }
  }

  if (totalAttributedQty >= 4) {
    for (const [occ, items] of cohortItemQty.entries()) {
      const cohortTotal = cohortItemAttributions.get(occ) ?? 0;
      if (cohortTotal < 2) continue;
      let best: { name: string; qty: number; ratio: number } | null = null;
      for (const [name, qty] of items.entries()) {
        const cohortShare = qty / cohortTotal;
        const overallShare = (overallItemQty.get(name) ?? 0) / totalAttributedQty;
        if (overallShare === 0) continue;
        const ratio = cohortShare / overallShare;
        if (ratio < 1.5) continue;
        if (!best || ratio > best.ratio) {
          best = { name, qty, ratio };
        }
      }
      if (best) {
        signals.push({
          kind: "cohort_pattern",
          metric: "cohort_item_affinity",
          context: `${occ}:${best.name}`,
          value: Math.round(best.ratio * 10) / 10,
          significance: 3,
          evidence: `${occ}s ordered "${best.name}" ${best.ratio.toFixed(1)}x more often than the average customer at their tables this week (derived from table proximity \u00B115min, not a demographic assumption).`,
        });
      }
    }
  }

  return signals;
}

export function computeSignals(dataset: InsightsDataset): Signal[] {
  const {
    orders,
    orderItemsByOrder,
    scans,
    activeMenuItems,
    activeUsers,
    activeUsersPrevWindow,
    usedFallback,
  } = dataset;
  const signals: Signal[] = [];

  if (orders.length === 0) {
    signals.push({
      kind: "zero_activity",
      metric: "orders",
      context: "venue",
      significance: 3,
      evidence: "No orders have been placed yet.",
    });
    return signals;
  }

  const scopeLabel = usedFallback
    ? "since this venue's first order"
    : `over the last ${WINDOW_DAYS} days`;

  // --- Revenue / order trend: current 7d vs previous 7d ---
  const current7Start = daysAgo(RECENT_WINDOW_DAYS).getTime();
  const previous7Start = daysAgo(RECENT_WINDOW_DAYS * 2).getTime();
  const current7 = orders.filter(
    (o) => o.status !== "cancelled" && new Date(o.placed_at).getTime() >= current7Start,
  );
  const previous7 = orders.filter((o) => {
    if (o.status === "cancelled") return false;
    const t = new Date(o.placed_at).getTime();
    return t >= previous7Start && t < current7Start;
  });
  const currentRevenue = current7.reduce((s, o) => s + num(o.total), 0);
  const previousRevenue = previous7.reduce((s, o) => s + num(o.total), 0);

  if (previousRevenue > 0 && current7.length > 0) {
    const delta = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    if (Math.abs(delta) >= 15) {
      signals.push({
        kind: delta > 0 ? "trend_up" : "trend_down",
        metric: "revenue_week",
        value: currentRevenue,
        delta: Math.round(delta * 10) / 10,
        comparison: "vs previous week",
        significance: Math.abs(delta) >= 30 ? 3 : 2,
        evidence: `Revenue this week is $${currentRevenue.toFixed(2)} (${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% vs $${previousRevenue.toFixed(2)} last week).`,
      });
    }
  }

  // --- Peak hour ---
  const byHour: Record<number, number> = {};
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const h = new Date(o.placed_at).getHours();
    byHour[h] = (byHour[h] ?? 0) + 1;
  }
  const peakHour = Object.entries(byHour).sort(([, a], [, b]) => b - a)[0];
  if (peakHour) {
    const [hourStr, count] = peakHour;
    const hr = Number(hourStr);
    const hrLabel =
      hr === 0 ? "12am" : hr < 12 ? `${hr}am` : hr === 12 ? "12pm" : `${hr - 12}pm`;
    signals.push({
      kind: "anomaly",
      metric: "peak_hour",
      value: count,
      context: hrLabel,
      significance: 2,
      evidence: `The busiest hour ${scopeLabel} is ${hrLabel} with ${count} orders.`,
    });
  }

  // --- Top item + gainers/losers ---
  const itemQtyCurrent = new Map<string, number>();
  const itemQtyPrevious = new Map<string, number>();
  const itemRevenueTotal = new Map<string, { qty: number; rev: number }>();

  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const items = orderItemsByOrder.get(o.id) ?? [];
    const t = new Date(o.placed_at).getTime();
    for (const it of items) {
      const agg = itemRevenueTotal.get(it.name) ?? { qty: 0, rev: 0 };
      agg.qty += it.quantity;
      agg.rev += num(it.line_total);
      itemRevenueTotal.set(it.name, agg);
      if (t >= current7Start) {
        itemQtyCurrent.set(it.name, (itemQtyCurrent.get(it.name) ?? 0) + it.quantity);
      } else if (t >= previous7Start) {
        itemQtyPrevious.set(it.name, (itemQtyPrevious.get(it.name) ?? 0) + it.quantity);
      }
    }
  }

  const topItem = Array.from(itemRevenueTotal.entries()).sort(
    ([, a], [, b]) => b.rev - a.rev,
  )[0];
  if (topItem) {
    const [name, agg] = topItem;
    signals.push({
      kind: "trend_up",
      metric: "top_item",
      value: agg.rev,
      context: name,
      significance: 2,
      evidence: `"${name}" is the top seller ${scopeLabel}: ${agg.qty} units sold for $${agg.rev.toFixed(2)} in revenue.`,
    });
  }

  // Gainers + losers on items present in both windows
  const changes: Array<{ name: string; cur: number; prev: number; pct: number }> = [];
  for (const [name, cur] of itemQtyCurrent.entries()) {
    const prev = itemQtyPrevious.get(name) ?? 0;
    if (prev === 0 || cur === 0) continue;
    const pct = ((cur - prev) / prev) * 100;
    changes.push({ name, cur, prev, pct });
  }
  const sortedGainers = [...changes].sort((a, b) => b.pct - a.pct);
  const sortedLosers = [...changes].sort((a, b) => a.pct - b.pct);
  if (sortedGainers[0] && sortedGainers[0].pct >= 25) {
    const g = sortedGainers[0];
    signals.push({
      kind: "trend_up",
      metric: "item_sales",
      context: g.name,
      delta: Math.round(g.pct * 10) / 10,
      value: g.cur,
      comparison: "vs last week",
      significance: 3,
      evidence: `"${g.name}" sold ${g.cur} units this week vs ${g.prev} last week (+${g.pct.toFixed(1)}%).`,
    });
  }
  if (sortedLosers[0] && sortedLosers[0].pct <= -25) {
    const l = sortedLosers[0];
    signals.push({
      kind: "trend_down",
      metric: "item_sales",
      context: l.name,
      delta: Math.round(l.pct * 10) / 10,
      value: l.cur,
      comparison: "vs last week",
      significance: 3,
      evidence: `"${l.name}" fell from ${l.prev} units last week to ${l.cur} this week (${l.pct.toFixed(1)}%).`,
    });
  }

  // --- Dead active items ---
  const soldItemNames = new Set(itemRevenueTotal.keys());
  const deadItems = activeMenuItems.filter((m) => !soldItemNames.has(m.name));
  if (deadItems.length > 0) {
    const sample = deadItems.slice(0, 3).map((d) => `"${d.name}"`).join(", ");
    signals.push({
      kind: "zero_activity",
      metric: "dead_menu_items",
      value: deadItems.length,
      context: sample,
      significance: deadItems.length >= 3 ? 2 : 1,
      evidence: `${deadItems.length} active menu item${deadItems.length === 1 ? "" : "s"} (${sample}${deadItems.length > 3 ? ", and more" : ""}) had no sales ${scopeLabel}.`,
    });
  }

  // --- Scan-to-order conversion ---
  const uniqueScanSessions = new Set(scans.map((s) => s.session_id)).size;
  const nonCancelledOrders = orders.filter((o) => o.status !== "cancelled").length;
  if (uniqueScanSessions > 0) {
    const conversion = nonCancelledOrders / uniqueScanSessions;
    const conversionPct = Math.round(conversion * 1000) / 10;
    if (conversion < 0.3) {
      signals.push({
        kind: "threshold",
        metric: "scan_conversion",
        value: conversionPct,
        significance: 3,
        evidence: `Only ${conversionPct}% of QR scans led to an order (${nonCancelledOrders} orders from ${uniqueScanSessions} scan sessions ${scopeLabel}).`,
      });
    } else {
      signals.push({
        kind: "threshold",
        metric: "scan_conversion",
        value: conversionPct,
        significance: 2,
        evidence: `${conversionPct}% of QR scans converted to an order (${nonCancelledOrders} orders from ${uniqueScanSessions} scan sessions ${scopeLabel}).`,
      });
    }
  }

  // --- Busiest table + tables with scans but no orders ---
  const ordersByTable: Record<string, number> = {};
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    if (o.fulfillment_type !== "dine_in" || !o.table_identifier) continue;
    ordersByTable[o.table_identifier] = (ordersByTable[o.table_identifier] ?? 0) + 1;
  }
  const busiestTable = Object.entries(ordersByTable).sort(([, a], [, b]) => b - a)[0];
  if (busiestTable) {
    const [name, count] = busiestTable;
    signals.push({
      kind: "trend_up",
      metric: "busiest_table",
      value: count,
      context: name,
      significance: 2,
      evidence: `Table ${name} had the most dine-in orders (${count}) ${scopeLabel}.`,
    });
  }

  // Cross-signal cohort layer (runs on top of the base metric signals)
  signals.push(
    ...computeCohortSignals(activeUsers, activeUsersPrevWindow, orders, orderItemsByOrder),
  );

  return signals
    .sort((a, b) => b.significance - a.significance)
    .slice(0, 10);
}

export interface InsightCard {
  tag: string;
  title: string;
  description: string;
  cta: string;
  severity: "info" | "warning" | "opportunity";
}

export function signalsToTemplateCards(signals: Signal[]): InsightCard[] {
  return signals.slice(0, 5).map((s): InsightCard => {
    let tag = "Signal";
    let severity: InsightCard["severity"] = "info";
    let cta = "Take a look";
    if (s.metric.startsWith("item") || s.metric === "top_item" || s.metric === "dead_menu_items") {
      tag = "Menu";
    } else if (s.metric === "revenue_week") {
      tag = "Revenue";
    } else if (s.metric === "peak_hour") {
      tag = "Peak Hours";
    } else if (s.metric === "scan_conversion") {
      tag = "Conversion";
    } else if (s.metric.includes("table")) {
      tag = "Seating";
    }
    if (s.kind === "trend_down" || (s.kind === "threshold" && s.value !== undefined && s.value < 30)) {
      severity = "warning";
      cta = "Investigate";
    } else if (s.kind === "trend_up") {
      severity = "opportunity";
      cta = "Keep it up";
    } else if (s.kind === "zero_activity") {
      severity = "warning";
      cta = "Review";
    }
    return {
      tag,
      title: s.evidence.split(". ")[0] + ".",
      description: s.evidence,
      cta,
      severity,
    };
  });
}
