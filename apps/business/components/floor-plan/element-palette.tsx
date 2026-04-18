import { DoorOpen, Save, Loader2 } from "lucide-react";
import type { PaletteTable, PaletteStructural } from "@/lib/mock-data";

function createDragPreview(label: string): HTMLElement {
  const el = document.createElement("div");
  el.textContent = label;
  el.style.cssText =
    "padding:6px 12px;border-radius:8px;background:#865300;color:#fff;font-size:12px;font-weight:600;position:absolute;top:-9999px;white-space:nowrap;";
  document.body.appendChild(el);
  requestAnimationFrame(() => el.remove());
  return el;
}

// ── Table shape icons ────────────────────────────────────

function TableIcon({ shape }: { shape: string }) {
  switch (shape) {
    case "round":
      return (
        <div className="w-12 h-12 rounded-full border-2 border-outline-variant flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-surface-container-highest" />
        </div>
      );
    case "square":
      return (
        <div className="w-12 h-12 rounded-lg border-2 border-outline-variant flex items-center justify-center">
          <div className="w-8 h-6 rounded bg-surface-container-highest" />
        </div>
      );
    case "long":
      return (
        <div className="w-16 h-10 border-2 border-outline-variant rounded-md flex items-center justify-center">
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
  onSave: () => void;
  saving: boolean;
}

export function ElementPalette({ tables, structural, onSave, saving }: ElementPaletteProps) {
  return (
    <aside className="w-72 bg-surface h-full border-l border-outline-variant/10 p-6 flex flex-col overflow-y-auto shadow-sm">
      <div className="mb-6">
        <h3 className="font-headline font-bold text-on-surface text-lg mb-1">
          Elements Palette
        </h3>
        <p className="text-xs text-on-surface-variant">
          Drag & drop onto the canvas
        </p>
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
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify({ kind: "table", type: t.shape }),
                  );
                  e.dataTransfer.effectAllowed = "move";
                  const preview = createDragPreview(t.label);
                  e.dataTransfer.setDragImage(preview, preview.offsetWidth / 2, preview.offsetHeight / 2);
                }}
                className="bg-surface hover:bg-surface-container-high rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-grab active:cursor-grabbing transition-colors shadow-sm"
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
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify({ kind: "structural", type: s.type }),
                  );
                  e.dataTransfer.effectAllowed = "move";
                  const preview = createDragPreview(s.label);
                  e.dataTransfer.setDragImage(preview, preview.offsetWidth / 2, preview.offsetHeight / 2);
                }}
                className="bg-surface hover:bg-surface-container-high rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-grab active:cursor-grabbing transition-colors shadow-sm"
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

      <div className="pt-6 mt-auto">
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full py-3 bg-primary text-on-primary font-headline font-semibold text-sm rounded-xl shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Floor Plan"}
        </button>
      </div>
    </aside>
  );
}
