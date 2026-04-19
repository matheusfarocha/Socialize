"use client";

import { useState } from "react";
import { TopBar } from "@/components/top-bar";
import { Receipt, Armchair } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { BarChart } from "@/components/ui/bar-chart";
import { RevenueCard } from "@/components/dashboard/revenue-card";
import { TopSellers } from "@/components/dashboard/top-sellers";
import { QrCta } from "@/components/dashboard/qr-cta";
import type { TopSeller, ChartDataPoint } from "@/lib/mock-data";

const filters = ["Today", "Week", "Month", "All Time"] as const;
type Filter = (typeof filters)[number];

interface DashboardData {
  revenue: string;
  revenueComparison: string;
  miniBarHeights: number[];
  orders: number;
  completed: number;
  avgTime: string;
  seating: number;
  tablesAvailable: number;
  chartTitle: string;
  chartSubtitle: string;
  chartData: ChartDataPoint[];
  topSellers: TopSeller[];
}

const dashboardByFilter: Record<Filter, DashboardData> = {
  Today: {
    revenue: "$2,485.50",
    revenueComparison: "+12.5% vs yesterday",
    miniBarHeights: [40, 60, 50, 80, 95, 30],
    orders: 86,
    completed: 86,
    avgTime: "4m",
    seating: 85,
    tablesAvailable: 4,
    chartTitle: "Revenue Trend",
    chartSubtitle: "Hourly breakdown",
    chartData: [
      { day: "8am", current: 30, previous: 20 },
      { day: "10am", current: 65, previous: 50 },
      { day: "12pm", current: 90, previous: 75 },
      { day: "2pm", current: 55, previous: 60 },
      { day: "4pm", current: 70, previous: 45 },
      { day: "6pm", current: 80, previous: 65 },
    ],
    topSellers: [
      { name: "Oat Milk Latte", orders: 24, revenue: "$132" },
      { name: "Ethiopia Pour Over", orders: 18, revenue: "$99" },
      { name: "Avo Toast", orders: 15, revenue: "$135" },
    ],
  },
  Week: {
    revenue: "$14,820.00",
    revenueComparison: "+8.2% vs last week",
    miniBarHeights: [50, 70, 60, 85, 90, 75],
    orders: 542,
    completed: 542,
    avgTime: "5m",
    seating: 78,
    tablesAvailable: 6,
    chartTitle: "Revenue Trend",
    chartSubtitle: "Last 7 days vs previous week",
    chartData: [
      { day: "Mon", current: 80, previous: 60 },
      { day: "Tue", current: 60, previous: 40 },
      { day: "Wed", current: 90, previous: 70 },
      { day: "Thu", current: 40, previous: 50 },
      { day: "Fri", current: 70, previous: 85 },
      { day: "Sat", current: 85, previous: 65 },
      { day: "Sun", current: 100, previous: 95 },
    ],
    topSellers: [
      { name: "Oat Milk Latte", orders: 124, revenue: "$682" },
      { name: "Ethiopia Pour Over", orders: 98, revenue: "$539" },
      { name: "Avo Toast", orders: 85, revenue: "$765" },
    ],
  },
  Month: {
    revenue: "$58,340.00",
    revenueComparison: "+15.3% vs last month",
    miniBarHeights: [45, 55, 70, 80, 95, 85],
    orders: 2184,
    completed: 2184,
    avgTime: "4m",
    seating: 82,
    tablesAvailable: 5,
    chartTitle: "Revenue Trend",
    chartSubtitle: "Weekly breakdown this month",
    chartData: [
      { day: "Wk 1", current: 75, previous: 60 },
      { day: "Wk 2", current: 82, previous: 70 },
      { day: "Wk 3", current: 90, previous: 78 },
      { day: "Wk 4", current: 95, previous: 82 },
    ],
    topSellers: [
      { name: "Oat Milk Latte", orders: 496, revenue: "$2,728" },
      { name: "Ethiopia Pour Over", orders: 392, revenue: "$2,156" },
      { name: "Avo Toast", orders: 340, revenue: "$3,060" },
    ],
  },
  "All Time": {
    revenue: "$342,150.00",
    revenueComparison: "Since opening",
    miniBarHeights: [30, 45, 55, 65, 80, 100],
    orders: 12840,
    completed: 12840,
    avgTime: "4m",
    seating: 80,
    tablesAvailable: 5,
    chartTitle: "Revenue Trend",
    chartSubtitle: "Monthly since opening",
    chartData: [
      { day: "Jan", current: 60, previous: 0 },
      { day: "Feb", current: 65, previous: 0 },
      { day: "Mar", current: 72, previous: 0 },
      { day: "Apr", current: 80, previous: 0 },
      { day: "May", current: 88, previous: 0 },
      { day: "Jun", current: 95, previous: 0 },
    ],
    topSellers: [
      { name: "Oat Milk Latte", orders: 2976, revenue: "$16,368" },
      { name: "Ethiopia Pour Over", orders: 2352, revenue: "$12,936" },
      { name: "Avo Toast", orders: 2040, revenue: "$18,360" },
    ],
  },
};

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("Today");
  const data = dashboardByFilter[activeFilter];

  return (
    <>
      <TopBar />
      <div className="flex-1 mt-[72px] flex flex-col overflow-hidden px-8 xl:px-16 py-6">
        <div className="flex justify-between items-end mb-5 shrink-0">
          <div>
            <h2 className="text-2xl font-headline font-bold text-on-surface tracking-tight mb-0.5">
              Morning Overview
            </h2>
            <p className="text-on-surface-variant text-sm">
              Tuesday, October 24th
            </p>
          </div>
          <div className="flex gap-2">
            {filters.map((f) => (
              <button
                key={f}
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
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 shrink-0">
          <RevenueCard
            amount={data.revenue}
            miniBarHeights={data.miniBarHeights}
            comparisonLabel={data.revenueComparison}
          />

          <MetricCard
            label="Completed Orders"
            value={data.orders}
            icon={Receipt}
            footer={
              <div className="mt-3 pt-3 border-t border-outline-variant/20 flex justify-between text-sm">
                <span className="text-on-surface-variant">Completed: {data.completed}</span>
                <span className="text-primary font-medium">Avg Time: {data.avgTime}</span>
              </div>
            }
          />

          <MetricCard
            label="Avg Seating"
            value={data.seating}
            suffix="%"
            icon={Armchair}
            footer={
              <>
                <div className="mt-3 w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${data.seating}%` }}
                  />
                </div>
                <div className="mt-1.5 text-xs text-on-surface-variant text-right">
                  {data.tablesAvailable} tables available
                </div>
              </>
            }
          />
        </div>

        {/* Secondary Section */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
          <BarChart
            title={data.chartTitle}
            subtitle={data.chartSubtitle}
            data={data.chartData}
          />

          {/* Right Column */}
          <div className="flex flex-col gap-5 min-h-0">
            <TopSellers items={data.topSellers} />
            <QrCta />
          </div>
        </div>
      </div>
    </>
  );
}
