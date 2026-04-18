import { Camera, Trash2 } from "lucide-react";
import type { MenuItem } from "@/lib/mock-data";

interface MenuItemRowProps {
  item: MenuItem;
}

export function MenuItemRow({ item }: MenuItemRowProps) {
  return (
    <div
      className={`group grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-surface-container-lowest p-6 rounded-lg transition-all duration-300 hover:bg-surface-container-low ${
        !item.active ? "opacity-70 hover:opacity-100" : ""
      }`}
    >
      {/* Toggle */}
      <div className="col-span-1 flex items-center">
        <div
          className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer ${
            item.active
              ? "bg-primary-container"
              : "bg-surface-container-highest"
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full transition-transform ${
              item.active
                ? "bg-white translate-x-6"
                : "bg-on-surface-variant"
            }`}
          />
        </div>
      </div>

      {/* Name */}
      <div className="col-span-4">
        <input
          className={`w-full bg-transparent border-0 border-b border-transparent hover:border-outline-variant focus:border-primary focus:ring-0 focus:outline-none p-0 font-headline font-bold text-lg text-on-surface transition-colors ${
            !item.active
              ? "line-through text-on-surface-variant"
              : ""
          }`}
          type="text"
          defaultValue={item.name}
        />
      </div>

      {/* Description */}
      <div className="col-span-3">
        <input
          className="w-full bg-transparent border-0 border-b border-transparent hover:border-outline-variant focus:border-primary focus:ring-0 focus:outline-none p-0 text-sm text-on-surface-variant transition-colors truncate"
          type="text"
          defaultValue={item.description}
        />
      </div>

      {/* Price */}
      <div className="col-span-2">
        <div className="relative">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-on-surface font-medium">
            $
          </span>
          <input
            className="w-full bg-transparent border-0 border-b border-transparent hover:border-outline-variant focus:border-primary focus:ring-0 focus:outline-none pl-4 p-0 font-medium text-on-surface transition-colors"
            type="number"
            step="0.01"
            defaultValue={item.price}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="col-span-2 flex justify-end gap-2">
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-primary transition-colors">
          <Camera size={18} />
        </button>
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-error transition-colors">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
