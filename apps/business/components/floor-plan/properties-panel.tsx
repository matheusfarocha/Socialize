import { Minus, Plus, Trash2 } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

export function PropertiesPanel() {
  return (
    <aside className="w-72 bg-surface h-full border-l border-outline-variant/10 p-6 flex flex-col overflow-y-auto z-10 shadow-sm">
      <div className="mb-8">
        <h3 className="font-headline font-bold text-on-surface text-lg">
          Table Properties
        </h3>
        <p className="text-xs text-on-surface-variant">Editing T-01</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-headline font-semibold text-on-surface-variant mb-2">
            Identifier
          </label>
          <div className="bg-surface-container-highest rounded-xl px-4 py-2">
            <input
              className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-on-surface w-full p-0"
              type="text"
              defaultValue="T-01"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-headline font-semibold text-on-surface-variant mb-2">
            Seat Count
          </label>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors">
              <Minus size={16} />
            </button>
            <span className="font-headline font-bold text-on-surface w-8 text-center">
              2
            </span>
            <button className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors">
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-headline font-semibold text-on-surface-variant mb-2">
            Table Type
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-xl">
            <button className="py-2 bg-surface rounded-lg shadow-sm text-sm font-headline font-semibold text-primary">
              Standard
            </button>
            <button className="py-2 text-sm font-headline font-medium text-on-surface-variant hover:text-on-surface">
              High-top
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-on-surface">
              Reservable
            </span>
            <Toggle enabled={true} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-on-surface">
              ADA Accessible
            </span>
            <Toggle enabled={false} />
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <button className="w-full py-2.5 rounded-xl border border-error/30 text-error hover:bg-error-container/50 font-headline font-semibold text-sm transition-colors flex justify-center items-center gap-2">
          <Trash2 size={16} />
          Remove Table
        </button>
      </div>
    </aside>
  );
}
