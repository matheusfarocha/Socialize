"use client";

import { useEffect, useState } from "react";
import { Clock, Table2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface TableStat {
  table: string;
  avgMinutes: number;
  sessions: number;
  orders: number;
  revenue: number;
}

interface SessionRow {
  table_identifier: string | null;
  duration_seconds: number | null;
}

interface OrderRow {
  table_identifier: string | null;
  total: number | string | null;
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "--";
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function PerTableActivity() {
  const [rows, setRows] = useState<TableStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      const { data: venueRow } = await supabase
        .from("venues")
        .select("id")
        .eq("owner_id", user.id)
        .single();
      if (!venueRow || cancelled) {
        setLoading(false);
        return;
      }

      const [sessionsRes, ordersRes] = await Promise.all([
        supabase
          .from("customer_sessions")
          .select("table_identifier, duration_seconds")
          .eq("venue_id", venueRow.id),
        supabase
          .from("orders")
          .select("table_identifier, total")
          .eq("venue_id", venueRow.id),
      ]);

      if (cancelled) return;

      const byTable = new Map<string, TableStat>();
      const sessions: SessionRow[] = (sessionsRes.data ?? []) as SessionRow[];
      for (const s of sessions) {
        if (!s.table_identifier) continue;
        const prev = byTable.get(s.table_identifier) ?? {
          table: s.table_identifier,
          avgMinutes: 0,
          sessions: 0,
          orders: 0,
          revenue: 0,
        };
        const secs = s.duration_seconds ?? 0;
        const prevTotalMinutes = prev.avgMinutes * prev.sessions;
        prev.sessions += 1;
        prev.avgMinutes = (prevTotalMinutes + secs / 60) / prev.sessions;
        byTable.set(s.table_identifier, prev);
      }

      const orders: OrderRow[] = (ordersRes.data ?? []) as OrderRow[];
      for (const o of orders) {
        if (!o.table_identifier) continue;
        const prev = byTable.get(o.table_identifier) ?? {
          table: o.table_identifier,
          avgMinutes: 0,
          sessions: 0,
          orders: 0,
          revenue: 0,
        };
        prev.orders += 1;
        prev.revenue += Number(o.total ?? 0);
        byTable.set(o.table_identifier, prev);
      }

      const out = Array.from(byTable.values()).sort((a, b) => b.sessions - a.sessions);
      setRows(out);
      setLoading(false);
    }

    load().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <article className="bg-surface-container-low rounded-[2rem] p-6 md:p-10">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-tertiary-container/50 text-on-tertiary-container rounded-full text-sm font-semibold tracking-wide">
        <Table2 size={14} />
        Per-Table Activity
      </div>
      <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight mt-4">
        How your floor is performing table-by-table.
      </h2>
      <p className="text-lg text-on-surface-variant leading-relaxed mt-2">
        Time customers spend at each table and the orders they place while they&apos;re there.
      </p>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-on-surface-variant">Loading activity...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            No table activity yet. Table data appears after customers scan the QR and select a table.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-on-surface-variant border-b border-outline-variant/20">
                  <th className="py-2 pr-4 font-semibold">Table</th>
                  <th className="py-2 pr-4 font-semibold">
                    <span className="inline-flex items-center gap-1"><Clock size={12} /> Avg time</span>
                  </th>
                  <th className="py-2 pr-4 font-semibold">Sessions</th>
                  <th className="py-2 pr-4 font-semibold">Orders</th>
                  <th className="py-2 pr-4 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.table} className="border-b border-outline-variant/10 last:border-0">
                    <td className="py-3 pr-4 font-bold text-on-surface">{r.table}</td>
                    <td className="py-3 pr-4 text-on-surface">{formatMinutes(r.avgMinutes)}</td>
                    <td className="py-3 pr-4 text-on-surface">{r.sessions}</td>
                    <td className="py-3 pr-4 text-on-surface">{r.orders}</td>
                    <td className="py-3 pr-4 text-on-surface">${r.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </article>
  );
}
