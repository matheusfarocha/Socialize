"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Coffee, MapPin, Clock, Loader2 } from "lucide-react";

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
  const slug = params.slug as string;
  const [venue, setVenue] = useState<VenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: venueRow } = await supabase
        .from("venues")
        .select("id, name")
        .eq("slug", slug)
        .single();
      if (!venueRow) { setLoading(false); return; }

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
        .select("name, description, price, category")
        .eq("venue_id", venueRow.id)
        .eq("active", true);

      setVenue({
        name: venueRow.name,
        floorWidth: zone?.floor_width ?? 800,
        floorHeight: zone?.floor_height ?? 600,
        outline: (zone?.floor_outline as FloorPoint[]) ?? [
          { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 },
        ],
        elements,
        menuItems: (menuRows ?? []) as MenuItem[],
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
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-primary text-on-primary px-6 py-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-full bg-on-primary/20 flex items-center justify-center">
            <Coffee size={18} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{venue.name}</h1>
        </div>
        <div className="flex items-center gap-4 text-on-primary/80 text-xs mt-2">
          <span className="flex items-center gap-1"><MapPin size={12} /> Downtown</span>
          <span className="flex items-center gap-1"><Clock size={12} /> Open now</span>
        </div>
      </header>

      {/* Floor Plan */}
      <section className="px-4 py-5">
        <h2 className="text-lg font-bold text-on-surface mb-3">Floor Plan</h2>
        <div className="bg-surface-container-low rounded-2xl p-4 overflow-hidden">
          <div className="relative w-full" style={{ aspectRatio: `${venue.floorWidth} / ${venue.floorHeight}` }}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full"
            >
              <defs>
                <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                  <feDropShadow dx="0" dy="0.5" stdDeviation="1" floodColor="#514437" floodOpacity="0.1" />
                </filter>
                <pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse">
                  <circle cx="2.5" cy="2.5" r="0.3" fill="#865300" opacity="0.12" />
                </pattern>
                <clipPath id="floor">
                  <path d={outlineToPath(venue.outline)} />
                </clipPath>
              </defs>
              <path
                d={outlineToPath(venue.outline)}
                fill="#f7f3ed"
                stroke="#514437"
                strokeWidth="0.5"
                strokeOpacity="0.3"
                filter="url(#shadow)"
              />
              <rect width="100" height="100" fill="url(#dots)" clipPath="url(#floor)" />
            </svg>

            {venue.elements.map((el) => (
              <FloorElement
                key={el.id}
                element={el}
                selected={selectedTable === el.id}
                onTap={() => setSelectedTable(selectedTable === el.id ? null : el.id)}
                floorWidth={venue.floorWidth}
                floorHeight={venue.floorHeight}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Menu */}
      <section className="px-4 pb-8 flex-1">
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
                        className="flex items-center justify-between bg-surface-container-low rounded-xl px-4 py-3"
                      >
                        <div className="flex-1 min-w-0 mr-4">
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
          className={`absolute w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-outline-variant flex items-center justify-center ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-surface-container-highest" />
          {selected && <TableLabel id={element.id} seats={element.seats} />}
        </div>
      );
    case "square":
      return (
        <div
          className={`absolute w-8 h-8 sm:w-10 sm:h-10 rounded-lg border-2 border-outline-variant flex items-center justify-center ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="w-5 h-3 sm:w-6 sm:h-4 rounded bg-surface-container-highest" />
          {selected && <TableLabel id={element.id} seats={element.seats} />}
        </div>
      );
    case "long":
      return (
        <div
          className={`absolute w-12 h-8 sm:w-14 sm:h-10 border-2 border-outline-variant rounded-lg flex items-center justify-center ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="w-8 h-4 sm:w-10 sm:h-5 bg-surface-container-highest rounded-sm" />
          {selected && <TableLabel id={element.id} seats={element.seats} />}
        </div>
      );
    case "booth":
      return (
        <div
          className={`absolute w-8 h-8 sm:w-10 sm:h-10 border-2 border-outline-variant rounded-[6px] rounded-tl-[14px] flex items-center justify-center ${ring}`}
          style={style}
          onClick={onTap}
        >
          <div className="w-5 h-5 rounded-[4px] rounded-tl-[10px] bg-surface-container-highest" />
          {selected && <TableLabel id={element.id} seats={element.seats} />}
        </div>
      );
    case "bar": {
      const barW = element.w ?? 256;
      const barH = element.h ?? 96;
      const scale = 0.4;
      return (
        <div
          className={`absolute bg-surface-container-high rounded-lg flex items-center justify-center border border-outline-variant/30 ${ring}`}
          style={{ ...style, width: barW * scale, height: barH * scale }}
        >
          <span className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant">{element.label || "Bar"}</span>
        </div>
      );
    }
    case "entrance":
      return (
        <div
          className="absolute w-12 h-5 sm:w-14 sm:h-6 flex items-center justify-center border border-dashed border-primary/40 bg-primary/5 rounded"
          style={style}
        >
          <span className="text-[8px] sm:text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
            {element.label || "Entry"}
          </span>
        </div>
      );
    case "wall": {
      const wallW = element.w ?? 96;
      return (
        <div
          className="absolute h-1 bg-on-surface-variant/30 rounded-full"
          style={{ ...style, width: wallW * 0.4 }}
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
