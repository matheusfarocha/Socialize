"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Layers,
  Loader2,
  MapPin,
  Maximize,
  Minus,
  Plus,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { PresenceProfileModal } from "@/components/social/presence-profile-modal";
import {
  buildPresenceTableId,
  findTableSummary,
  type TableSummary,
  type VenueSummary,
} from "@/lib/presence";
import { createPublicSupabaseClient } from "@/lib/supabase";
import { useVenuePresence } from "@/lib/use-venue-presence";

/* ─── Types ─────────────────────────────────────────── */

interface FloorPoint { x: number; y: number }

interface PlacedElement {
  id: string;
  renderKey: string;
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

interface ZoneData {
  id: string;
  name: string;
  floorWidth: number;
  floorHeight: number;
  outline: FloorPoint[];
  elements: PlacedElement[];
}

interface VenueData {
  id: string;
  slug: string;
  name: string;
  branchName: string;
  zones: ZoneData[];
}

/* ─── Constants ─────────────────────────────────────── */

const publicSupabase = createPublicSupabaseClient();

const defaultOutline: FloorPoint[] = [
  { x: 0, y: 0 }, { x: 100, y: 0 },
  { x: 100, y: 100 }, { x: 0, y: 100 },
];

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 4;

/* ─── Helpers ───────────────────────────────────────── */

function outlineToPath(points: FloorPoint[]): string {
  if (points.length < 3) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
}

/* ─── Page ───────────────────────────────────────────── */

export default function VenueFloorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const requestedTable = searchParams.get("table");

