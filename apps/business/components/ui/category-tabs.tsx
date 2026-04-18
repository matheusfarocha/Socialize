"use client";

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  trailing?: React.ReactNode;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
  trailing,
}: CategoryTabsProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-low p-4 rounded-xl">
      <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 w-full md:w-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`px-6 py-2.5 rounded-full font-headline font-medium text-sm whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-surface-container-highest text-on-surface hover:bg-surface-variant"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      {trailing}
    </div>
  );
}
