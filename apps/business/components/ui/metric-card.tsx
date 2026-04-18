import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  suffix?: string;
  footer?: React.ReactNode;
}

export function MetricCard({ label, value, icon: Icon, suffix, footer }: MetricCardProps) {
  return (
    <div className="col-span-1 bg-surface-container-low rounded-xl p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-on-surface-variant uppercase tracking-wider">
            {label}
          </span>
          <Icon size={20} className="text-primary" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-headline font-bold text-on-surface">
            {value}
          </span>
          {suffix && (
            <span className="text-lg text-on-surface-variant">{suffix}</span>
          )}
        </div>
      </div>
      {footer}
    </div>
  );
}
