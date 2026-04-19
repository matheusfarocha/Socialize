"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/top-bar";
import { supabase } from "@/lib/supabase";
import { paletteTables, paletteStructural } from "@/lib/mock-data";
import { ElementPalette } from "@/components/floor-plan/element-palette";
import { Canvas } from "@/components/floor-plan/canvas";
import type { FloorPoint, PlacedElement } from "@/components/floor-plan/canvas";
import { PropertiesPanel } from "@/components/floor-plan/properties-panel";
import { ShapePresets } from "@/components/floor-plan/shape-presets";

const defaultOutline: FloorPoint[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

const defaultElements: PlacedElement[] = [
  { id: "BAR-01", kind: "structural", type: "bar", x: 50, y: 12, rotation: 0, label: "Main Espresso Bar" },
  { id: "T-01", kind: "table", type: "round", x: 15, y: 50, rotation: 0, seats: 2 },
  { id: "T-02", kind: "table", type: "round", x: 35, y: 50, rotation: 0, seats: 2 },
  { id: "T-03", kind: "table", type: "long", x: 78, y: 50, rotation: 0, seats: 4 },
  { id: "ENT-01", kind: "structural", type: "entrance", x: 50, y: 95, rotation: 0, label: "Entrance" },
];

export default function FloorPlanPage() {
  const [outline, setOutline] = useState<FloorPoint[]>(defaultOutline);
  const [editingShape, setEditingShape] = useState(false);
  const [floorWidth, setFloorWidth] = useState(800);
  const [floorHeight, setFloorHeight] = useState(600);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [elements, setElements] = useState<PlacedElement[]>(defaultElements);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const outlineHistory = useRef<FloorPoint[][]>([]);
  const MAX_HISTORY = 20;

  const handleOutlineChange = useCallback((newOutline: FloorPoint[]) => {
    setOutline((prev) => {
      outlineHistory.current = [
        ...outlineHistory.current.slice(-(MAX_HISTORY - 1)),
        prev,
      ];
      return newOutline;
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (outlineHistory.current.length === 0) return;
    const prev = outlineHistory.current.pop()!;
    setOutline(prev);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && editingShape) {
        e.preventDefault();
        handleUndo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingShape, handleUndo]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoaded(true); setLoading(false); return; }

      const { data: venue } = await supabase
        .from("venues")
        .select("id")
        .eq("owner_id", user.id)
        .single();
      if (!venue) { setLoaded(true); setLoading(false); return; }

      const { data: zone } = await supabase
        .from("zones")
        .select("id, floor_width, floor_height, floor_outline")
        .eq("venue_id", venue.id)
        .order("sort_order")
        .limit(1)
        .single();
      if (!zone) { setLoaded(true); setLoading(false); return; }

      if (zone.floor_width) setFloorWidth(zone.floor_width);
      if (zone.floor_height) setFloorHeight(zone.floor_height);
      if (zone.floor_outline) setOutline(zone.floor_outline as FloorPoint[]);

      const { data: tables } = await supabase
        .from("tables")
        .select("identifier, seat_count, shape, pos_x, pos_y, rotation")
        .eq("zone_id", zone.id);

      const { data: structural } = await supabase
        .from("structural_elements")
        .select("element_type, label, pos_x, pos_y, rotation, size_w, size_h")
        .eq("zone_id", zone.id);

      const loaded: PlacedElement[] = [
        ...(tables ?? []).map((t) => ({
          id: t.identifier,
          kind: "table" as const,
          type: t.shape,
          x: t.pos_x,
          y: t.pos_y,
          rotation: t.rotation,
          seats: t.seat_count,
        })),
        ...(structural ?? []).map((s) => ({
          id: s.element_type === "bar" ? `BAR-${String((structural ?? []).indexOf(s) + 1).padStart(2, "0")}` :
              s.element_type === "entrance" ? `ENT-${String((structural ?? []).indexOf(s) + 1).padStart(2, "0")}` :
              `W-${String((structural ?? []).indexOf(s) + 1).padStart(2, "0")}`,
          kind: "structural" as const,
          type: s.element_type,
          x: s.pos_x,
          y: s.pos_y,
          rotation: s.rotation,
          label: s.label || undefined,
          w: s.size_w ?? undefined,
          h: s.size_h ?? undefined,
        })),
      ];

      if (loaded.length > 0) setElements(loaded);
      setLoaded(true);
      setLoading(false);
    }
    load().catch(() => { setLoaded(true); setLoading(false); });
  }, []);

  const selectedElement = elements.find((e) => e.id === selectedElementId) ?? null;

  async function getOrCreateZone() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let { data: venue } = await supabase
      .from("venues")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!venue) {
      const { data: newVenue } = await supabase
        .from("venues")
        .insert({ owner_id: user.id, slug: "demo-venue", name: "Demo Venue" })
        .select("id")
        .single();
      venue = newVenue;
    }
    if (!venue) return null;

    let { data: zone } = await supabase
      .from("zones")
      .select("id")
      .eq("venue_id", venue.id)
      .order("sort_order")
      .limit(1)
      .single();

    if (!zone) {
      const { data: newZone } = await supabase
        .from("zones")
        .insert({ venue_id: venue.id, name: "Main Floor", sort_order: 0 })
        .select("id")
        .single();
      zone = newZone;
    }

    return zone;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const zone = await getOrCreateZone();
      if (!zone) { alert("Please log in first"); setSaving(false); return; }

      await supabase.from("zones").update({
        floor_width: floorWidth,
        floor_height: floorHeight,
        floor_outline: outline,
      }).eq("id", zone.id);

      await supabase.from("tables").delete().eq("zone_id", zone.id);
      const tableRows = elements
        .filter((e) => e.kind === "table")
        .map((e) => ({
          zone_id: zone.id,
          identifier: e.id,
          seat_count: e.seats ?? 2,
          shape: e.type,
          pos_x: e.x,
          pos_y: e.y,
          rotation: e.rotation,
        }));
      if (tableRows.length) await supabase.from("tables").insert(tableRows);

      await supabase.from("structural_elements").delete().eq("zone_id", zone.id);
      const structRows = elements
        .filter((e) => e.kind === "structural")
        .map((e) => ({
          zone_id: zone.id,
          element_type: e.type,
          label: e.label ?? "",
          pos_x: e.x,
          pos_y: e.y,
          rotation: e.rotation,
          size_w: e.w ?? null,
          size_h: e.h ?? null,
        }));
      if (structRows.length) await supabase.from("structural_elements").insert(structRows);
    } catch (err) {
      console.error(err);
      alert("Failed to save floor plan");
    } finally {
      setSaving(false);
    }
  }

  function handleElementChange(updated: PlacedElement) {
    setElements((prev) =>
      prev.map((e) => (e.id === selectedElementId ? updated : e)),
    );
    if (updated.id !== selectedElementId) setSelectedElementId(updated.id);
  }

  function handleDeleteSelected() {
    setElements((prev) => prev.filter((e) => e.id !== selectedElementId));
    setSelectedElementId(null);
  }

  return (
    <>
      <TopBar>
        <h2 className="font-headline font-extrabold text-lg text-on-surface">
          Floor Plan Editor
        </h2>
      </TopBar>

      <div className="flex-1 mt-[72px] flex overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            <Canvas
              outline={outline}
              width={floorWidth}
              height={floorHeight}
              editingShape={editingShape}
              selectedElementId={selectedElementId}
              elements={elements}
              onToggleShapeEdit={() => {
                setEditingShape(!editingShape);
                setSelectedElementId(null);
              }}
              onOutlineChange={handleOutlineChange}
              onOutlineSet={setOutline}
              onSelectElement={setSelectedElementId}
              onElementsChange={setElements}
              onUndo={handleUndo}
            />
            {editingShape ? (
              <ShapePresets
                outline={outline}
                floorWidth={floorWidth}
                floorHeight={floorHeight}
                onOutlineChange={handleOutlineChange}
                onWidthChange={setFloorWidth}
                onHeightChange={setFloorHeight}
              />
            ) : selectedElement ? (
              <PropertiesPanel
                element={selectedElement}
                onBack={() => setSelectedElementId(null)}
                onDelete={handleDeleteSelected}
                onChange={handleElementChange}
              />
            ) : (
              <ElementPalette tables={paletteTables} structural={paletteStructural} onSave={handleSave} saving={saving} />
            )}
          </>
        )}
      </div>
    </>
  );
}
