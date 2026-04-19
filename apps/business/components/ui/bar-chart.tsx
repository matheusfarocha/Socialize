import { MoreHorizontal } from "lucide-react";

export interface BarChartDataPoint {
  day: string;
  current: number;
  previous: number;
}

interface BarChartProps {
  title: string;
  subtitle: string;
  data: BarChartDataPoint[];
  yLabels?: string[];
}

export function BarChart({
  title,
  subtitle,
  data,
  yLabels = ["$1k", "$750", "$500", "$250", "$0"],
}: BarChartProps) {
  const maxValue = Math.max(1, ...data.map((point) => point.current));

  return (
    <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-6 flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-4 shrink-0">
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
      <div className="flex-1 relative min-h-0 flex items-end gap-4 pb-6 border-b border-outline-variant/20">
        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-xs text-on-surface-variant pr-4">
          {yLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div className="w-full flex items-end pl-12 h-full gap-2 justify-around">
          {data.map((d) => (
            <div
              key={d.day}
              className="relative group h-full flex-1 max-w-[72px]"
            >
              <div
                className="absolute bottom-0 w-full bg-primary rounded-t-md transition-all"
                style={{ height: `${Math.max((d.current / maxValue) * 100, 0)}%` }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-end pl-12 pt-4 gap-2 justify-around text-xs text-on-surface-variant w-full">
        {data.map((d) => (
          <span key={d.day} className="text-center flex-1 max-w-[72px]">
            {d.day}
          </span>
        ))}
      </div>
    </div>
  );
}
