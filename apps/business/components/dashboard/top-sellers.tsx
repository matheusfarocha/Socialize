import type { TopSeller } from "@/lib/mock-data";

interface TopSellersProps {
  items: TopSeller[];
}

export function TopSellers({ items }: TopSellersProps) {
  return (
    <div className="bg-surface-container-low rounded-xl p-6 flex-1">
      <h3 className="text-lg font-headline font-bold text-on-surface mb-4">
        Top Sellers
      </h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-4 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-surface-container-highest" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-on-surface">
                {item.name}
              </h4>
              <p className="text-xs text-on-surface-variant">
                {item.orders} orders
              </p>
            </div>
            <div className="text-sm font-bold text-primary">
              {item.revenue}
            </div>
          </div>
        ))}
      </div>
      <button className="w-full mt-6 py-2 text-sm font-bold text-primary hover:bg-surface-container-highest rounded-full transition-colors">
        View Menu Analytics
      </button>
    </div>
  );
}
