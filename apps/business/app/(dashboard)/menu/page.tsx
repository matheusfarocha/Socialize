"use client";

import { useState } from "react";
import { TopBar } from "@/components/top-bar";
import { Search, Plus } from "lucide-react";
import { menuCategories, menuItems } from "@/lib/mock-data";
import { CategoryTabs } from "@/components/ui/category-tabs";
import { MenuItemRow } from "@/components/menu/menu-item-row";

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("Hot Beverages");

  return (
    <>
      <TopBar>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
          Menu Management
        </h1>
        <div className="relative w-64 max-w-md hidden md:block">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            className="w-full pl-12 pr-4 py-3 bg-surface-container-highest rounded-full border-0 focus:ring-2 focus:ring-primary focus:outline-none transition-colors text-sm"
            placeholder="Search menu items..."
            type="text"
          />
        </div>
      </TopBar>

      <div className="flex-1 pt-24 pb-12 px-8 xl:px-16">
        <div className="max-w-6xl mx-auto w-full flex flex-col gap-8">
          <CategoryTabs
            categories={menuCategories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            trailing={
              <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-highest text-on-surface rounded-full hover:bg-surface-variant transition-colors font-headline font-medium text-sm whitespace-nowrap shrink-0">
                <Plus size={18} />
                Add Item
              </button>
            }
          />

          {/* Menu List */}
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 text-sm font-headline font-semibold text-on-surface-variant tracking-wide">
              <div className="col-span-1">Status</div>
              <div className="col-span-4">Item Name</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-2">Price</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {menuItems.map((item) => (
              <MenuItemRow key={item.name} item={item} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
