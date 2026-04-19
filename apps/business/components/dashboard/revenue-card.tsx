import { TrendingUp } from "lucide-react";

interface RevenueCardProps {
  amount: string;
  miniBarHeights: number[];
  comparisonLabel: string;
}

export function RevenueCard({ amount, miniBarHeights, comparisonLabel }: RevenueCardProps) {
  return (
    <div className="col-span-1 bg-surface-container-lowest rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
        <TrendingUp size={80} className="text-primary" />
      </div>
      <div>
        <div className="flex items-center gap-2 text-on-surface-variant mb-2">
          <TrendingUp size={14} />
          <span className="text-sm font-medium uppercase tracking-wider">
            Live Revenue
          </span>
        </div>
        <div className="text-5xl font-headline font-bold text-on-surface tracking-tighter">
          {amount}
        </div>
      </div>
      <div className="mt-8 flex items-end gap-4">
        <div className="flex-1 h-16 flex items-end gap-1">
          {miniBarHeights.map((h, i) => (
            <div
              key={i}
              className="w-full bg-primary-container rounded-t-sm"
              style={{ height: `${h}%`, opacity: 0.2 + i * 0.15 }}
            />
          ))}
        </div>
        <div className="text-sm text-primary font-medium bg-primary-container/20 px-3 py-1 rounded-full">
          {comparisonLabel}
        </div>
      </div>
    </div>
  );
}
