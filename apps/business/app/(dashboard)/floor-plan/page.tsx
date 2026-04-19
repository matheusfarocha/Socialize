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
import { Plus, Layers, Trash2, Pencil, Check, X } from "lucide-react";

const defaultOutline: FloorPoint[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

const defaultElements: PlacedElement[] = [];

interface ZoneData {
  id: string;
  name: string;
  sortOrder: number;
  floorWidth: number;
  floorHeight: number;
  outline: FloorPoint[];
  elements: PlacedElement[];
}

export default function FloorPlanPage() {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);

  const [outline, setOutline] = useState<FloorPoint[]>(defaultOutline);
  const [editingShape, setEditingShape] = useState(false);
  const [floorWidth, setFloorWidth] = useState(800);
  const [floorHeight, setFloorHeight] = useState(600);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [elements, setElements] = useState<PlacedElement[]>(defaultElements);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [addingFloor, setAddingFloor] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const [renamingZoneId, setRenamingZoneId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

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

  function stashCurrentZone() {
    if (!activeZoneId) return;
    setZones((prev) =>
      prev.map((z) =>
        z.id === activeZoneId
          ? { ...z, outline, elements, floorWidth, floorHeight }
          : z,
      ),
    );
  }

  function loadZoneIntoState(zone: ZoneData) {
    setOutline(zone.outline);
    setElements(zone.elements);
    setFloorWidth(zone.floorWidth);
    setFloorHeight(zone.floorHeight);
    setActiveZoneId(zone.id);
    setSelectedElementId(null);
    setEditingShape(false);
    outlineHistory.current = [];
  }

  function switchToZone(zoneId: string) {
    if (zoneId === activeZoneId) return;
    stashCurrentZone();
    const zone = zones.find((z) => z.id === zoneId);
    if (zone) loadZoneIntoState(zone);
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: venue } = await supabase
        .from("venues")
        .select("id")
        .eq("owner_id", user.id)
        .single();
      if (!venue) { setLoading(false); return; }
      setVenueId(venue.id);

      const { data: zoneRows } = await supabase
        .from("zones")
        .select("id, name, sort_order, floor_width, floor_height, floor_outline")
        .eq("venue_id", venue.id)
        .order("sort_order");

      if (!zoneRows || zoneRows.length === 0) {
        setLoading(false);
        return;
      }

      const loadedZones: ZoneData[] = [];

      for (const zr of zoneRows) {
        const { data: tables } = await supabase
          .from("tables")
          .select("identifier, seat_count, shape, pos_x, pos_y, rotation")
          .eq("zone_id", zr.id);

        const { data: structural } = await supabase
          .from("structural_elements")
          .select("element_type, label, pos_x, pos_y, rotation, size_w, size_h")
          .eq("zone_id", zr.id);

        const elems: PlacedElement[] = [
          ...(tables ?? []).map((t) => ({
            id: t.identifier,
            kind: "table" as const,
            type: t.shape,
            x: t.pos_x,
            y: t.pos_y,
            rotation: t.rotation,
            seats: t.seat_count,
          })),
          ...(structural ?? []).map((s, i) => ({
            id: s.element_type === "bar" ? `BAR-${String(i + 1).padStart(2, "0")}` :
                s.element_type === "entrance" ? `ENT-${String(i + 1).padStart(2, "0")}` :
                `W-${String(i + 1).padStart(2, "0")}`,
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

        loadedZones.push({
          id: zr.id,
          name: zr.name,
          sortOrder: zr.sort_order,
          floorWidth: zr.floor_width ?? 800,
          floorHeight: zr.floor_height ?? 600,
          outline: (zr.floor_outline as FloorPoint[]) ?? defaultOutline,
          elements: elems,
        });
      }

      setZones(loadedZones);
      loadZoneIntoState(loadedZones[0]);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, []);

  const selectedElement = elements.find((e) => e.id === selectedElementId) ?? null;

  async function handleAddFloor() {
    const name = newFloorName.trim();
    if (!name || !venueId) return;

    const sortOrder = zones.length;
    const { data: newZone, error } = await supabase
      .from("zones")
      .insert({
        venue_id: venueId,
        name,
        sort_order: sortOrder,
        floor_width: 800,
        floor_height: 600,
        floor_outline: defaultOutline,
      })
      .select("id, name, sort_order, floor_width, floor_height, floor_outline")
      .single();

    if (error || !newZone) {
      alert("Failed to create floor: " + (error?.message ?? "Unknown error"));
      return;
    }

    const zoneData: ZoneData = {
      id: newZone.id,
      name: newZone.name,
      sortOrder: newZone.sort_order,
      floorWidth: newZone.floor_width ?? 800,
      floorHeight: newZone.floor_height ?? 600,
      outline: (newZone.floor_outline as FloorPoint[]) ?? defaultOutline,
      elements: [],
    };

    stashCurrentZone();
    setZones((prev) => [...prev, zoneData]);
    loadZoneIntoState(zoneData);
    setAddingFloor(false);
    setNewFloorName("");
  }

  async function handleDeleteZone(zoneId: string) {
    if (zones.length <= 1) return;
    if (!confirm("Delete this floor and all its tables/elements?")) return;

    await supabase.from("tables").delete().eq("zone_id", zoneId);
    await supabase.from("structural_elements").delete().eq("zone_id", zoneId);
    await supabase.from("zones").delete().eq("id", zoneId);

    const remaining = zones.filter((z) => z.id !== zoneId);
    setZones(remaining);
    if (activeZoneId === zoneId && remaining.length > 0) {
      loadZoneIntoState(remaining[0]);
    }
  }

  async function handleRenameZone() {
    const name = renameValue.trim();
    if (!name || !renamingZoneId) return;

    await supabase.from("zones").update({ name }).eq("id", renamingZoneId);
    setZones((prev) =>
      prev.map((z) => (z.id === renamingZoneId ? { ...z, name } : z)),
    );
    setRenamingZoneId(null);
    setRenameValue("");
  }

  async function handleSave() {
    if (!activeZoneId) return;
    setSaving(true);
    try {
      await supabase.from("zones").update({
        floor_width: floorWidth,
        floor_height: floorHeight,
        floor_outline: outline,
      }).eq("id", activeZoneId);

      await supabase.from("tables").delete().eq("zone_id", activeZoneId);
      const tableRows = elements
        .filter((e) => e.kind === "table")
        .map((e) => ({
          zone_id: activeZoneId,
          identifier: e.id,
          seat_count: e.seats ?? 2,
          shape: e.type,
          pos_x: e.x,
          pos_y: e.y,
          rotation: e.rotation,
        }));
      if (tableRows.length) await supabase.from("tables").insert(tableRows);

      await supabase.from("structural_elements").delete().eq("zone_id", activeZoneId);
      const structRows = elements
        .filter((e) => e.kind === "structural")
        .map((e) => ({
          zone_id: activeZoneId,
          element_type: e.type,
          label: e.label ?? "",
          pos_x: e.x,
          pos_y: e.y,
          rotation: e.rotation,
          size_w: e.w ?? null,
          size_h: e.h ?? null,
        }));
      if (structRows.length) await supabase.from("structural_elements").insert(structRows);

      stashCurrentZone();
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

      <div className="flex-1 mt-[72px] flex flex-col overflow-hidden">
        {/* Floor tabs */}
        <div className="shrink-0 px-4 pt-3 pb-2 flex items-center gap-2 border-b border-outline-variant/20">
          <Layers size={16} className="text-on-surface-variant" />
          {zones.map((zone) => (
            <div key={zone.id} className="flex items-center gap-0.5 group">
              {renamingZoneId === zone.id ? (
                <div className="flex items-center gap-1">
                  <input
                    className="px-2 py-1 text-sm rounded-lg border border-primary bg-surface-container-low text-on-surface focus:outline-none w-28"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRenameZone(); if (e.key === "Escape") setRenamingZoneId(null); }}
                    autoFocus
                  />
                  <button onClick={handleRenameZone} className="p-1 rounded hover:bg-surface-container text-primary"><Check size={14} /></button>
                  <button onClick={() => setRenamingZoneId(null)} className="p-1 rounded hover:bg-surface-container text-on-surface-variant"><X size={14} /></button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => switchToZone(zone.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      zone.id === activeZoneId
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant hover:bg-surface-container-low"
                    }`}
                  >
                    {zone.name}
                  </button>
                  {zone.id === activeZoneId && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setRenamingZoneId(zone.id); setRenameValue(zone.name); }}
                        className="p-1 rounded hover:bg-surface-container text-on-surface-variant"
                        title="Rename"
                      >
                        <Pencil size={12} />
                      </button>
                      {zones.length > 1 && (
                        <button
                          onClick={() => handleDeleteZone(zone.id)}
                          className="p-1 rounded hover:bg-error-container text-on-surface-variant hover:text-error"
                          title="Delete floor"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {addingFloor ? (
            <div className="flex items-center gap-1">
              <input
                className="px-2 py-1 text-sm rounded-lg border border-primary bg-surface-container-low text-on-surface focus:outline-none w-28"
                placeholder="Floor name..."
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddFloor(); if (e.key === "Escape") { setAddingFloor(false); setNewFloorName(""); } }}
                autoFocus
              />
              <button onClick={handleAddFloor} className="p-1 rounded hover:bg-surface-container text-primary"><Check size={14} /></button>
              <button onClick={() => { setAddingFloor(false); setNewFloorName(""); }} className="p-1 rounded hover:bg-surface-container text-on-surface-variant"><X size={14} /></button>
            </div>
          ) : (
            <button
              onClick={() => setAddingFloor(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <Plus size={14} />
              Add Floor
            </button>
          )}
        </div>

        {/* Editor */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
            </div>
          ) : zones.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <Layers size={32} />
              <p className="text-sm">No floors yet. Add one to get started.</p>
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
      </div>
    </>
  );
}
