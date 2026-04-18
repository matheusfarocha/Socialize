import { MoreHorizontal } from "lucide-react";
import type { ChartDataPoint } from "@/lib/mock-data";

interface BarChartProps {
  title: string;
  subtitle: string;
  data: ChartDataPoint[];
  yLabels?: string[];
}

export function BarChart({
  title,
  subtitle,
  data,
  yLabels = ["$1k", "$750", "$500", "$250", "$0"],
}: BarChartProps) {
  return (
    <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-8 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-lg font-headline font-bold text-on-surface">
            {title}
          </h3>
          <p className="text-sm text-on-surface-variant">{subtitle}</p>
        </div>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>
      <div className="flex-1 relative min-h-[250px] flex items-end gap-4 pb-6 border-b border-outline-variant/20">
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-xs text-on-surface-variant pr-4">
          {yLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="w-full flex justify-between items-end pl-12 h-full gap-2">
          {data.map((d) => (
            <div
              key={d.day}
              className="w-full relative group"
              style={{ height: `${d.current}%` }}
            >
              <div
                className="absolute bottom-0 w-full bg-primary-container/40 rounded-t-md"
                style={{ height: "100%" }}
              />
              <div
                className="absolute bottom-0 w-full bg-primary rounded-t-md transition-all"
                style={{ height: `${d.previous}%` }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between pl-12 pt-4 text-xs text-on-surface-variant w-full">
        {data.map((d) => (
          <span key={d.day} className="text-center w-full">
            {d.day}
          </span>
        ))}
      </div>
    </div>
  );
}
