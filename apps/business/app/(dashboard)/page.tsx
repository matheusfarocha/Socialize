"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/top-bar";
import { Receipt, Armchair, Loader2, RefreshCw } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { BarChart } from "@/components/ui/bar-chart";
import { RevenueCard } from "@/components/dashboard/revenue-card";
import { TopSellers } from "@/components/dashboard/top-sellers";
import { QrCta } from "@/components/dashboard/qr-cta";
import { ScanCountCard } from "@/components/dashboard/scan-count-card";
import {
  buildOrderDashboardMetrics,
  fetchOwnedVenueOrders,
  formatCurrency,
  type DashboardWindow,
  type MenuItemSummary,
  type OrderRecord,
} from "@/lib/order-management";

const filters: DashboardWindow[] = ["Today", "Week", "Month", "All Time"];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [venue, setVenue] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemSummary[]>([]);
  const [tableCount, setTableCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<DashboardWindow>("Today");

  useEffect(() => {
    let active = true;

    async function load(background = false) {
      if (!background) setLoading(true);
      if (background) setRefreshing(true);

      try {
        const snapshot = await fetchOwnedVenueOrders();
        if (!active) return;

        setVenue(snapshot.venue);
        setOrders(snapshot.orders);
        setMenuItems(snapshot.menuItems);
        setTableCount(snapshot.tableCount);
        setError("");
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load order metrics.");
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
    () => buildOrderDashboardMetrics(orders, tableCount, activeFilter, menuItems),
    [orders, tableCount, activeFilter, menuItems],
  );
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <>
      <TopBar />
      <div className="flex-1 mt-[72px] flex flex-col overflow-y-auto px-8 xl:px-16 py-6">
        <div className="flex flex-wrap justify-between items-end gap-4 mb-5 shrink-0">
          <div>
            <h2 className="text-2xl font-headline font-bold text-on-surface tracking-tight mb-0.5">
              {venue ? `${venue.name} overview` : "Venue overview"}
            </h2>
            <p className="text-on-surface-variant text-sm">
              {todayLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFilter(f)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    f === activeFilter
                      ? "bg-surface-container-highest text-on-surface"
                      : "bg-surface text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <Link
              href="/orders"
              className="px-4 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Open Orders
            </Link>
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                fetchOwnedVenueOrders()
                  .then((snapshot) => {
                    setVenue(snapshot.venue);
                    setOrders(snapshot.orders);
                    setMenuItems(snapshot.menuItems);
                    setTableCount(snapshot.tableCount);
                    setError("");
                  })
                  .catch((loadError) => {
                    setError(
                      loadError instanceof Error
                        ? loadError.message
                        : "Failed to refresh order metrics.",
                    );
                  })
                  .finally(() => {
                    setRefreshing(false);
                    setLoading(false);
                  });
              }}
              className="px-4 py-2 rounded-full bg-surface-container-highest text-on-surface text-sm font-medium hover:opacity-80 transition-colors inline-flex items-center gap-2 disabled:opacity-60"
              disabled={refreshing}
            >
              {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Refresh
            </button>
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 shrink-0">
              <RevenueCard
                amount={formatCurrency(metrics.revenueToday)}
                miniBarHeights={metrics.revenueMiniBarHeights}
                comparisonLabel={metrics.revenueComparisonLabel}
              />

              <MetricCard
                label={`Orders (${activeFilter})`}
                value={metrics.totalOrders}
                icon={Receipt}
                footer={
                  <div className="mt-3 pt-3 border-t border-outline-variant/20 flex justify-between text-sm">
                    <span className="text-on-surface-variant">
                      Completed: {metrics.completedToday}
                    </span>
                    <span className="text-primary font-medium">
                      Avg Time: {metrics.avgCompletionMinutes != null ? `${metrics.avgCompletionMinutes}m` : "--"}
                    </span>
                  </div>
                }
              />

              <MetricCard
                label="Seating"
                value={metrics.seatingUtilization}
                suffix="%"
                icon={Armchair}
                footer={
                  <>
                    <div className="mt-3 w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${metrics.seatingUtilization}%` }}
                      />
                    </div>
                    <div className="mt-1.5 text-xs text-on-surface-variant text-right">
                      {metrics.availableTables} tables available
                    </div>
                  </>
                }
              />

              <ScanCountCard venueSlug={venue?.slug} activeWindow={activeFilter} />
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <BarChart
                title="Revenue Trend"
                subtitle={metrics.revenueTrendSubtitle}
                data={metrics.revenueTrend}
                yLabels={metrics.revenueYLabels}
              />

              <div className="flex flex-col gap-5">
                <TopSellers items={metrics.topSellers} />
                <QrCta
                  venueSlug={venue?.slug}
                  venueName={venue?.name}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
