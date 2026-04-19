"use client";

import { MapPinned } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Reusable3DMap, type MapLocation } from "@/components/maps/reusable-3d-map";

type DemoCafe = MapLocation & {
  borough: "Manhattan" | "Brooklyn";
  neighborhood: string;
  destinationHref: string;
};

const demoCafes: DemoCafe[] = [
  {
    id: "nomad-forum-cafe",
    title: "Nomad Forum Cafe",
    latitude: 40.7443,
    longitude: -73.9881,
    category: "Manhattan",
    borough: "Manhattan",
    neighborhood: "NoMad",
    destinationHref: "/",
    isHighlighted: true,
  },
  {
    id: "soho-common-house",
    title: "SoHo Common House",
    latitude: 40.7234,
    longitude: -74.002,
    category: "Manhattan",
    borough: "Manhattan",
    neighborhood: "SoHo",
    destinationHref: "/",
  },
  {
    id: "west-village-roast",
    title: "West Village Roast",
    latitude: 40.7345,
    longitude: -74.0027,
    category: "Manhattan",
    borough: "Manhattan",
    neighborhood: "West Village",
    destinationHref: "/",
  },
  {
    id: "williamsburg-junction",
    title: "Williamsburg Junction",
    latitude: 40.7182,
    longitude: -73.9588,
    category: "Brooklyn",
    borough: "Brooklyn",
    neighborhood: "Williamsburg",
    destinationHref: "/",
  },
  {
    id: "dumbo-signal-house",
    title: "DUMBO Signal House",
    latitude: 40.7034,
    longitude: -73.9891,
    category: "Brooklyn",
    borough: "Brooklyn",
    neighborhood: "DUMBO",
    destinationHref: "/",
  },
  {
    id: "greenpoint-ledger",
    title: "Greenpoint Ledger",
    latitude: 40.7296,
    longitude: -73.9545,
    category: "Brooklyn",
    borough: "Brooklyn",
    neighborhood: "Greenpoint",
    destinationHref: "/",
  },
];

export default function MapDemoPage() {
  const router = useRouter();
  const [selectedCafeId, setSelectedCafeId] = useState<string | null>(demoCafes[0]?.id ?? null);

  const selectedCafe = demoCafes.find((cafe) => cafe.id === selectedCafeId) ?? demoCafes[0] ?? null;

  return (
    <main className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,#fff5e2_0%,#f6ede0_45%,#ede1d1_100%)] p-3 md:p-4">
      <div className="relative h-full overflow-hidden rounded-[2.6rem] border border-[rgba(134,83,0,0.18)] bg-white/30 p-2 shadow-[0_28px_100px_rgba(74,70,64,0.12)]">
        <Reusable3DMap
          locations={demoCafes}
          selectedLocationId={selectedCafeId}
          onSelectLocation={(location) => setSelectedCafeId(location?.id ?? null)}
          onLocationActivate={(location) => {
            const cafe = demoCafes.find((item) => item.id === location.id);
            router.push(cafe?.destinationHref ?? "/");
          }}
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
            {demoCafes.map((cafe) => {
              const active = selectedCafe?.id === cafe.id;

              return (
                <button
                  key={cafe.id}
                  type="button"
                  onMouseEnter={() => setSelectedCafeId(cafe.id)}
                  onFocus={() => setSelectedCafeId(cafe.id)}
                  onClick={() => router.push(cafe.destinationHref)}
                  className={`group flex items-center justify-between rounded-[1.35rem] border px-3.5 py-3 text-left transition-all duration-200 ${
                    active
                      ? "border-primary/25 bg-white/45 shadow-[0_12px_28px_rgba(134,83,0,0.12)]"
                      : "border-white/25 bg-white/12 hover:border-white/45 hover:bg-white/22"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">{cafe.title}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                      {cafe.neighborhood} · {cafe.borough}
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
        </section>
      </div>
    </main>
  );
}