  const [venue, setVenue] = useState<VenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeZoneIndex, setActiveZoneIndex] = useState(0);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  /* Presence */
  const presenceVenue: VenueSummary | null = useMemo(
    () => venue ? { id: venue.id, slug: venue.slug, name: venue.name, branchName: venue.branchName } : null,
    [venue],
  );

  const presenceTables: TableSummary[] = useMemo(
    () => (venue?.zones ?? []).flatMap((zone) =>
      zone.elements
        .filter((el) => el.kind === "table")
        .map((el) => ({
          id: el.id,
          label: el.label ?? el.id,
          seats: el.seats ?? 0,
          zoneId: zone.id,
          zoneName: zone.name,
        })),
    ),
    [venue],
  );

  const {
    profile,
    profileReady,
    draft,
    editorOpen,
    setEditorOpen,
    updateDraft,
    saveProfile,
    saveError,
    syncing,
    presenceStatus,
    presenceVisible,
    presenceAvailable,
    setProfileTable,
  } = useVenuePresence({ venue: presenceVenue, defaultTableId: requestedTable });

  /* Load venue */
  useEffect(() => {
    async function load() {
      const { data: venueRow } = await publicSupabase
        .from("venues")
        .select("id, slug, name, branch_name")
        .eq("slug", slug)
        .single();

      if (!venueRow) { setLoading(false); return; }

      const { data: zoneRows } = await publicSupabase
        .from("zones")
        .select("id, name, floor_width, floor_height, floor_outline")
        .eq("venue_id", venueRow.id)
        .order("sort_order");

      const zones: ZoneData[] = [];
      for (const zr of zoneRows ?? []) {
        const [{ data: tables }, { data: structural }] = await Promise.all([
          publicSupabase.from("tables")
            .select("identifier, seat_count, shape, pos_x, pos_y, rotation")
            .eq("zone_id", zr.id),
          publicSupabase.from("structural_elements")
            .select("element_type, label, pos_x, pos_y, rotation, size_w, size_h")
            .eq("zone_id", zr.id),
        ]);

        zones.push({
          id: zr.id,
          name: zr.name ?? "Main Floor",
          floorWidth: zr.floor_width ?? 800,
          floorHeight: zr.floor_height ?? 600,
          outline: (zr.floor_outline as FloorPoint[]) ?? defaultOutline,
          elements: [
            ...(tables ?? []).map((t, i) => ({
              id: buildPresenceTableId({ zoneId: zr.id, identifier: t.identifier, x: t.pos_x, y: t.pos_y }),
              renderKey: `table:${zr.id}:${t.identifier}:${t.pos_x ?? "na"}:${t.pos_y ?? "na"}:${i}`,
              kind: "table" as const,
              type: t.shape,
              x: t.pos_x, y: t.pos_y, rotation: t.rotation,
              seats: t.seat_count, label: t.identifier,
            })),
            ...(structural ?? []).map((s, i) => ({
              renderKey: `structural:${zr.id}:${s.element_type}:${s.pos_x ?? "na"}:${s.pos_y ?? "na"}:${i}`,
              id: s.element_type === "bar"
                ? `BAR-${String(i + 1).padStart(2, "0")}`
                : s.element_type === "entrance"
                  ? `ENT-${String(i + 1).padStart(2, "0")}`
                  : `W-${String(i + 1).padStart(2, "0")}`,
              kind: "structural" as const,
              type: s.element_type,
              x: s.pos_x, y: s.pos_y, rotation: s.rotation,
              label: s.label || undefined,
              w: s.size_w ?? undefined, h: s.size_h ?? undefined,
            })),
          ],
        });
      }

      setVenue({ id: venueRow.id, slug: venueRow.slug, name: venueRow.name, branchName: venueRow.branch_name ?? "Main Floor", zones });
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [slug]);

  /* Sync requested table */
  useEffect(() => {
    if (!venue || !requestedTable) return;
    const match = venue.zones
      .flatMap((z) => z.elements.filter((e) => e.kind === "table").map((e) => ({ z, e })))
      .find(({ e }) => e.id === requestedTable || e.label === requestedTable);
    const zoneIdx = match ? venue.zones.findIndex((z) => z.id === match.z.id) : -1;
    if (zoneIdx >= 0) {
      startTransition(() => {
        setActiveZoneIndex(zoneIdx);
        setSelectedTable(match?.e.id ?? requestedTable);
      });
    }
  }, [requestedTable, venue]);

  const activeZone = venue?.zones[activeZoneIndex] ?? null;
  const selectedTableMeta = useMemo(() => findTableSummary(presenceTables, selectedTable), [selectedTable, presenceTables]);
  const profileTableMeta = useMemo(() => findTableSummary(presenceTables, profile?.tableId ?? null), [profile?.tableId, presenceTables]);

  /* Status dot */
  const statusColor = !presenceAvailable
    ? "bg-rose-500"
    : presenceVisible && presenceStatus === "active"
      ? "bg-emerald-500"
      : presenceVisible
        ? "bg-amber-400"
        : "bg-slate-400";

  const statusLabel = !presenceAvailable ? "Offline" : presenceVisible
    ? presenceStatus === "active" ? "Active" : "Idle"
    : "Not visible";

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }
  if (!venue) notFound();

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">

      {/* ── LEFT: Floor Plan ─────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 lg:overflow-hidden">

        {/* Zone tabs */}
        {venue.zones.length > 1 && (
          <div className="flex items-center gap-2 px-4 pt-4 pb-1 shrink-0">
            <Layers size={13} className="text-on-surface-variant shrink-0" />
            <div className="flex gap-1.5 overflow-x-auto">
              {venue.zones.map((zone, i) => (
                <button
                  key={zone.id}
                  onClick={() => { setActiveZoneIndex(i); setSelectedTable(null); }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    i === activeZoneIndex
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  {zone.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Canvas header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <div>
            <h2 className="text-base font-bold text-on-surface">Floor Plan</h2>
            <p className="text-xs text-on-surface-variant">
              {selectedTable ? `Table ${selectedTableMeta?.label ?? selectedTable} selected` : "Tap a table to select it"}
            </p>
          </div>
          {selectedTable && (
            <button
              onClick={() => setSelectedTable(null)}
              className="text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Clear selection
            </button>
          )}
        </div>

        {/* Canvas — fills remaining height on desktop */}
        {activeZone && (
          <div className="flex-1 min-h-[300px] lg:min-h-0 px-4 pb-4">
            <ReadOnlyCanvas
              key={activeZone.id}
              outline={activeZone.outline}
              elements={activeZone.elements}
              floorWidth={activeZone.floorWidth}
              floorHeight={activeZone.floorHeight}
              selectedTable={selectedTable}
              selectedTableLabel={selectedTableMeta?.label ?? null}
              onSelectTable={setSelectedTable}
            />
          </div>
        )}
      </div>

      {/* ── RIGHT: Info Panel ────────────────────────────── */}
      <aside className="lg:w-72 lg:border-l lg:border-outline-variant/20 lg:overflow-y-auto shrink-0 px-4 pb-6 pt-0 lg:pt-5 space-y-3">

        {/* Presence status card */}
        <div className="rounded-2xl bg-surface-container-low p-4 ring-1 ring-outline-variant/10">
          <div className="flex items-center gap-2.5 mb-3">
            <span className={`h-2.5 w-2.5 rounded-full ${statusColor} shrink-0`} />
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">{statusLabel}</span>
          </div>

          {presenceVisible && profile ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-extrabold text-primary">{profile.initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">{profile.occupation}</p>
                  <p className="text-xs text-on-surface-variant truncate">{profile.interests}</p>
                </div>
              </div>
              {profileTableMeta && (
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant bg-surface rounded-xl px-3 py-2">
                  <MapPin size={12} className="text-primary shrink-0" />
                  Sitting at table {profileTableMeta.label}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {profileReady && profile
                ? "Syncing your profile into the live roster…"
                : "Create a profile to appear in the live roster. Only initials, occupation and interests are shown."}
            </p>
          )}

          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={() => setEditorOpen(true)}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-on-primary hover:bg-primary/90 transition-all"
            >
              {presenceVisible ? "Edit Profile" : profileReady ? "Retry Visibility" : "Go Visible"}
              <ArrowRight size={13} />
            </button>

            {selectedTable && profileReady && profile?.tableId !== selectedTable && (
              <button
                onClick={() => { void setProfileTable(selectedTable); }}
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-surface-container-high px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container-highest transition-all"
              >
                Sit at table {selectedTableMeta?.label ?? selectedTable}
              </button>
            )}
          </div>
        </div>

        {/* Selected table info */}
        {selectedTable && selectedTableMeta && (
          <div className="rounded-2xl bg-surface-container-low p-4 ring-1 ring-outline-variant/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">Selected Table</p>
            <p className="text-2xl font-extrabold text-on-surface leading-none mb-1">
              {selectedTableMeta.label}
            </p>
            {selectedTableMeta.seats > 0 && (
              <p className="text-xs text-on-surface-variant">{selectedTableMeta.seats} seats · {selectedTableMeta.zoneName}</p>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href={`/v/${slug}/menu`}
            className="flex flex-col items-start gap-3 rounded-2xl bg-surface-container-low p-4 ring-1 ring-outline-variant/10 hover:bg-surface-container transition-colors"
          >
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <UtensilsCrossed size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface">View Menu</p>
              <p className="text-[10px] text-on-surface-variant mt-0.5">Order food &amp; drinks</p>
            </div>
          </Link>

          <Link
            href={`/v/${slug}/people`}
            className="flex flex-col items-start gap-3 rounded-2xl bg-surface-container-low p-4 ring-1 ring-outline-variant/10 hover:bg-surface-container transition-colors"
          >
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface">See People</p>
              <p className="text-[10px] text-on-surface-variant mt-0.5">Who's here now</p>
            </div>
          </Link>
        </div>

        {/* Legend */}
        <div className="rounded-2xl bg-surface-container-low p-4 ring-1 ring-outline-variant/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">Map Legend</p>
          <div className="space-y-2">
            {[
              { color: "bg-surface border-2 border-outline-variant", label: "Available table" },
              { color: "bg-primary/20 border-2 border-primary", label: "Selected table" },
              { color: "bg-surface-container-high border border-outline-variant/30", label: "Bar / counter" },
              { color: "border-2 border-dashed border-primary/30 bg-primary/5", label: "Entrance" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className={`h-4 w-4 rounded ${color} shrink-0`} />
                <span className="text-xs text-on-surface-variant">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Presence Profile Modal */}
      <PresenceProfileModal
        open={editorOpen}
        venueName={venue.name}
        draft={draft}
        tables={presenceTables}
        saving={syncing}
        error={saveError}
        onClose={() => setEditorOpen(false)}
        onChange={updateDraft}
        onSave={() => { void saveProfile(); }}
      />
    </div>
  );
}

/* ─── ReadOnlyCanvas ─────────────────────────────────── */

function ReadOnlyCanvas({
  outline, elements, floorWidth, floorHeight,
  selectedTable, selectedTableLabel, onSelectTable,
}: {
  outline: FloorPoint[];
  elements: PlacedElement[];
  floorWidth: number;
  floorHeight: number;
  selectedTable: string | null;
  selectedTableLabel: string | null;
  onSelectTable: (id: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  const fitToView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const padding = 48;
    const fit = Math.min(
      (clientWidth - padding) / floorWidth,
      (clientHeight - padding) / floorHeight,
      1.2,
    );
    const z = Math.max(MIN_ZOOM, fit);
    setZoom(z);
    setPan({ x: (clientWidth - floorWidth * z) / 2, y: (clientHeight - floorHeight * z) / 2 });
  }, [floorWidth, floorHeight]);

  useEffect(() => { fitToView(); }, [fitToView]);

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
        setPan((p) => ({ x: mx - (mx - p.x) * (newZ / oldZ), y: my - (my - p.y) * (newZ / oldZ) }));
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
    <div
      ref={containerRef}
      className="w-full h-full rounded-2xl bg-surface-container-low relative overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
    >
      {/* Grid backdrop */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#865300 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: `${pan.x % 24}px ${pan.y % 24}px`,
        }}
      />

      {/* Floor content */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: floorWidth,
          height: floorHeight,
          position: "absolute",
          top: 0, left: 0,
        }}
      >
        <div className="relative select-none" style={{ width: floorWidth, height: floorHeight }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible" className="absolute inset-0 w-full h-full">
            <defs>
              <filter id="floor-shadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="0" dy="0.5" stdDeviation="1.5" floodColor="#514437" floodOpacity="0.15" />
              </filter>
              <pattern id="floor-dots" width="5" height="5" patternUnits="userSpaceOnUse">
                <circle cx="2.5" cy="2.5" r="0.3" fill="#865300" opacity="0.12" />
              </pattern>
              <clipPath id="floor-clip">
                <path d={outlineToPath(outline)} />
              </clipPath>
            </defs>
            <path d={outlineToPath(outline)} fill="#f7f3ed" stroke="#514437" strokeWidth="0.5" strokeOpacity="0.3" filter="url(#floor-shadow)" />
            <rect width="100" height="100" fill="url(#floor-dots)" clipPath="url(#floor-clip)" />
          </svg>
          {elements.map((el) => (
            <FloorElement
              key={el.renderKey}
              element={el}
              selected={selectedTable === el.id}
              onTap={() => onSelectTable(selectedTable === el.id ? null : el.id)}
            />
          ))}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 bg-surface/90 backdrop-blur-sm p-1 rounded-xl shadow-sm flex items-center gap-1 z-10 border border-outline-variant/10">
        {[
          {
            icon: Minus, label: "Zoom out",
            onClick: () => {
              if (!containerRef.current) return;
              const newZ = Math.max(MIN_ZOOM, zoom * 0.85);
              const { clientWidth: cw, clientHeight: ch } = containerRef.current;
              setPan((p) => ({ x: cw / 2 - (cw / 2 - p.x) * (newZ / zoom), y: ch / 2 - (ch / 2 - p.y) * (newZ / zoom) }));
              setZoom(newZ);
            },
          },
        ].map(({ icon: Icon, label, onClick }) => (
          <button key={label} onClick={onClick} aria-label={label} className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors">
            <Icon size={13} />
          </button>
        ))}
        <span className="text-[10px] font-bold text-on-surface px-1 min-w-[2.5rem] text-center">{zoomPct}%</span>
        <button
          onClick={() => {
            if (!containerRef.current) return;
            const newZ = Math.min(MAX_ZOOM, zoom * 1.15);
            const { clientWidth: cw, clientHeight: ch } = containerRef.current;
            setPan((p) => ({ x: cw / 2 - (cw / 2 - p.x) * (newZ / zoom), y: ch / 2 - (ch / 2 - p.y) * (newZ / zoom) }));
            setZoom(newZ);
          }}
          aria-label="Zoom in"
          className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
        >
          <Plus size={13} />
        </button>
        <div className="w-px h-4 bg-outline-variant/30 mx-0.5" />
        <button onClick={fitToView} aria-label="Fit to view" className="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors">
          <Maximize size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─── FloorElement ───────────────────────────────────── */

function FloorElement({ element, selected, onTap }: {
  element: PlacedElement;
  selected: boolean;
  onTap: () => void;
}) {
  const style: CSSProperties = {
    left: `${element.x}%`,
    top: `${element.y}%`,
    transform: `translate(-50%, -50%) rotate(${element.rotation}deg)`,
    position: "absolute",
  };
  const ring = selected ? "ring-4 ring-primary/30 border-primary animate-pulse" : "";

  switch (element.type) {
    case "round":
      return (
        <div className={`absolute w-16 h-16 rounded-full border-2 border-outline-variant flex items-center justify-center cursor-pointer hover:border-primary/60 transition-colors ${ring}`} style={style} onClick={onTap}>
          <div className="w-8 h-8 rounded-full bg-surface-container-highest" />
          {selected && <TableLabel label={element.label ?? element.id} seats={element.seats} />}
        </div>
      );
    case "square":
      return (
        <div className={`absolute w-16 h-16 rounded-lg border-2 border-outline-variant flex items-center justify-center cursor-pointer hover:border-primary/60 transition-colors ${ring}`} style={style} onClick={onTap}>
          <div className="w-8 h-6 rounded bg-surface-container-highest" />
          {selected && <TableLabel label={element.label ?? element.id} seats={element.seats} />}
        </div>
      );
    case "long":
      return (
        <div className={`absolute w-24 h-16 border-2 border-outline-variant rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/60 transition-colors ${ring}`} style={style} onClick={onTap}>
          <div className="w-16 h-8 bg-surface-container-highest rounded-sm" />
          {selected && <TableLabel label={element.label ?? element.id} seats={element.seats} />}
        </div>
      );
    case "booth":
      return (
        <div className={`absolute w-14 h-14 border-2 border-outline-variant rounded-[10px] rounded-tl-[24px] flex items-center justify-center cursor-pointer hover:border-primary/60 transition-colors ${ring}`} style={style} onClick={onTap}>
          <div className="w-8 h-8 rounded-[6px] rounded-tl-[16px] bg-surface-container-highest" />
          {selected && <TableLabel label={element.label ?? element.id} seats={element.seats} />}
        </div>
      );
    case "bar": {
      const bW = element.w ?? 256, bH = element.h ?? 96;
      return (
        <div className={`absolute bg-surface-container-high rounded-xl flex items-center justify-center border shadow-sm border-outline-variant/30 ${ring}`} style={{ ...style, width: bW, height: bH }}>
          <span className="text-sm font-semibold text-on-surface-variant">{element.label || "Bar"}</span>
        </div>
      );
    }
    case "entrance":
      return (
        <div className="absolute w-24 h-8 flex items-center justify-center border-2 border-dashed border-primary/30 bg-primary/5 rounded-md" style={style}>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{element.label || "Entrance"}</span>
        </div>
      );
    case "wall":
      return <div className="absolute h-2 bg-on-surface-variant/40 rounded-full" style={{ ...style, width: element.w ?? 96 }} />;
    default:
      return null;
  }
}

function TableLabel({ label, seats }: { label: string; seats?: number }) {
  return (
    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-on-surface text-surface px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap z-10 shadow-sm">
      {label}{seats ? ` · ${seats}` : ""}
    </div>
  );
}
