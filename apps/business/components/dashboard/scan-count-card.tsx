"use client";

import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MetricCard } from "@/components/ui/metric-card";

type Window = "Today" | "Week" | "Month" | "All Time";

interface Props {
  venueSlug?: string;
  activeWindow?: Window;
}

function windowStart(w: Window): Date | null {
  const now = new Date();
  if (w === "Today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (w === "Week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (w === "Month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }
  return null;
}

export function ScanCountCard({ venueSlug, activeWindow = "Today" }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [uniqueTables, setUniqueTables] = useState<number>(0);

  useEffect(() => {
    if (!venueSlug) return;
    let cancelled = false;

    async function load() {
      const { data: venueRow } = await supabase
        .from("venues")
        .select("id")
        .eq("slug", venueSlug)
        .single();
      if (!venueRow || cancelled) return;

      const start = windowStart(activeWindow);
      let query = supabase
        .from("qr_scans")
        .select("table_identifier", { count: "exact" })
        .eq("venue_id", venueRow.id);
      if (start) query = query.gte("scanned_at", start.toISOString());

      const { data, count: totalCount } = await query;
      if (cancelled) return;

      setCount(totalCount ?? 0);
      const tables = new Set(
        (data ?? [])
          .map((r: { table_identifier: string | null }) => r.table_identifier)
          .filter((t): t is string => !!t)
      );
      setUniqueTables(tables.size);
    }

    load().catch(() => {
      if (!cancelled) setCount(0);
    });
    return () => {
      cancelled = true;
    };
  }, [venueSlug, activeWindow]);

  return (
    <MetricCard
      label="QR Scans"
      value={count ?? "--"}
      icon={QrCode}
      footer={
        <div className="mt-3 pt-3 border-t border-outline-variant/20 text-sm text-on-surface-variant">
          {uniqueTables > 0
            ? `${uniqueTables} distinct table${uniqueTables === 1 ? "" : "s"}`
            : "Networking interest"}
        </div>
      }
    />
  );
}
