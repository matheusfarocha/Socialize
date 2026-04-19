"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles, TrendingUp, TriangleAlert } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { supabase } from "@/lib/supabase";

interface InsightCard {
  tag: string;
  title: string;
  description: string;
  cta: string;
  severity: "info" | "warning" | "opportunity";
}

interface InsightsResponse {
  cards: InsightCard[];
  model: string;
  windowFallback: boolean;
  fallbackReason: string | null;
  signalCount: number;
  cached: boolean;
}

function severityIcon(severity: InsightCard["severity"]) {
  if (severity === "warning") return TriangleAlert;
  if (severity === "opportunity") return TrendingUp;
  return Sparkles;
}

function severityStyles(severity: InsightCard["severity"]) {
  if (severity === "warning") {
    return "bg-error-container/40 text-on-error-container";
  }
  if (severity === "opportunity") {
    return "bg-primary-container/50 text-on-primary-container";
  }
  return "bg-secondary-container/50 text-on-secondary-container";
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(force = false) {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Sign in to see insights.");
      }
      const res = await fetch(`/api/insights${force ? "?refresh=1" : ""}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status}).`);
      }
      const json = (await res.json()) as InsightsResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load insights.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  return (
    <>
      <TopBar />
      <div className="flex-1 pt-24 pb-12 px-4 md:px-12 max-w-5xl mx-auto w-full overflow-y-auto">
        <div className="mb-10 max-w-3xl flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-primary-container/60 text-on-primary-container text-xs font-semibold tracking-wider uppercase">
            <Sparkles size={12} /> AI Insights
          </div>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight leading-tight">
            Here&apos;s what the data is trying to tell you.
          </h1>
          <p className="text-lg text-on-surface-variant leading-relaxed">
            Generated fresh from your live orders, QR scans, and seating data.
            {data?.windowFallback && " Showing all-time signals — seed more recent data for week-over-week comparisons."}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing || loading}
              className="px-4 py-2 rounded-full bg-surface-container-highest text-on-surface text-sm font-medium hover:opacity-80 transition-opacity inline-flex items-center gap-2 disabled:opacity-60"
            >
              {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Regenerate
            </button>
            {data && !data.cached && (
              <span className="text-xs text-on-surface-variant">Just generated · {data.signalCount} signals · {data.model}</span>
            )}
            {data?.cached && (
              <span className="text-xs text-on-surface-variant">Cached · regenerating costs a Gemini call</span>
            )}
            {data?.fallbackReason && (
              <span className="text-xs text-error">Gemini unavailable — showing templated cards ({data.fallbackReason})</span>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-on-surface-variant py-16">
            <Loader2 size={20} className="animate-spin" />
            <span>Analyzing your venue...</span>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 rounded-2xl border border-error/30 bg-error-container/30 text-on-error-container">
            {error}
          </div>
        )}

        {!loading && !error && data && data.cards.length === 0 && (
          <div className="p-6 rounded-2xl border border-outline-variant/30 bg-surface-container-low text-on-surface-variant">
            No strong signals yet. Seed a bit more activity (scans, orders) and regenerate.
          </div>
        )}

        {!loading && !error && data && data.cards.length > 0 && (
          <div className="space-y-6">
            {data.cards.map((card, idx) => {
              const Icon = severityIcon(card.severity);
              return (
                <article
                  key={`${card.tag}-${idx}`}
                  className="bg-surface-container-low rounded-[2rem] p-6 md:p-10 space-y-4"
                >
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${severityStyles(card.severity)}`}
                  >
                    <Icon size={14} />
                    {card.tag}
                  </div>
                  <h2 className="font-headline text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
                    {card.title}
                  </h2>
                  <p className="text-base md:text-lg text-on-surface-variant leading-relaxed">
                    {card.description}
                  </p>
                  <button className="mt-2 bg-surface-container-highest text-on-surface px-5 py-2.5 rounded-full text-sm font-medium hover:bg-primary-fixed transition-colors">
                    {card.cta}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
