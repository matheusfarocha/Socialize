import { TopBar } from "@/components/top-bar";
import { Receipt, Armchair } from "lucide-react";
import { topSellers, chartData, revenueMiniBarHeights } from "@/lib/mock-data";
import { MetricCard } from "@/components/ui/metric-card";
import { BarChart } from "@/components/ui/bar-chart";
import { RevenueCard } from "@/components/dashboard/revenue-card";
import { TopSellers } from "@/components/dashboard/top-sellers";
import { QrCta } from "@/components/dashboard/qr-cta";

export default function DashboardPage() {
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
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-full bg-surface-container-highest text-on-surface text-sm font-medium hover:opacity-80 transition-colors">
              Today
            </button>
            <button className="px-4 py-2 rounded-full bg-surface text-on-surface-variant text-sm font-medium hover:bg-surface-container-low transition-colors">
              Week
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 shrink-0">
          <RevenueCard
            amount="$2,485.50"
            miniBarHeights={revenueMiniBarHeights}
            comparisonLabel="+12.5% vs yesterday"
          />

          <MetricCard
            label="Active Orders"
            value={14}
            icon={Receipt}
            footer={
              <div className="mt-3 pt-3 border-t border-outline-variant/20 flex justify-between text-sm">
                <span className="text-on-surface-variant">Completed: 86</span>
                <span className="text-primary font-medium">Avg Time: 4m</span>
              </div>
            }
          />

          <MetricCard
            label="Seating"
            value={85}
            suffix="%"
            icon={Armchair}
            footer={
              <>
                <div className="mt-3 w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: "85%" }}
                  />
                </div>
                <div className="mt-1.5 text-xs text-on-surface-variant text-right">
                  4 tables available
                </div>
              </>
            }
          />
        </div>

        {/* Secondary Section */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
          <BarChart
            title="Revenue Trend"
            subtitle="Last 7 days vs Previous week"
            data={chartData}
          />

          {/* Right Column */}
          <div className="flex flex-col gap-5 min-h-0">
            <TopSellers items={topSellers} />
            <QrCta />
          </div>
        </div>
      </div>
    </>
  );
}
