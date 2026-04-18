"use client";

import type { FloorPoint } from "./canvas";
import { Minus, Plus } from "lucide-react";

const presets: { label: string; outline: FloorPoint[] }[] = [
  {
    label: "Rectangle",
    outline: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
  },
  {
    label: "Wide",
    outline: [
      { x: 0, y: 20 },
      { x: 100, y: 20 },
      { x: 100, y: 80 },
      { x: 0, y: 80 },
    ],
  },
  {
    label: "L-Shape",
    outline: [
      { x: 0, y: 0 },
      { x: 60, y: 0 },
      { x: 60, y: 50 },
      { x: 100, y: 50 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
  },
  {
    label: "U-Shape",
    outline: [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 60 },
      { x: 70, y: 60 },
      { x: 70, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
  },
  {
    label: "T-Shape",
    outline: [
      { x: 20, y: 0 },
      { x: 80, y: 0 },
      { x: 80, y: 35 },
      { x: 100, y: 35 },
      { x: 100, y: 65 },
      { x: 80, y: 65 },
      { x: 80, y: 100 },
      { x: 20, y: 100 },
      { x: 20, y: 65 },
      { x: 0, y: 65 },
      { x: 0, y: 35 },
      { x: 20, y: 35 },
    ],
  },
  {
    label: "Corner",
    outline: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 60 },
      { x: 50, y: 60 },
      { x: 50, y: 100 },
      { x: 0, y: 100 },
    ],
  },
  {
    label: "Diagonal Cut",
    outline: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 40 },
      { x: 40, y: 40 },
    ],
  },
];

function PresetThumb({ outline }: { outline: FloorPoint[] }) {
  const path =
    outline.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") +
    " Z";
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <path
        d={path}
        fill="#f7f3ed"
        stroke="#865300"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ShapePresetsProps {
  outline: FloorPoint[];
  floorWidth: number;
  floorHeight: number;
  onOutlineChange: (outline: FloorPoint[]) => void;
  onWidthChange: (w: number) => void;
  onHeightChange: (h: number) => void;
}

export function ShapePresets({
  outline,
  floorWidth,
  floorHeight,
  onOutlineChange,
  onWidthChange,
  onHeightChange,
}: ShapePresetsProps) {
  return (
    <aside className="w-64 bg-surface h-full border-l border-outline-variant/10 px-5 py-4 flex flex-col shadow-sm">
      <div className="mb-4">
        <h3 className="font-headline font-bold text-on-surface text-base mb-0.5">
          Floor Shape
        </h3>
        <p className="text-[11px] text-on-surface-variant">
          Choose a preset or draw on the canvas
        </p>
      </div>

      {/* Dimensions */}
      <div className="flex gap-4 mb-5">
        <div className="flex-1">
          <label className="block text-[11px] font-headline font-semibold text-on-surface-variant mb-1">
            Width (ft)
          </label>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onWidthChange(Math.max(200, floorWidth - 50))}
              className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors shrink-0"
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              value={floorWidth}
              onChange={(e) => onWidthChange(Math.max(200, Number(e.target.value)))}
              className="w-14 text-center bg-surface-container-highest rounded-lg px-1 py-0.5 border-none focus:ring-1 focus:ring-primary text-xs font-headline font-bold"
            />
            <button
              onClick={() => onWidthChange(floorWidth + 50)}
              className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors shrink-0"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-headline font-semibold text-on-surface-variant mb-1">
            Height (ft)
          </label>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onHeightChange(Math.max(200, floorHeight - 50))}
              className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors shrink-0"
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              value={floorHeight}
              onChange={(e) => onHeightChange(Math.max(200, Number(e.target.value)))}
              className="w-14 text-center bg-surface-container-highest rounded-lg px-1 py-0.5 border-none focus:ring-1 focus:ring-primary text-xs font-headline font-bold"
            />
            <button
              onClick={() => onHeightChange(floorHeight + 50)}
              className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors shrink-0"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div className="flex-1 min-h-0">
        <h4 className="font-headline font-semibold text-on-surface text-xs mb-2">
          Presets
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => {
            const isActive =
              JSON.stringify(preset.outline) === JSON.stringify(outline);
            return (
              <button
                key={preset.label}
                onClick={() => onOutlineChange(preset.outline)}
                className={`rounded-lg p-2 flex flex-col items-center gap-1 transition-all ${
                  isActive
                    ? "bg-primary/10 ring-2 ring-primary"
                    : "bg-surface hover:bg-surface-container-high shadow-sm"
                }`}
              >
                <div className="w-10 h-8">
                  <PresetThumb outline={preset.outline} />
                </div>
                <span className="text-[10px] font-medium text-on-surface-variant leading-tight">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Point count + reset */}
      <div className="mt-4 p-3 bg-surface-container rounded-xl">
        <div className="flex justify-between items-center text-xs">
          <span className="text-on-surface-variant font-medium">Points</span>
          <span className="font-headline font-bold text-on-surface">
            {outline.length}
          </span>
        </div>
        <button
          onClick={() => {
            onOutlineChange([
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 100, y: 100 },
              { x: 0, y: 100 },
            ]);
            onWidthChange(800);
            onHeightChange(600);
          }}
          className="w-full mt-2 py-1.5 text-[11px] font-semibold text-error hover:bg-error-container/30 rounded-lg transition-colors"
        >
          Reset to Rectangle
        </button>
      </div>
    </aside>
  );
}
