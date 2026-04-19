import type { TopSellerData } from "@/lib/order-management";

interface TopSellersProps {
  items: TopSellerData[];
}

export function TopSellers({ items }: TopSellersProps) {
  return (
    <div className="bg-surface-container-low rounded-xl p-6 flex-1 min-h-0 overflow-hidden">
      <h3 className="text-lg font-headline font-bold text-on-surface mb-4">
        Top Sellers
      </h3>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-highest/40 px-4 py-6 text-sm text-on-surface-variant">
          Top items will appear here once orders start coming in.
        </div>
      ) : (
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
                  {item.orders} items sold
                </p>
              </div>
              <div className="text-sm font-bold text-primary">
                {item.revenue}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
