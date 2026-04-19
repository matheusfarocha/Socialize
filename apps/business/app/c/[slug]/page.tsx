"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logScan } from "@/lib/tracking";
import { Coffee, MapPin, Clock, Loader2, Minus, Plus, Maximize } from "lucide-react";

interface FloorPoint {
  x: number;
  y: number;
}

interface PlacedElement {
  id: string;
  kind: "table" | "structural";
  type: string;
  x: number;
  y: number;
  rotation: number;
  seats?: number;
  label?: string;
  w?: number;
  h?: number;
}

interface MenuItem {
  name: string;
  description: string;
  price: string;
  category: string;
  image?: string;
}

interface VenueData {
  name: string;
  floorWidth: number;
  floorHeight: number;
  outline: FloorPoint[];
  elements: PlacedElement[];
  menuItems: MenuItem[];
}

function outlineToPath(points: FloorPoint[]): string {
  if (points.length < 3) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
}

export default function VenuePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const tableParam = searchParams.get("table");
  const [venue, setVenue] = useState<VenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(tableParam);

  useEffect(() => {
    async function load() {
      const { data: venueRow } = await supabase
        .from("venues")
        .select("id, name")
        .eq("slug", slug)
        .single();
      if (!venueRow) { setLoading(false); return; }

      logScan(venueRow.id, tableParam ?? undefined);

      const { data: zone } = await supabase
        .from("zones")
        .select("id, floor_width, floor_height, floor_outline")
        .eq("venue_id", venueRow.id)
        .order("sort_order")
        .limit(1)
        .single();

      let elements: PlacedElement[] = [];
      if (zone) {
        const { data: tables } = await supabase
          .from("tables")
          .select("identifier, seat_count, shape, pos_x, pos_y, rotation")
          .eq("zone_id", zone.id);

        const { data: structural } = await supabase
          .from("structural_elements")
          .select("element_type, label, pos_x, pos_y, rotation, size_w, size_h")
          .eq("zone_id", zone.id);

        elements = [
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
      }

      const { data: menuRows } = await supabase
        .from("menu_items")
        .select("name, description, price, is_active, image_path, menu_categories!inner(name, venue_id)")
        .eq("menu_categories.venue_id", venueRow.id)
        .eq("is_active", true);

      const mappedMenu: MenuItem[] = (menuRows ?? []).map((row: any) => ({
        name: row.name,
        description: row.description,
        price: row.price,
        category: row.menu_categories?.name ?? "Other",
        image: row.image_path || undefined,
      }));

      setVenue({
        name: venueRow.name,
        floorWidth: zone?.floor_width ?? 800,
        floorHeight: zone?.floor_height ?? 600,
        outline: (zone?.floor_outline as FloorPoint[]) ?? [
          { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
        ],
        elements,
        menuItems: mappedMenu,
      });
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Coffee size={48} className="text-outline-variant mb-4" />
        <h1 className="text-xl font-bold text-on-surface mb-2">Venue not found</h1>
        <p className="text-on-surface-variant text-sm">Check the link and try again.</p>
      </div>
    );
  }

  const categories = [...new Set(venue.menuItems.map((m) => m.category))];

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-primary text-on-primary px-6 py-4 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-on-primary/20 flex items-center justify-center">
            <Coffee size={16} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">{venue.name}</h1>
            <div className="flex items-center gap-3 text-on-primary/80 text-[11px] mt-0.5">
              <span className="flex items-center gap-1"><MapPin size={10} /> Downtown</span>
              <span className="flex items-center gap-1"><Clock size={10} /> Open now</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content: stacked on mobile, side-by-side on desktop */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Floor Plan */}
        <div className="flex-1 min-h-0 lg:min-w-0 flex flex-col">
          <ReadOnlyCanvas
            outline={venue.outline}
            elements={venue.elements}
            floorWidth={venue.floorWidth}
            floorHeight={venue.floorHeight}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
          />
        </div>

        {/* Menu */}
        <section className="max-h-[40%] lg:max-h-none lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-outline-variant/20 overflow-y-auto p-4">
          <h2 className="text-lg font-bold text-on-surface mb-3">Menu</h2>
          {venue.menuItems.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No menu items yet.</p>
          ) : (
            <div className="space-y-6">
              {categories.map((cat) => (
                <div key={cat}>
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">{cat}</h3>
                  <div className="space-y-2">
                    {venue.menuItems
                      .filter((m) => m.category === cat)
                      .map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center gap-3 bg-surface-container-low rounded-xl p-3"
                        >
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-14 h-14 rounded-lg object-cover shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-on-surface">{item.name}</h4>
                            <p className="text-xs text-on-surface-variant truncate">{item.description}</p>
                          </div>
                          <span className="text-sm font-bold text-primary shrink-0">${item.price}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;

function ReadOnlyCanvas({
  outline,
  elements,
  floorWidth,
  floorHeight,
  selectedTable,
  onSelectTable,
}: {
  outline: FloorPoint[];
  elements: PlacedElement[];
  floorWidth: number;
  floorHeight: number;
  selectedTable: string | null;
  onSelectTable: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 60;
    const fit = Math.min(
      (clientWidth - padding) / floorWidth,
      (clientHeight - padding) / floorHeight,
      1.2,
    );
    const z = Math.max(MIN_ZOOM, fit);
    setZoom(z);
    setPan({
      x: (clientWidth - floorWidth * z) / 2,
      y: (clientHeight - floorHeight * z) / 2,
    });
  }, [floorWidth, floorHeight]);

  useEffect(() => {
    fitToView();
  }, [fitToView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        const oldZ = zoomRef.current;
        const newZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZ * factor));
        setPan((p) => ({
          x: mx - (mx - p.x) * (newZ / oldZ),
          y: my - (my - p.y) * (newZ / oldZ),
        }));
        setZoom(newZ);
      } else {
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function handleMouseDown(e: React.MouseEvent) {
    const startX = e.clientX;
    const startY = e.clientY;
    const startPan = { ...panRef.current };
    let panned = false;

    function onMove(me: MouseEvent) {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      if (!panned && dx * dx + dy * dy < 16) return;
      panned = true;
      document.body.style.cursor = "grabbing";
      setPan({ x: startPan.x + dx, y: startPan.y + dy });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      if (!panned) onSelectTable(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const zoomPct = Math.round(zoom * 100);

  return (
    <section className="flex-1 min-h-0 flex flex-col">
      <div className="px-4 pt-5 pb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold text-on-surface">Floor Plan</h2>
      </div>
      <div
        ref={containerRef}
        className="flex-1 min-h-0 bg-surface-container-low mx-4 rounded-2xl relative overflow-hidden"
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#865300 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundPosition: `${pan.x % 24}px ${pan.y % 24}px`,
          }}
        />

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width: floorWidth,
            height: floorHeight,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <div className="relative select-none" style={{ width: floorWidth, height: floorHeight }}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              overflow="visible"
              className="absolute inset-0 w-full h-full"
            >
              <defs>
                <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                  <feDropShadow dx="0" dy="0.5" stdDeviation="1.5" floodColor="#514437" floodOpacity="0.15" />
                </filter>
                <pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse">
                  <circle cx="2.5" cy="2.5" r="0.3" fill="#865300" opacity="0.12" />
                </pattern>
                <clipPath id="floor">
                  <path d={outlineToPath(outline)} />
                </clipPath>
              </defs>
              <path
                d={outlineToPath(outline)}
                fill="#f7f3ed"
                stroke="#514437"
                strokeWidth="0.5"
                strokeOpacity="0.3"
                filter="url(#shadow)"
              />
              <rect width="100" height="100" fill="url(#dots)" clipPath="url(#floor)" />
            </svg>

            {elements.map((el) => (
              <FloorElement
                key={el.id}
                element={el}
                selected={selectedTable === el.id}
                onTap={() => onSelectTable(selectedTable === el.id ? null : el.id)}
                floorWidth={floorWidth}
                floorHeight={floorHeight}
              />
            ))}
          </div>
        </div>

        <div className="absolute bottom-3 right-3 bg-surface/80 backdrop-blur-md p-1 rounded-xl shadow-sm flex items-center gap-1 z-10 border border-outline-variant/10">
          <button
            onClick={() => {
              const newZ = Math.max(MIN_ZOOM, zoom * 0.85);
              if (!containerRef.current) return;
              const { clientWidth, clientHeight } = containerRef.current;
              const cx = clientWidth / 2;
              const cy = clientHeight / 2;
              setPan((p) => ({
                x: cx - (cx - p.x) * (newZ / zoom),
                y: cy - (cy - p.y) * (newZ / zoom),
              }));
              setZoom(newZ);
            }}
            className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="text-[10px] font-bold text-on-surface px-1.5 min-w-[2.5rem] text-center">
            {zoomPct}%
          </span>
          <button
            onClick={() => {
              const newZ = Math.min(MAX_ZOOM, zoom * 1.15);
              if (!containerRef.current) return;
              const { clientWidth, clientHeight } = containerRef.current;
              const cx = clientWidth / 2;
              const cy = clientHeight / 2;
              setPan((p) => ({
                x: cx - (cx - p.x) * (newZ / zoom),
                y: cy - (cy - p.y) * (newZ / zoom),
              }));
              setZoom(newZ);
            }}
            className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <Plus size={14} />
          </button>
          <div className="w-px h-4 bg-outline-variant/30 mx-0.5" />
          <button
            onClick={fitToView}
            className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <Maximize size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}

function FloorElement({
  element,
  selected,
  onTap,
  floorWidth,
  floorHeight,
}: {
  element: PlacedElement;
  selected: boolean;
  onTap: () => void;
  floorWidth: number;
  floorHeight: number;
}) {
  const style: React.CSSProperties = {
    left: `${element.x}%`,
    top: `${element.y}%`,
    transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
    position: "absolute",
  };

  const ring = selected ? "ring-2 ring-primary" : "";

  switch (element.type) {
    case "round":
      return (
        <div
          className={`absolute w-16 h-16 rounded-full border-2 border-outline-variant flex items-center justify-center ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="w-8 h-8 rounded-full bg-surface-container-highest" />
          {selected && <TableLabel id={element.id} seats={element.seats} />}
        </div>
      );
    case "square":
      return (
        <div
          className={`absolute w-16 h-16 rounded-lg border-2 border-outline-variant flex items-center justify-center ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="w-8 h-6 rounded bg-surface-container-highest" />
          {selected && <TableLabel id={element.id} seats={element.seats} />}
        </div>
      );
    case "long":
      return (
        <div
          className={`absolute w-24 h-16 border-2 border-outline-variant rounded-lg flex items-center justify-center ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="w-16 h-8 bg-surface-container-highest rounded-sm" />
          {selected && <TableLabel id={element.id} seats={element.seats} />}
        </div>
      );
    case "booth":
      return (
        <div
          className={`absolute w-14 h-14 border-2 border-outline-variant rounded-[10px] rounded-tl-[24px] flex items-center justify-center ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="w-8 h-8 rounded-[6px] rounded-tl-[16px] bg-surface-container-highest" />
          {selected && <TableLabel id={element.id} seats={element.seats} />}
        </div>
      );
    case "bar": {
      const barW = element.w ?? 256;
      const barH = element.h ?? 96;
      return (
        <div
          className={`absolute bg-surface-container-high rounded-xl flex items-center justify-center border shadow-sm border-outline-variant/30 ${ring}`}
          style={{ ...style, width: barW, height: barH }}
        >
          <span className="text-sm font-semibold text-on-surface-variant">{element.label || "Bar"}</span>
        </div>
      );
    }
    case "entrance":
      return (
        <div
          className="absolute w-24 h-8 flex items-center justify-center border-2 border-dashed border-primary/30 bg-primary/5 rounded-md"
          style={style}
        >
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            {element.label || "Entrance"}
          </span>
        </div>
      );
    case "wall": {
      const wallW = element.w ?? 96;
      return (
        <div
          className="absolute h-2 bg-on-surface-variant/40 rounded-full"
          style={{ ...style, width: wallW }}
        />
      );
    }
    default:
      return null;
  }
}

function TableLabel({ id, seats }: { id: string; seats?: number }) {
  return (
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-on-surface text-surface px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap z-10">
      {id}{seats ? ` · ${seats} seats` : ""}
    </div>
  );
}
