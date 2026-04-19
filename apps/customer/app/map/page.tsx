"use client";

import Link from "next/link";
import { ArrowUpRight, Compass, MapPinned } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Reusable3DMap } from "@/components/maps/reusable-3d-map";
import { buildCafeDirectionsHref, networkingCafes } from "@/lib/cafe-map";

export default function MapPage() {
  const router = useRouter();
  const [selectedCafeId, setSelectedCafeId] = useState<string | null>(null);

  const selectedCafe = useMemo(
    () => networkingCafes.find((cafe) => cafe.id === selectedCafeId) ?? null,
    [selectedCafeId],
  );

  return (
    <main className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,#fff5e2_0%,#f6ede0_45%,#ede1d1_100%)] p-3 md:p-4">
      <div className="relative h-full overflow-hidden rounded-[2.6rem] border border-[rgba(134,83,0,0.18)] bg-white/30 p-2 shadow-[0_28px_100px_rgba(74,70,64,0.12)]">
        <Reusable3DMap
          locations={networkingCafes}
          selectedLocationId={selectedCafeId}
          onSelectLocation={(location) => setSelectedCafeId(location?.id ?? null)}
          initialViewState={{
            longitude: -73.9778,
            latitude: 40.7278,
            zoom: 10.7,
            pitch: 50,
            bearing: 16,
          }}
          showPopup={false}
          showResetControl={false}
          showNavigationControl={false}
          showMarkerLabels
          className="h-full"
        />

        <section className="absolute left-4 top-4 z-10 w-[min(24rem,calc(100%-2rem))] overflow-hidden rounded-[2rem] border border-white/35 bg-white/18 p-4 shadow-[0_22px_60px_rgba(44,23,0,0.16)] backdrop-blur-xl md:left-6 md:top-6 md:p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <MapPinned size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary/80">
                Networking
              </p>
              <h1 className="text-lg font-extrabold text-on-surface md:text-xl">
                Find cafes for networking
              </h1>
            </div>
          </div>

          <div className="mt-4 grid gap-2.5">
            {networkingCafes.map((cafe) => {
              const active = selectedCafe?.id === cafe.id;

              return (
                <button
                  key={cafe.id}
                  type="button"
                  onClick={() => setSelectedCafeId(cafe.id)}
                  className={`group flex items-center justify-between rounded-[1.35rem] border px-3.5 py-3 text-left transition-all duration-200 ${
                    active
                      ? "border-primary/25 bg-white/45 shadow-[0_12px_28px_rgba(134,83,0,0.12)]"
                      : "border-white/25 bg-white/12 hover:border-white/45 hover:bg-white/22"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">{cafe.title}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                      {cafe.neighborhood} / {cafe.borough}
                    </p>
                  </div>
                  <span
                    className={`ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-transform duration-200 ${
                      active
                        ? "border-primary/20 bg-primary text-on-primary"
                        : "border-primary/15 bg-primary/10 text-primary group-hover:scale-105"
                    }`}
                  >
                    {cafe.title
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedCafe ? (
            <div className="mt-4 rounded-[1.5rem] border border-white/40 bg-white/36 p-3.5 shadow-[0_14px_34px_rgba(44,23,0,0.12)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/75">
                    Selected Cafe
                  </p>
                  <p className="mt-1 truncate text-base font-extrabold text-on-surface">
                    {selectedCafe.title}
                  </p>
                  <p className="mt-1 text-xs text-on-surface-variant">{selectedCafe.address}</p>
                </div>
                <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  {selectedCafe.borough}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <a
                  href={buildCafeDirectionsHref(selectedCafe)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-bold text-on-surface shadow-sm ring-1 ring-white/70 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <Compass size={14} />
                  Directions
                </a>

                <button
                  type="button"
                  onClick={() => router.push(selectedCafe.destinationHref)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-xs font-bold text-on-primary shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Open Socialize
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[1.5rem] border border-white/40 bg-white/28 p-3.5 text-sm text-on-surface-variant shadow-[0_14px_34px_rgba(44,23,0,0.08)]">
              Click a cafe marker or a cafe card to zoom in, get directions, or jump into the main Socialize flow.
            </div>
          )}

          <Link
            href="/"
            className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/75 transition-colors hover:text-primary"
          >
            Open main page
            <ArrowUpRight size={13} />
          </Link>
        </section>
      </div>
    </main>
  );
}
