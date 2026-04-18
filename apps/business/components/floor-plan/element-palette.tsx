import { Search, DoorOpen } from "lucide-react";
import type { PaletteTable, PaletteStructural } from "@/lib/mock-data";

// ── Table shape icons ────────────────────────────────────

function TableIcon({ shape }: { shape: string }) {
  switch (shape) {
    case "round":
      return (
        <div className="w-12 h-12 rounded-full border-2 border-outline-variant flex items-center justify-center relative">
          <span className="w-2 h-2 bg-outline-variant rounded-full absolute -top-1" />
          <span className="w-2 h-2 bg-outline-variant rounded-full absolute -bottom-1" />
          <div className="w-6 h-6 rounded-full bg-surface-container-highest" />
        </div>
      );
    case "square":
      return (
        <div className="w-12 h-12 rounded-lg border-2 border-outline-variant flex items-center justify-center relative">
          <span className="w-2 h-2 bg-outline-variant rounded-full absolute -left-1" />
          <span className="w-2 h-2 bg-outline-variant rounded-full absolute -right-1" />
          <div className="w-8 h-6 rounded bg-surface-container-highest" />
        </div>
      );
    case "long":
      return (
        <div className="w-16 h-10 border-2 border-outline-variant rounded-md flex items-center justify-center relative">
          <span className="w-2 h-2 bg-outline-variant rounded-full absolute top-1 -left-1" />
          <span className="w-2 h-2 bg-outline-variant rounded-full absolute bottom-1 -left-1" />
          <span className="w-2 h-2 bg-outline-variant rounded-full absolute top-1 -right-1" />
          <span className="w-2 h-2 bg-outline-variant rounded-full absolute bottom-1 -right-1" />
          <div className="w-12 h-4 rounded-sm bg-surface-container-highest" />
        </div>
      );
    case "booth":
      return (
        <div className="w-14 h-14 border-2 border-outline-variant rounded-[10px] rounded-tl-[24px] flex items-center justify-center">
          <div className="w-8 h-8 rounded-[6px] rounded-tl-[16px] bg-surface-container-highest" />
        </div>
      );
    default:
      return null;
  }
}

// ── Structural element icons ─────────────────────────────

function StructuralIcon({ type }: { type: string }) {
  switch (type) {
    case "wall":
      return <div className="w-12 h-2 bg-on-surface-variant/40 rounded-full" />;
    case "entrance":
      return (
        <div className="w-12 h-6 border-2 border-dashed border-primary/50 bg-primary/5 rounded-md flex items-center justify-center">
          <DoorOpen size={14} className="text-primary" />
        </div>
      );
    case "bar":
      return (
        <div className="w-12 h-12 bg-secondary-container rounded-lg flex items-center justify-center text-on-secondary-container">
          <span className="text-xs font-bold">BAR</span>
        </div>
      );
    default:
      return null;
  }
}

// ── Element Palette ──────────────────────────────────────

interface ElementPaletteProps {
  tables: PaletteTable[];
  structural: PaletteStructural[];
}

export function ElementPalette({ tables, structural }: ElementPaletteProps) {
  return (
    <aside className="w-80 bg-surface-container-low h-full flex flex-col pt-6 pb-6 pl-8 pr-6 overflow-y-auto">
      <div className="mb-6">
        <h3 className="font-headline font-bold text-on-surface text-lg mb-1">
          Elements Palette
        </h3>
        <p className="text-xs text-on-surface-variant">
          Drag & drop onto the canvas
        </p>
      </div>

      <div className="bg-surface-container-highest rounded-full flex items-center px-4 py-2 mb-8">
        <Search size={16} className="text-on-surface-variant mr-2" />
        <input
          className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-on-surface w-full placeholder-on-surface-variant/70"
          placeholder="Search tables, chairs..."
          type="text"
        />
      </div>

      <div className="space-y-8 flex-1">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-headline font-semibold text-on-surface text-sm">
              Tables & Seating
            </h4>
            <button className="text-primary text-xs font-semibold hover:underline">
              See all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {tables.map((t) => (
              <div
                key={t.label}
                className="bg-surface hover:bg-surface-container-high rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-grab transition-colors shadow-sm"
              >
                <TableIcon shape={t.shape} />
                <span className="text-xs font-medium text-on-surface-variant text-center">
                  {t.label}
                  <br />
                  {t.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-headline font-semibold text-on-surface text-sm mb-4">
            Structural
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {structural.map((s) => (
              <div
                key={s.label}
                className="bg-surface hover:bg-surface-container-high rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-grab transition-colors shadow-sm"
              >
                <StructuralIcon type={s.type} />
                <span className="text-xs font-medium text-on-surface-variant">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
