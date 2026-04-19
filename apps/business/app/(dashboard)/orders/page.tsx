"use client";

import { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/top-bar";
import {
  ACTIVE_ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  buildOrderDashboardMetrics,
  fetchOwnedVenueOrders,
  formatCurrency,
  formatFulfillmentLabel,
  formatOrderTimestamp,
  getNextOrderStatus,
  getOrderActionLabel,
  updateOrderStatus,
  type OrderRecord,
  type OrderStatus,
} from "@/lib/order-management";
import { Loader2, RefreshCw, ArrowRight, XCircle } from "lucide-react";

type OrderFilter = "all" | "active" | OrderStatus;

const FILTERS: { id: OrderFilter; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "submitted", label: "Submitted" },
  { id: "preparing", label: "Preparing" },
  { id: "ready", label: "Ready" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All" },
];

export default function OrdersPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<OrderFilter>("active");
  const [venueName, setVenueName] = useState("Orders");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [tableCount, setTableCount] = useState(0);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load(background = false) {
      if (!background) setLoading(true);
      if (background) setRefreshing(true);

      try {
        const snapshot = await fetchOwnedVenueOrders();
        if (!active) return;

        setVenueName(snapshot.venue?.name ?? "Orders");
        setOrders(snapshot.orders);
        setTableCount(snapshot.tableCount);
        setError("");
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load orders.");
      } finally {
        if (!active) return;
        setLoading(false);
        setRefreshing(false);
      }
    }

    load().catch(() => undefined);
    const intervalId = window.setInterval(() => {
      load(true).catch(() => undefined);
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const metrics = useMemo(
    () => buildOrderDashboardMetrics(orders, tableCount),
    [orders, tableCount],
  );
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filter === "all") return true;
      if (filter === "active") return ACTIVE_ORDER_STATUSES.includes(order.status);
      return order.status === filter;
    });
  }, [filter, orders]);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      active: orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status)).length,
      submitted: orders.filter((order) => order.status === "submitted").length,
      preparing: orders.filter((order) => order.status === "preparing").length,
      ready: orders.filter((order) => order.status === "ready").length,
      completed: orders.filter((order) => order.status === "completed").length,
      cancelled: orders.filter((order) => order.status === "cancelled").length,
    };
  }, [orders]);

  async function handleRefresh() {
    setRefreshing(true);

    try {
      const snapshot = await fetchOwnedVenueOrders();
      setVenueName(snapshot.venue?.name ?? "Orders");
      setOrders(snapshot.orders);
      setTableCount(snapshot.tableCount);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to refresh orders.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  async function handleStatusChange(orderId: string, nextStatus: OrderStatus) {
    const previousOrders = orders;
    setUpdatingOrderId(orderId);
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId
          ? { ...order, status: nextStatus, updatedAt: new Date().toISOString() }
          : order,
      ),
    );

    try {
      await updateOrderStatus(orderId, nextStatus);
      setError("");
    } catch (updateError) {
      setOrders(previousOrders);
      setError(updateError instanceof Error ? updateError.message : "Failed to update order.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <>
      <TopBar>
        <h2 className="font-headline font-extrabold text-lg text-on-surface">
          Orders Queue
        </h2>
      </TopBar>

      <div className="flex-1 mt-[72px] flex flex-col overflow-hidden px-8 xl:px-16 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5 shrink-0">
          <div>
            <h1 className="text-3xl font-headline font-bold tracking-tight text-on-surface">
              {venueName}
            </h1>
            <p className="text-sm text-on-surface-variant">
              Track live guest orders and move them through service.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 rounded-full bg-surface-container-highest text-on-surface text-sm font-medium hover:opacity-80 transition-colors inline-flex items-center gap-2 disabled:opacity-60"
          >
            {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-error/20 bg-error-container/40 px-4 py-3 text-sm text-error">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4 shrink-0">
              <SummaryCard label="Active now" value={metrics.activeOrders} detail={`${counts.ready} ready`} />
              <SummaryCard
                label="Completed today"
                value={metrics.completedToday}
                detail={metrics.avgCompletionMinutes != null ? `${metrics.avgCompletionMinutes}m avg` : "No completed orders yet"}
              />
              <SummaryCard
                label="Revenue today"
                value={formatCurrency(metrics.revenueToday)}
                detail={metrics.revenueComparisonLabel}
              />
              <SummaryCard
                label="Tables free"
                value={metrics.availableTables}
                detail={tableCount > 0 ? `${metrics.seatingUtilization}% occupied` : "No floor plan tables saved"}
              />
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1 shrink-0">
              {FILTERS.map((tab) => {
                const isActive = filter === tab.id;
                const count = counts[tab.id];

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {tab.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex-1 overflow-y-auto space-y-4 pr-1">
              {filteredOrders.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-outline-variant/40 bg-surface-container-low px-6 py-10 text-center text-sm text-on-surface-variant">
                  No orders in this view yet.
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const nextStatus = getNextOrderStatus(order.status);
                  const primaryAction = getOrderActionLabel(order.status);
                  const isUpdating = updatingOrderId === order.id;

                  return (
                    <article
                      key={order.id}
                      className="rounded-[2rem] bg-surface-container-lowest border border-outline-variant/20 p-6 shadow-[0_12px_40px_rgba(81,68,55,0.08)]"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3 min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-xl font-headline font-bold text-on-surface">
                              {order.publicOrderCode}
                            </h2>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold tracking-wide ${ORDER_STATUS_STYLES[order.status]}`}
                            >
                              {ORDER_STATUS_LABELS[order.status]}
                            </span>
                            <span className="text-sm text-on-surface-variant">
                              {formatOrderTimestamp(order.placedAt)}
                            </span>
                          </div>

                          <div className="grid gap-2 text-sm text-on-surface-variant md:grid-cols-2">
                            <span>{order.customerName}</span>
                            <span>{order.customerEmail}</span>
                            <span>{formatFulfillmentLabel(order)}</span>
                            <span>{order.paymentLabel ?? order.paymentMethod.replace("_", " ")}</span>
                          </div>

                          {order.notes ? (
                            <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-sm text-on-surface">
                              <span className="font-semibold">Notes:</span> {order.notes}
                            </div>
                          ) : null}

                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-start justify-between gap-4 text-sm"
                              >
                                <div>
                                  <span className="font-semibold text-on-surface">
                                    {item.quantity}x {item.name}
                                  </span>
                                  {item.description ? (
                                    <p className="text-on-surface-variant">{item.description}</p>
                                  ) : null}
                                </div>
                                <span className="font-semibold text-on-surface">
                                  {formatCurrency(item.lineTotal)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="lg:w-72 shrink-0 rounded-[1.5rem] bg-surface-container-low p-5 space-y-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-on-surface-variant">
                              <span>Subtotal</span>
                              <span>{formatCurrency(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-on-surface-variant">
                              <span>Service fee</span>
                              <span>{formatCurrency(order.serviceFee)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-on-surface text-base pt-2 border-t border-outline-variant/20">
                              <span>Total</span>
                              <span>{formatCurrency(order.total)}</span>
                            </div>
                          </div>

                          <div className="grid gap-2">
                            {nextStatus && primaryAction ? (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleStatusChange(order.id, nextStatus)}
                                className="w-full rounded-2xl bg-primary text-on-primary px-4 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                              >
                                {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                                {primaryAction}
                              </button>
                            ) : null}

                            {ACTIVE_ORDER_STATUSES.includes(order.status) ? (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleStatusChange(order.id, "cancelled")}
                                className="w-full rounded-2xl border border-error/25 text-error px-4 py-3 text-sm font-semibold hover:bg-error-container/40 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                              >
                                <XCircle size={16} />
                                Cancel order
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-surface-container-low p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
        {label}
      </p>
      <div className="mt-3 text-3xl font-headline font-bold text-on-surface">
        {value}
      </div>
      <p className="mt-2 text-sm text-on-surface-variant">
        {detail}
      </p>
    </div>
  );
}
