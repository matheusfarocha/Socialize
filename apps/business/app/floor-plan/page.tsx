"use client";

import { TopBar } from "@/components/top-bar";
import { zones, paletteTables, paletteStructural } from "@/lib/mock-data";
import { ElementPalette } from "@/components/floor-plan/element-palette";
import { Canvas } from "@/components/floor-plan/canvas";
import { PropertiesPanel } from "@/components/floor-plan/properties-panel";

export default function FloorPlanPage() {
  return (
    <>
      <TopBar>
        <h2 className="font-headline font-extrabold text-lg text-on-surface">
          Floor Plan Editor
        </h2>
        <div className="flex bg-surface-container-low rounded-xl p-1 gap-1">
          {zones.map((zone, i) => (
            <button
              key={zone}
              className={`px-4 py-1.5 rounded-lg font-headline text-sm transition-all ${
                i === 0
                  ? "bg-surface shadow-sm text-primary font-semibold"
                  : "text-on-surface-variant hover:bg-surface/50 font-medium"
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </TopBar>

      <div className="flex-1 mt-[72px] flex overflow-hidden">
        <ElementPalette tables={paletteTables} structural={paletteStructural} />
        <Canvas />
        <PropertiesPanel />
      </div>
    </>
  );
}
