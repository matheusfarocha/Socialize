"use client";

import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import type { PlacedElement } from "./canvas";

interface PropertiesPanelProps {
  element: PlacedElement;
  onBack: () => void;
  onDelete: () => void;
  onChange: (updated: PlacedElement) => void;
}

export function PropertiesPanel({
  element,
  onBack,
  onDelete,
  onChange,
}: PropertiesPanelProps) {
  const isTable = element.kind === "table";

  return (
    <aside className="w-72 bg-surface h-full border-l border-outline-variant/10 p-6 flex flex-col overflow-y-auto z-10 shadow-sm">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 mb-4 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Elements
      </button>
      <div className="mb-8">
        <h3 className="font-headline font-bold text-on-surface text-lg">
          {isTable ? "Table Properties" : "Element Properties"}
        </h3>
        <p className="text-xs text-on-surface-variant">Editing {element.id}</p>
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
              value={element.id}
              onChange={(e) => onChange({ ...element, id: e.target.value })}
            />
          </div>
        </div>

        {element.label !== undefined && (
          <div>
            <label className="block text-xs font-headline font-semibold text-on-surface-variant mb-2">
              Label
            </label>
            <div className="bg-surface-container-highest rounded-xl px-4 py-2">
              <input
                className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-on-surface w-full p-0"
                type="text"
                value={element.label}
                onChange={(e) =>
                  onChange({ ...element, label: e.target.value })
                }
              />
            </div>
          </div>
        )}

        {isTable && element.seats !== undefined && (
          <div>
            <label className="block text-xs font-headline font-semibold text-on-surface-variant mb-2">
              Seat Count
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  onChange({
                    ...element,
                    seats: Math.max(1, (element.seats ?? 2) - 1),
                  })
                }
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="font-headline font-bold text-on-surface w-8 text-center">
                {element.seats}
              </span>
              <button
                onClick={() =>
                  onChange({
                    ...element,
                    seats: (element.seats ?? 2) + 1,
                  })
                }
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}

        {isTable && (
          <>
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
          </>
        )}

        {element.type === "wall" && (
          <div>
            <label className="block text-xs font-headline font-semibold text-on-surface-variant mb-2">
              Length
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  onChange({ ...element, w: Math.max(32, (element.w ?? 96) - 16) })
                }
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
              >
                <Minus size={16} />
              </button>
              <input
                className="w-16 text-center bg-surface-container-highest rounded-xl px-2 py-1 border-none focus:ring-1 focus:ring-primary text-sm font-headline font-bold"
                type="number"
                value={element.w ?? 96}
                onChange={(e) =>
                  onChange({ ...element, w: Math.max(32, Number(e.target.value)) })
                }
              />
              <button
                onClick={() =>
                  onChange({ ...element, w: (element.w ?? 96) + 16 })
                }
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}

        {element.type === "bar" && (
          <div>
            <label className="block text-xs font-headline font-semibold text-on-surface-variant mb-2">
              Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-on-surface-variant mb-1 block">Width</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      onChange({ ...element, w: Math.max(64, (element.w ?? 256) - 32) })
                    }
                    className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors shrink-0"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    className="w-14 text-center bg-surface-container-highest rounded-lg px-1 py-0.5 border-none focus:ring-1 focus:ring-primary text-xs font-headline font-bold"
                    type="number"
                    value={element.w ?? 256}
                    onChange={(e) =>
                      onChange({ ...element, w: Math.max(64, Number(e.target.value)) })
                    }
                  />
                  <button
                    onClick={() =>
                      onChange({ ...element, w: (element.w ?? 256) + 32 })
                    }
                    className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant mb-1 block">Height</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      onChange({ ...element, h: Math.max(32, (element.h ?? 96) - 16) })
                    }
                    className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors shrink-0"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    className="w-14 text-center bg-surface-container-highest rounded-lg px-1 py-0.5 border-none focus:ring-1 focus:ring-primary text-xs font-headline font-bold"
                    type="number"
                    value={element.h ?? 96}
                    onChange={(e) =>
                      onChange({ ...element, h: Math.max(32, Number(e.target.value)) })
                    }
                  />
                  <button
                    onClick={() =>
                      onChange({ ...element, h: (element.h ?? 96) + 16 })
                    }
                    className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-headline font-semibold text-on-surface-variant mb-2">
            Position
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface-container-highest rounded-xl px-3 py-2 flex items-center gap-1">
              <span className="text-xs text-on-surface-variant">X</span>
              <input
                className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-on-surface w-full p-0 text-right"
                type="number"
                value={Math.round(element.x)}
                onChange={(e) =>
                  onChange({
                    ...element,
                    x: Math.max(0, Math.min(100, Number(e.target.value))),
                  })
                }
              />
            </div>
            <div className="bg-surface-container-highest rounded-xl px-3 py-2 flex items-center gap-1">
              <span className="text-xs text-on-surface-variant">Y</span>
              <input
                className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-on-surface w-full p-0 text-right"
                type="number"
                value={Math.round(element.y)}
                onChange={(e) =>
                  onChange({
                    ...element,
                    y: Math.max(0, Math.min(100, Number(e.target.value))),
                  })
                }
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-headline font-semibold text-on-surface-variant mb-2">
            Rotation
          </label>
          <div className="bg-surface-container-highest rounded-xl px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-on-surface">
              {element.rotation}°
            </span>
            <button
              onClick={() =>
                onChange({
                  ...element,
                  rotation: (element.rotation + 90) % 360,
                })
              }
              className="text-primary hover:text-primary/80 transition-colors"
            >
              <span className="text-xs font-semibold">+90°</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={onDelete}
          className="w-full py-2.5 rounded-xl border border-error/30 text-error hover:bg-error-container/50 font-headline font-semibold text-sm transition-colors flex justify-center items-center gap-2"
        >
          <Trash2 size={16} />
          Remove {isTable ? "Table" : "Element"}
        </button>
      </div>
    </aside>
  );
}
